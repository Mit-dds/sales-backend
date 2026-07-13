import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db.js';
import logger from '../utils/logger.js';

const GENERIC_FALLBACK = [
  'Prime location in the heart of the city',
  'World-class amenities and facilities',
  'High ROI potential with guaranteed rental returns',
  'Trusted developer with proven track record',
  'Sustainable living with green building certifications',
];

const suggestionCache = new Map();

let genAI = null;
const getGenAI = () => {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
};

function extractRetryDelay(message) {
  const m = message.match(/retry in (\d+(?:\.\d+)?)s/);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 5000;
}

function buildPrompt(project) {
  const typeLabels = (project.unitTypes || []).map((ut) => ut.label).join(', ');
  const subtypes = (project.unitTypes || [])
    .flatMap((ut) => (ut.subtypes || []).map((s) => s.label))
    .join(', ');

  const prices = (project.units || []).map((u) => u.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const areas = (project.units || []).map((u) => u.area).filter(Boolean);
  const minArea = areas.length ? Math.min(...areas) : null;
  const maxArea = areas.length ? Math.max(...areas) : null;

  const priceRange = minPrice !== null
    ? `${(minPrice / 1000000).toFixed(2)}M AED – ${(maxPrice / 1000000).toFixed(2)}M AED`
    : 'N/A';
  const areaRange = minArea !== null
    ? `${minArea} – ${maxArea} sqft`
    : 'N/A';

  const existingWhyBuy = (project.whyBuy || []).map((w) => `- ${w}`).join('\n');

  return {
    systemInstruction: 'You are a luxury real estate marketing copywriter for Reportage Properties in Dubai. Generate exactly 5 compelling, specific selling points for this property. Each point must be unique, factual-sounding, and directly reference the project data provided. Return ONLY a JSON object with a "suggestions" array of 5 strings.',
    projectData: JSON.stringify({
      name: project.name,
      location: project.location,
      type: project.type,
      status: project.status,
      completionDate: project.completionDate,
      unitTypes: typeLabels || 'N/A',
      subtypes: subtypes || 'N/A',
      priceRange,
      areaRange,
    }),
    existingWhyBuy: existingWhyBuy || 'None yet',
  };
}

async function fetchFromGemini(client, project) {
  const { systemInstruction, projectData, existingWhyBuy } = buildPrompt(project);

  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
    systemInstruction,
  });

  const prompt = `Generate 5 compelling reasons to buy this Dubai property based on these details:\n\n${projectData}\n\nExisting selling points (avoid repeating these):\n${existingWhyBuy}`;


  console.log('[AI] Sending prompt to Gemini:', prompt);

  const result = await model.generateContent(prompt);


  console.log('[AI] Gemini response:', result.response.text());
  const text = result.response.text();
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
    return parsed.suggestions.slice(0, 5);
  }

  throw new Error('Unexpected response format from Gemini');
}

export const generateWhyBuySuggestions = async (projectId) => {
  const cached = suggestionCache.get(projectId);
  if (cached) return cached;

  const client = getGenAI();
  if (!client) {
    logger.warn('[AI] GEMINI_API_KEY not configured — returning fallback suggestions');
    return GENERIC_FALLBACK;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        unitTypes: {
          include: { subtypes: true },
        },
        units: {
          where: { deletedAt: null },
          select: { price: true, area: true },
        },
      },
    });

    if (!project) {
      logger.warn(`[AI] Project ${projectId} not found — returning fallback`);
      return GENERIC_FALLBACK;
    }

    const suggestions = await fetchFromGemini(client, project);
    suggestionCache.set(projectId, suggestions);
    return suggestions;
  } catch (err) {
    const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      const delay = extractRetryDelay(err.message);
      logger.warn(`[AI] Quota exceeded — retrying once after ${delay}ms`);
      try {
        await new Promise((r) => setTimeout(r, delay));
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            unitTypes: { include: { subtypes: true } },
            units: { where: { deletedAt: null }, select: { price: true, area: true } },
          },
        });
        if (project) {
          const suggestions = await fetchFromGemini(client, project);
          suggestionCache.set(projectId, suggestions);
          return suggestions;
        }
      } catch (retryErr) {
        logger.error(`[AI] Retry also failed: ${retryErr.message}`);
      }
    } else {
      logger.error(`[AI] Gemini API error: ${err.message}`);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { whyBuy: true },
    });

    if (project?.whyBuy?.length > 0) {
      logger.warn('[AI] Using existing whyBuy items as fallback');
      return project.whyBuy.slice(0, 5);
    }

    return GENERIC_FALLBACK;
  }
};
