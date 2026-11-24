import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface FeatureFlags {
  chat_import_enabled: boolean;
  gemini_media_analysis_enabled: boolean;
  sarvam_stt_enabled: boolean;
  sarvam_tts_enabled: boolean;
  collaboration_enabled: boolean;
  voice_assistant_enabled: boolean;
  ai_plan_generation_v2: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  chat_import_enabled: true,
  gemini_media_analysis_enabled: true,
  sarvam_stt_enabled: true,
  sarvam_tts_enabled: true,
  collaboration_enabled: true,
  voice_assistant_enabled: true,
  ai_plan_generation_v2: false,
};

export class FlagsmithProvider {
  private flagsmithClient: any = null;
  private initialized: boolean = false;

  constructor() {
    if (config.flagsmith.serverKey) {
      try {
        const flagsmith = require('flagsmith-nodejs');
        this.flagsmithClient = flagsmith.init({
          environmentKey: config.flagsmith.serverKey,
          apiUrl: config.flagsmith.apiUrl,
        });
        this.initialized = true;
        logger.info('Flagsmith provider initialized with server key');
      } catch (err: any) {
        logger.warn({ err }, 'Failed to initialize Flagsmith SDK, using default feature flags');
      }
    } else {
      logger.info('FLAGSMITH_SERVER_KEY not set. Using sensible default feature flags.');
    }
  }

  async getFlags(identity?: string): Promise<FeatureFlags> {
    if (this.initialized && this.flagsmithClient) {
      try {
        const flags = identity
          ? await this.flagsmithClient.getIdentityFlags(identity)
          : await this.flagsmithClient.getEnvironmentFlags();

        return {
          chat_import_enabled: flags.isFeatureEnabled('chat_import_enabled') ?? DEFAULT_FLAGS.chat_import_enabled,
          gemini_media_analysis_enabled: flags.isFeatureEnabled('gemini_media_analysis_enabled') ?? DEFAULT_FLAGS.gemini_media_analysis_enabled,
          sarvam_stt_enabled: flags.isFeatureEnabled('sarvam_stt_enabled') ?? DEFAULT_FLAGS.sarvam_stt_enabled,
          sarvam_tts_enabled: flags.isFeatureEnabled('sarvam_tts_enabled') ?? DEFAULT_FLAGS.sarvam_tts_enabled,
          collaboration_enabled: flags.isFeatureEnabled('collaboration_enabled') ?? DEFAULT_FLAGS.collaboration_enabled,
          voice_assistant_enabled: flags.isFeatureEnabled('voice_assistant_enabled') ?? DEFAULT_FLAGS.voice_assistant_enabled,
          ai_plan_generation_v2: flags.isFeatureEnabled('ai_plan_generation_v2') ?? DEFAULT_FLAGS.ai_plan_generation_v2,
        };
      } catch (err: any) {
        logger.error({ err }, 'Error evaluating Flagsmith flags, falling back to defaults');
      }
    }
    return DEFAULT_FLAGS;
  }

  async isFeatureEnabled(featureName: keyof FeatureFlags, identity?: string): Promise<boolean> {
    const flags = await this.getFlags(identity);
    return flags[featureName] ?? false;
  }
}
