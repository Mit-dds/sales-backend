import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { startRatesCron } from './cron/rates.cron.js';

const start = async () => {
  try {
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      console.log(`Server running at http://localhost:${config.port}`);
      startRatesCron();
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
