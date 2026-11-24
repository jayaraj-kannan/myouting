import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { SarvamSpeechProvider } from '../../providers/speech-provider';
import { ApiError } from '../../utils/errors';

export const speechRouter = Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max
const speechProvider = new SarvamSpeechProvider();

// POST /speech/transcribe
speechRouter.post('/speech/transcribe', authenticate, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'NO_AUDIO', 'Audio file is required for transcription');
    }

    const languageCode = (req.body.languageCode as string) || 'en-IN';
    const result = await speechProvider.transcribe(req.file.buffer, req.file.mimetype, languageCode);

    res.json({
      transcript: result.transcript,
      languageCode: result.languageCode,
      confidence: result.confidence,
    });
  } catch (err) {
    next(err);
  }
});

// POST /speech/synthesize
speechRouter.post('/speech/synthesize', authenticate, async (req, res, next) => {
  try {
    const { text, languageCode } = req.body;
    if (!text || !text.trim()) {
      throw new ApiError(400, 'BAD_REQUEST', 'Text is required for synthesis');
    }

    const result = await speechProvider.synthesize(text, languageCode || 'en-IN');
    res.json({
      audioBase64: result.audioBase64,
      format: result.format,
    });
  } catch (err) {
    next(err);
  }
});
