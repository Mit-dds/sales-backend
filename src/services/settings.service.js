import prisma from '../config/db.js';
import logger from '../utils/logger.js';

const DEFAULT_SETTINGS = {
  id: 'settings_1',
  teamName: 'Reportage Properties',
  usdRate: 3.65,
  eurRate: 3.98,
  gbpRate: 4.62,
  inrRate: 0.044,
  rubRate: 0.041,
  audRate: 2.41,
  cadRate: 2.68,
  sarRate: 0.97,
  pkrRate: 0.013,
};

export const getSettings = async () => {
  let settings = await prisma.settings.findUnique({ where: { id: 'settings_1' } });
  if (!settings) {
    settings = await prisma.settings.create({ data: DEFAULT_SETTINGS });
    logger.info('Default settings created');
  }
  return settings;
};

export const updateSettings = async (data) => {
  const allowed = ['teamName', 'usdRate', 'eurRate', 'gbpRate', 'inrRate', 'rubRate', 'audRate', 'cadRate', 'sarRate', 'pkrRate'];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }
  const settings = await prisma.settings.upsert({
    where: { id: 'settings_1' },
    update: updateData,
    create: { id: 'settings_1', ...DEFAULT_SETTINGS, ...updateData },
  });
  logger.info('Settings updated');
  return settings;
};
