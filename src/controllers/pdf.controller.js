import * as pdfService from '../services/pdf.service.js';
import * as settingsService from '../services/settings.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

export const generateOfferPdf = asyncHandler(async (req, res) => {
  const { offerData, template, format } = req.body;

  if (!offerData || !template) {
    throw new ApiError(400, 'offerData and template are required');
  }

  const validTemplates = ['single-offer', 'comparison', 'all-plans'];
  if (!validTemplates.includes(template)) {
    throw new ApiError(400, `Invalid template. Must be one of: ${validTemplates.join(', ')}`);
  }

  const settings = await settingsService.getSettings();

  const html = await pdfService.renderTemplate(template, { ...offerData, settings });

  const pdfBuffer = await pdfService.generatePdf(html, { format });

  const filename = `offer-${offerData.unit?.number || 'document'}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

export const previewOfferPdf = asyncHandler(async (req, res) => {
  const { offerData, template, format } = req.body;

  if (!offerData || !template) {
    throw new ApiError(400, 'offerData and template are required');
  }

  const validTemplates = ['single-offer', 'comparison', 'all-plans'];
  if (!validTemplates.includes(template)) {
    throw new ApiError(400, `Invalid template. Must be one of: ${validTemplates.join(', ')}`);
  }

  const settings = await settingsService.getSettings();

  const html = await pdfService.renderTemplate(template, { ...offerData, settings });

  const pdfBuffer = await pdfService.generatePdf(html, { format });

  const base64 = pdfBuffer.toString('base64');

  res.json({ success: true, data: base64 });
});
