import * as settingsService from '../services/settings.service.js';
import * as ratesService from '../services/rates.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (_req, res) => {
  const [settings, latestRates] = await Promise.all([
    settingsService.getSettings(),
    ratesService.getLatestRates(),
  ]);
  const { usdRate, eurRate, gbpRate, inrRate, rubRate, audRate, cadRate, sarRate, pkrRate, ...rest } = settings;
  res.json({
    success: true,
    data: {
      ...rest,
      fxRates: latestRates ? {
        base: latestRates.base,
        timestamp: latestRates.timestamp,
        rates: latestRates.rates,
      } : null,
    },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  res.json({ success: true, data: settings });
});
