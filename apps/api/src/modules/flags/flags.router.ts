import { Router } from 'express';
import { FlagsmithProvider } from '../../providers/flagsmith-provider';

export const flagsRouter = Router();
const flagsProvider = new FlagsmithProvider();

// GET /flags
flagsRouter.get('/flags', async (req, res) => {
  const identity = (req.query.identity as string) || undefined;
  const flags = await flagsProvider.getFlags(identity);
  res.json({ flags });
});
