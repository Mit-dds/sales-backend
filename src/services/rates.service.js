import prisma from '../config/db.js';
import logger from '../utils/logger.js';

const FX_API_URL = 'https://fxapi.app/api/aed.json';
const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchAndStoreRates() {
  try {
    const res = await fetchWithTimeout(FX_API_URL, TIMEOUT_MS);
    if (!res.ok) {
      logger.warn(`[Rates Service] FX API returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data || !data.rates) {
      logger.warn('[Rates Service] FX API returned unexpected payload');
      return null;
    }
    const record = await prisma.fxRate.create({
      data: {
        base: data.base || 'USD',
        rates: data.rates,
      },
    });
    logger.info(`[Rates Service] Stored FX rates (id=${record.id}, base=${record.base})`);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await prisma.fxRate.deleteMany({
      where: { createdAt: { lt: oneDayAgo } },
    });
    if (deleted.count > 0) {
      logger.info(`[Rates Service] Cleaned up ${deleted.count} old rate records`);
    }
    return record;
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn('[Rates Service] FX API request timed out');
    } else {
      logger.error('[Rates Service] Failed to fetch and store rates', err);
    }
    return null;
  }
}

export async function getLatestRates() {
  try {
    const record = await prisma.fxRate.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;
    return {
      base: record.base,
      timestamp: record.createdAt,
      rates: record.rates,
    };
  } catch (err) {
    logger.error('[Rates Service] Failed to get latest rates', err);
    return null;
  }
}
