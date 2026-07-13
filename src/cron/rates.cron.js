import cron from 'node-cron';
import * as ratesService from '../services/rates.service.js';
import logger from '../utils/logger.js';

let task = null;

export function startRatesCron() {
  if (task) return;
  task = cron.schedule('*/10 * * * *', async () => {
    logger.info('[Rates Cron] Fetching latest FX rates...');
    try {
      const record = await ratesService.fetchAndStoreRates();
      if (record) {
        logger.info(`[Rates Cron] Rates stored: ${record.createdAt}`);
      }
    } catch (err) {
      logger.error('[Rates Cron] Failed to fetch rates', err);
    }
  });
  ratesService.fetchAndStoreRates().catch(err =>
    logger.error('[Rates Cron] Initial fetch failed', err)
  );
  logger.info('[Rates Cron] Scheduled every 10 minutes');
}

export function stopRatesCron() {
  if (task) {
    task.stop();
    task = null;
    logger.info('[Rates Cron] Stopped');
  }
}
