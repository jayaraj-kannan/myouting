import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { GeminiAiProvider } from '../../providers/gemini-provider';

export const insightsRouter = Router();
const aiProvider = new GeminiAiProvider();

// GET /workspaces/:id/insights
insightsRouter.get('/workspaces/:id/insights', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const insights = store.insights.get(workspaceId);

  if (!insights) {
    return res.json({ insights: null });
  }

  res.json({ insights });
});

// PATCH /insights/:id (Update or confirm an insight fact)
insightsRouter.patch('/insights/:id', authenticate, (req, res) => {
  const { workspaceId, field, value, status } = req.body;
  if (!workspaceId) {
    throw new ApiError(400, 'BAD_REQUEST', 'workspaceId is required in request body');
  }

  const current = store.insights.get(workspaceId);
  if (!current) {
    throw new ApiError(404, 'INSIGHTS_NOT_FOUND', 'No insights found for this workspace');
  }

  // Update specific field
  if (field === 'destination' && current.destination) {
    if (value) current.destination.value = value;
    if (status) current.destination.status = status;
    current.destination.reviewedBy = req.user!.userId;
  } else if (field === 'budget' && current.budget) {
    if (value) current.budget.value.amount = Number(value);
    if (status) current.budget.status = status;
    current.budget.reviewedBy = req.user!.userId;
  } else if (field === 'date' && current.date) {
    if (value) current.date.value = { ...current.date.value, ...value };
    if (status) current.date.status = status;
    current.date.reviewedBy = req.user!.userId;
  }

  store.insights.set(workspaceId, current);
  res.json({ success: true, insights: current });
});

// POST /imports/:id/extract-insights
insightsRouter.post('/imports/:id/extract-insights', authenticate, async (req, res, next) => {
  try {
    const importId = req.params.id as string;
    const importRecord = store.imports.get(importId);
    if (!importRecord) {
      throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
    }

    const messages = store.messages.get(importId) || [];
    const insights = await aiProvider.extractInsights(messages);
    store.insights.set(importRecord.workspaceId, insights);

    res.json({ insights });
  } catch (err) {
    next(err);
  }
});
