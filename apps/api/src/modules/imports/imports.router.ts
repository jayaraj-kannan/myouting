import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireWorkspaceRole } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { parseWhatsAppChat } from '../chat-parser/whatsapp-parser';
import { extractChatFromZip } from '../chat-parser/zip-extractor';
import { ChatImportRecord, Workspace } from '../../types';
import { GeminiAiProvider } from '../../providers/gemini-provider';
import { SarvamSpeechProvider } from '../../providers/speech-provider';
import { logger } from '../../utils/logger';

export const importsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const aiProvider = new GeminiAiProvider();
let speechProvider: SarvamSpeechProvider | null = null;
try {
  speechProvider = new SarvamSpeechProvider();
} catch (err) {
  logger.info('SarvamSpeechProvider not initialized (key may be unconfigured)');
}

// POST /imports/direct - Zero-input WhatsApp chat drop: parses chat, extracts with Gemini, generates plan, converts summary to speech via Sarvam
importsRouter.post('/imports/direct', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    let chatText = '';
    let fileName = 'whatsapp-chat.txt';
    let fileType = 'text/plain';
    let attachmentCount = 0;

    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype;

      if (fileName.toLowerCase().endsWith('.zip') || fileType.includes('zip')) {
        const result = extractChatFromZip(req.file.buffer);
        chatText = result.chatText;
        attachmentCount = result.extractedFiles.length;
      } else {
        chatText = req.file.buffer.toString('utf8');
      }
    } else if (req.body.text) {
      chatText = req.body.text;
    } else {
      throw new ApiError(400, 'NO_CONTENT', 'Please drop or select a WhatsApp .txt or .zip export file.');
    }

    // 1. Parse WhatsApp Chat Messages
    const normalizedMessages = parseWhatsAppChat(chatText);
    if (normalizedMessages.length === 0) {
      throw new ApiError(400, 'PARSING_FAILED', 'Could not parse any valid messages from the WhatsApp export.');
    }

    // 2. Extract core metadata with Gemini AI
    const insights = await aiProvider.extractInsights(normalizedMessages);

    // 3. Auto-create Workspace with all people mapped from chat
    const workspaceId = `ws_${Date.now()}`;
    const destinationName = insights.destination?.value || 'Weekend Trip';
    const workspaceTitle = `${destinationName} Outing`;

    const senders = Array.from(
      new Set(normalizedMessages.filter(m => m.senderLabel && m.senderLabel !== 'System').map(m => m.senderLabel))
    );

    const members: any[] = [
      {
        userId: req.user!.userId,
        displayName: req.user!.displayName || 'Organizer',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        email: req.user!.email,
      },
    ];

    for (const sender of senders) {
      if (!members.some(m => m.displayName.toLowerCase() === sender.toLowerCase())) {
        members.push({
          userId: `usr_${Math.random().toString(36).substring(2, 8)}`,
          displayName: sender,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
      }
    }

    const workspace: Workspace = {
      id: workspaceId,
      title: workspaceTitle,
      description: insights.summary || `Outing to ${destinationName} planned from WhatsApp discussion.`,
      sourceType: 'chat_import',
      destination: destinationName,
      startDate: insights.date?.value?.startDate || undefined,
      endDate: insights.date?.value?.endDate || undefined,
      estimatedBudget: insights.budget?.value?.amount || 2500,
      currency: insights.budget?.value?.currency || 'INR',
      groupSize: members.length,
      status: 'planning',
      ownerId: req.user!.userId,
      members,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.workspaces.set(workspaceId, workspace);

    // Save import record & messages
    const importId = `imp_${Date.now()}`;
    const importRecord: ChatImportRecord = {
      id: importId,
      workspaceId,
      fileName,
      fileType,
      storagePath: `imports/${workspaceId}/${importId}/${fileName}`,
      status: 'completed',
      sourcePlatform: 'whatsapp',
      messageCount: normalizedMessages.length,
      attachmentCount,
      processedAttachmentCount: 0,
      failedAttachmentCount: 0,
      ownerId: req.user!.userId,
      consentConfirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.imports.set(importId, importRecord);
    store.messages.set(importId, normalizedMessages);
    store.insights.set(workspaceId, insights);

    // 4. Generate structured outing plan
    const plan = await aiProvider.generatePlan(workspaceId, insights, req.user!.userId);
    const existingPlans = store.plans.get(workspaceId) || [];
    existingPlans.push(plan);
    store.plans.set(workspaceId, existingPlans);

    // 5. Generate concise spoken plan summary text
    const summaryText = await aiProvider.generateVoiceSummary(insights, plan);

    // 6. Convert summary text into speech audio via Sarvam TTS
    let audioBase64: string | null = null;
    let audioFormat = 'wav';

    if (speechProvider) {
      try {
        const speechRes = await speechProvider.synthesize(summaryText, 'en-IN');
        audioBase64 = speechRes.audioBase64;
        audioFormat = speechRes.format;
      } catch (speechErr: any) {
        logger.warn({ err: speechErr }, 'Sarvam TTS audio synthesis failed during direct import');
      }
    }

    res.status(201).json({
      success: true,
      workspace,
      insights,
      plan,
      summaryText,
      audioBase64,
      audioFormat,
    });
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:id/imports - Upload WhatsApp export (TXT, ZIP, or pasted text)
importsRouter.post('/workspaces/:id/imports', authenticate, requireWorkspaceRole(['owner', 'editor']), upload.single('file'), async (req, res, next) => {
  try {
    const workspaceId = req.params.id as string;
    const workspace = store.workspaces.get(workspaceId);
    if (!workspace) {
      throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    const consentConfirmed = req.body.consentConfirmed === 'true' || req.body.consentConfirmed === true;
    if (!consentConfirmed) {
      throw new ApiError(400, 'CONSENT_REQUIRED', 'You must confirm user consent to process the conversation.');
    }

    let chatText = '';
    let fileName = 'pasted-chat.txt';
    let fileType = 'text/plain';
    let attachmentCount = 0;

    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype;

      if (fileName.toLowerCase().endsWith('.zip') || fileType.includes('zip')) {
        const result = extractChatFromZip(req.file.buffer);
        chatText = result.chatText;
        attachmentCount = result.extractedFiles.length;
      } else {
        chatText = req.file.buffer.toString('utf8');
      }
    } else if (req.body.text) {
      chatText = req.body.text;
    } else {
      throw new ApiError(400, 'NO_CONTENT', 'No file or chat text provided.');
    }

    // Parse messages
    const normalizedMessages = parseWhatsAppChat(chatText);
    if (normalizedMessages.length === 0) {
      throw new ApiError(400, 'PARSING_FAILED', 'Could not parse any valid messages from the export.');
    }

    const importId = `imp_${Date.now()}`;
    const importRecord: ChatImportRecord = {
      id: importId,
      workspaceId,
      fileName,
      fileType,
      storagePath: `imports/${workspaceId}/${importId}/${fileName}`,
      status: 'parsed',
      sourcePlatform: 'whatsapp',
      messageCount: normalizedMessages.length,
      attachmentCount,
      processedAttachmentCount: 0,
      failedAttachmentCount: 0,
      ownerId: req.user!.userId,
      consentConfirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.imports.set(importId, importRecord);
    store.messages.set(importId, normalizedMessages);

    // Update workspace sourceType and activity
    workspace.sourceType = 'chat_import';
    workspace.updatedAt = new Date().toISOString();

    // Trigger AI extraction immediately
    try {
      const insights = await aiProvider.extractInsights(normalizedMessages);
      store.insights.set(workspaceId, insights);
      importRecord.status = 'completed';

      // Update workspace destination if detected
      if (insights.destination?.value && (!workspace.destination || workspace.destination === 'Weekend Outing')) {
        workspace.destination = insights.destination.value;
        workspace.title = `${insights.destination.value} Group Outing`;
      }
      if (insights.budget?.value.amount && !workspace.estimatedBudget) {
        workspace.estimatedBudget = insights.budget.value.amount;
      }
    } catch (aiErr: any) {
      logger.error({ aiErr }, 'AI extraction error after import');
      importRecord.status = 'completed';
    }

    res.status(201).json({
      import: importRecord,
      messageCount: normalizedMessages.length,
      summary: {
        totalMessages: normalizedMessages.length,
        senders: Array.from(new Set(normalizedMessages.filter(m => m.senderLabel !== 'System').map(m => m.senderLabel))),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /imports/:id
importsRouter.get('/imports/:id', authenticate, (req, res) => {
  const importId = req.params.id as string;
  const record = store.imports.get(importId);
  if (!record) {
    throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
  }
  res.json({ import: record });
});

// GET /imports/:id/summary
importsRouter.get('/imports/:id/summary', authenticate, (req, res) => {
  const importId = req.params.id as string;
  const record = store.imports.get(importId);
  if (!record) {
    throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
  }

  const messages = store.messages.get(importId) || [];
  const senders = Array.from(new Set(messages.filter(m => m.senderLabel !== 'System').map(m => m.senderLabel)));
  const links = messages.flatMap(m => m.links);
  const attachments = messages.flatMap(m => m.attachments);

  res.json({
    summary: {
      importId: record.id,
      fileName: record.fileName,
      totalMessages: messages.length,
      participants: senders,
      linksFound: links.length,
      attachmentsFound: attachments.length,
      dateStart: messages[0]?.timestamp,
      dateEnd: messages[messages.length - 1]?.timestamp,
    },
  });
});

// GET /imports/:id/messages
importsRouter.get('/imports/:id/messages', authenticate, (req, res) => {
  const importId = req.params.id as string;
  const messages = store.messages.get(importId);
  if (!messages) {
    throw new ApiError(404, 'MESSAGES_NOT_FOUND', 'No messages found for this import');
  }
  res.json({ messages });
});

// GET /workspaces/:id/messages
importsRouter.get('/workspaces/:id/messages', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const imports = Array.from(store.imports.values()).filter(i => i.workspaceId === workspaceId);
  const allMessages: any[] = [];
  for (const imp of imports) {
    const msgs = store.messages.get(imp.id) || [];
    allMessages.push(...msgs);
  }
  res.json({ messages: allMessages });
});

// POST /imports/:id/process
importsRouter.post('/imports/:id/process', authenticate, async (req, res, next) => {
  try {
    const importId = req.params.id as string;
    const record = store.imports.get(importId);
    if (!record) {
      throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
    }

    const messages = store.messages.get(importId) || [];
    record.status = 'extracting';

    const insights = await aiProvider.extractInsights(messages);
    store.insights.set(record.workspaceId, insights);
    record.status = 'completed';
    record.updatedAt = new Date().toISOString();

    // Map chat participants/senders directly into workspace members for this outing
    const ws = store.workspaces.get(record.workspaceId);
    if (ws) {
      if (insights.destination?.value && !ws.destination) {
        ws.destination = insights.destination.value;
      }
      if (insights.budget?.value?.amount && !ws.estimatedBudget) {
        ws.estimatedBudget = insights.budget.value.amount;
      }

      const senders = Array.from(
        new Set(messages.filter(m => m.senderLabel && m.senderLabel !== 'System').map(m => m.senderLabel))
      );
      for (const sender of senders) {
        if (!ws.members.some(m => m.displayName.toLowerCase() === sender.toLowerCase())) {
          ws.members.push({
            userId: `usr_chat_${Math.random().toString(36).substring(2, 8)}`,
            displayName: sender,
            role: 'member',
            joinedAt: new Date().toISOString(),
          });
        }
      }

      ws.groupSize = ws.members.length;
      ws.updatedAt = new Date().toISOString();
      store.workspaces.set(record.workspaceId, ws);
    }

    res.json({ success: true, insights });
  } catch (err) {
    next(err);
  }
});

// DELETE /imports/:id
importsRouter.delete('/imports/:id', authenticate, (req, res) => {
  const importId = req.params.id as string;
  const record = store.imports.get(importId);
  if (!record) {
    throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
  }

  store.imports.delete(importId);
  store.messages.delete(importId);
  res.json({ success: true, message: 'Import and associated messages deleted.' });
});
