import { config } from '../config/env';
import { logger } from '../utils/logger';

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
      logger.warn('SARVAM_API_KEY is not configured. Speech provider will operate in intelligent simulated mode.');
    }
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageCode: string = 'en-IN'
  ): Promise<{ transcript: string; languageCode: string; confidence?: number }> {
    if (this.apiKey) {
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
        logger.error({ err }, 'Sarvam STT API error, falling back to simulated transcript');
      }
    }

    // Simulated speech transcription for dev/testing
    return {
      transcript: 'What is the final agreed budget for the Pondicherry trip?',
      languageCode: 'en-IN',
      confidence: 0.95,
    };
  }

  async synthesize(
    text: string,
    languageCode: string = 'en-IN'
  ): Promise<{ audioBase64: string; format: string }> {
    if (this.apiKey) {
      try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': this.apiKey,
          },
          body: JSON.stringify({
            inputs: [text.substring(0, 500)], // Limit length for TTS request
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
        logger.error({ err }, 'Sarvam TTS API error, falling back to simulated audio');
      }
    }

    // Return empty or dummy audio wav base64 for fallback
    return {
      audioBase64: '',
      format: 'wav',
    };
  }
}
