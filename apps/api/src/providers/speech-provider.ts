import { config } from '../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

export interface SpeechProvider {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageCode?: string
  ): Promise<{ transcript: string; languageCode: string; confidence?: number }>;
  synthesize(
    text: string,
    languageCode?: string
  ): Promise<{ audioBase64: string; format: string }>;
}

export class SarvamSpeechProvider implements SpeechProvider {
  private apiKey: string;
  private sttModel: string;
  private ttsModel: string;

  constructor() {
    this.apiKey = config.sarvam.apiKey;
    this.sttModel = config.sarvam.sttModel;
    this.ttsModel = config.sarvam.ttsModel;

    if (!this.apiKey) {
      throw new ApiError(500, 'CONFIG_ERROR', 'SARVAM_API_KEY environment variable is required.');
    }
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageCode: string = 'en-IN'
  ): Promise<{ transcript: string; languageCode: string; confidence?: number }> {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', this.sttModel);
      formData.append('language_code', languageCode);

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Sarvam STT failed with status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      return {
        transcript: data.transcript || '',
        languageCode: data.language_code || languageCode,
        confidence: data.confidence,
      };
    } catch (err: any) {
      logger.error({ err }, 'Sarvam STT API call failed');
      throw new ApiError(500, 'SARVAM_STT_FAILED', `Speech transcription failed: ${err.message}`);
    }
  }

  async synthesize(
    text: string,
    languageCode: string = 'en-IN'
  ): Promise<{ audioBase64: string; format: string }> {
    try {
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey,
        },
        body: JSON.stringify({
          inputs: [text.substring(0, 500)],
          target_language_code: languageCode,
          speaker: 'meera',
          model: this.ttsModel,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Sarvam TTS failed with status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const audioBase64 = data.audios?.[0] || '';
      return {
        audioBase64,
        format: 'wav',
      };
    } catch (err: any) {
      logger.error({ err }, 'Sarvam TTS API call failed');
      throw new ApiError(500, 'SARVAM_TTS_FAILED', `Speech synthesis failed: ${err.message}`);
    }
  }
}
