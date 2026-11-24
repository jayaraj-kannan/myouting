import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`OutingMate API server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Using Firebase Mock: ${config.firebase.useMock}`);
  logger.info(`Gemini API configured: ${!!config.gemini.apiKey}`);
  logger.info(`Sarvam API configured: ${!!config.sarvam.apiKey}`);
});
