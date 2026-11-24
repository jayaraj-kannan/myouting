import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { GeminiAiProvider } from '../../providers/gemini-provider';
import { AssistantMessage, NormalizedMessage } from '../../types';

export const assistantRouter = Router();
const aiProvider = new GeminiAiProvider();

// POST /workspaces/:id/assistant/messages
assistantRouter.post('/workspaces/:id/assistant/messages', authenticate, async (req, res, next) => {
  try {
    const workspaceId = req.params.id as string;
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      throw new ApiError(400, 'BAD_REQUEST', 'Message content is required');
    }

    const currentSessionId = sessionId || `session_${workspaceId}`;
    const history = store.assistantSessions.get(currentSessionId) || [];

    // Gather context
    const imports = Array.from(store.imports.values()).filter(i => i.workspaceId === workspaceId);
    let allMessages: NormalizedMessage[] = [];
    for (const imp of imports) {
      const msgs = store.messages.get(imp.id) || [];
      allMessages = allMessages.concat(msgs);
    }

    const insights = store.insights.get(workspaceId);
    const plans = store.plans.get(workspaceId) || [];
    const activePlan = plans[plans.length - 1];

    // Store user message
    const userMsg: AssistantMessage = {
      id: `ast_msg_${Date.now()}_u`,
      sessionId: currentSessionId,
      workspaceId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    history.push(userMsg);

    // Call AI Provider
    const historyFormatted = history.map(h => ({ role: h.role, content: h.content }));
    const { answer, citations } = await aiProvider.chatWithAssistant(
      historyFormatted,
      message,
      {
        messages: allMessages,
        insights,
        plan: activePlan,
      }
    );

    // Store assistant response
    const assistantMsg: AssistantMessage = {
      id: `ast_msg_${Date.now()}_a`,
      sessionId: currentSessionId,
      workspaceId,
      role: 'assistant',
      content: answer,
      citations,
      createdAt: new Date().toISOString(),
    };
    history.push(assistantMsg);
    store.assistantSessions.set(currentSessionId, history);

    res.json({
      message: assistantMsg,
      sessionId: currentSessionId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /assistant/sessions/:id
assistantRouter.get('/assistant/sessions/:id', authenticate, (req, res) => {
  const sessionId = req.params.id as string;
  const history = store.assistantSessions.get(sessionId) || [];
  res.json({ sessionId, messages: history });
});
