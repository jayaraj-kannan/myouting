import dotenv from 'dotenv';
import path from 'path';

// Load root .env first, then local .env to allow overrides
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    useMock:
      process.env.USE_MOCK_FIREBASE === 'true' ||
      !process.env.FIREBASE_PROJECT_ID ||
      !(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')),
  },

  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  // Sarvam Voice
  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || '',
    sttModel: process.env.SARVAM_STT_MODEL || 'saaras:v1',
    ttsModel: process.env.SARVAM_TTS_MODEL || 'bulbul:v1',
  },

  // Flagsmith
  flagsmith: {
    serverKey: process.env.FLAGSMITH_SERVER_KEY || '',
    apiUrl: process.env.FLAGSMITH_API_URL || 'https://edge.api.flagsmith.com/api/v1/',
  },

  // Storage
  storage: {
    bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'outingmate-uploads',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    maxUploadSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10),
    maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '300', 10),
  },
};
