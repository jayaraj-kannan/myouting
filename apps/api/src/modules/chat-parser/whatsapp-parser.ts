import { NormalizedMessage, MessageType, AttachmentMetadata } from '../../types';
import { extractLinks } from './link-extractor';

// Date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD/MM/YY, etc.
// Time formats: HH:mm, HH:mm:ss, h:mm a, h:mm:ss PM, etc.
const ANDROID_MSG_REGEX = /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*([^:]+?):\s*([\s\S]*)$/;
const ANDROID_SYSTEM_REGEX = /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*([^:]+)$/;

const IOS_MSG_REGEX = /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s*([^:]+?):\s*([\s\S]*)$/;
const IOS_SYSTEM_REGEX = /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s*([^:]+)$/;

export function normalizeTimestamp(dateStr: string, timeStr: string): string {
  try {
    const cleanDate = dateStr.trim().replace(/\./g, '/').replace(/-/g, '/');
    const dateParts = cleanDate.split('/');
    let year = 2026;
    let month = 1;
    let day = 1;

    if (dateParts.length === 3) {
      if (dateParts[0].length === 4) {
        // YYYY/MM/DD
        year = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10);
        day = parseInt(dateParts[2], 10);
      } else {
        // DD/MM/YY or DD/MM/YYYY (common in India, UK) or MM/DD/YY
        const p1 = parseInt(dateParts[0], 10);
        const p2 = parseInt(dateParts[1], 10);
        let p3 = parseInt(dateParts[2], 10);
        if (p3 < 100) p3 += 2000;
        year = p3;
        // If p1 > 12, p1 is day
        if (p1 > 12) {
          day = p1;
          month = p2;
        } else {
          // Default to Day/Month (standard in India/en-IN)
          day = p1;
          month = p2;
        }
      }
    }

    // Parse time
    const timeClean = timeStr.trim().toUpperCase();
    const isPM = timeClean.includes('PM');
    const isAM = timeClean.includes('AM');
    const digitsOnly = timeClean.replace(/[^\d:]/g, '');
    const timeParts = digitsOnly.split(':');
    let hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const seconds = parseInt(timeParts[2] || '0', 10);

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}.000Z`;
  } catch {
    return new Date().toISOString();
  }
}

export function detectMessageType(text: string): { type: MessageType; attachment?: AttachmentMetadata } {
  const trimmed = text.trim();

  // Media omitted
  if (/<Media omitted>|<media omitted>/i.test(trimmed)) {
    return {
      type: 'image',
      attachment: {
        attachmentId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: 'omitted_media',
        fileType: 'unknown',
        processingStatus: 'skipped',
        errorMessage: 'Media omitted in WhatsApp export',
      },
    };
  }

  // File attached pattern e.g. "IMG-20261124-WA0001.jpg (file attached)" or "(file attached)"
  const fileAttachedMatch = trimmed.match(/^([\w\-.]+\.([a-zA-Z0-9]{3,4}))\s+\(file attached\)/i);
  if (fileAttachedMatch) {
    const fileName = fileAttachedMatch[1];
    const ext = fileAttachedMatch[2].toLowerCase();
    let type: MessageType = 'document';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) type = 'image';
    else if (['mp4', 'mov', 'avi', 'mkv', '3gp'].includes(ext)) type = 'video';
    else if (['opus', 'mp3', 'm4a', 'aac', 'ogg', 'wav'].includes(ext)) type = 'audio';
    else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) type = 'document';

    return {
      type,
      attachment: {
        attachmentId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName,
        fileType: ext,
        processingStatus: 'pending',
      },
    };
  }

  // Location
  if (/maps\.google\.com|goo\.gl\/maps|maps\.apple\.com/i.test(trimmed)) {
    return { type: 'location' };
  }

  return { type: 'text' };
}

export function parseWhatsAppChat(rawText: string): NormalizedMessage[] {
  const lines = rawText.split(/\r?\n/);
  const messages: NormalizedMessage[] = [];

  let currentMsg: {
    messageId: string;
    timestamp: string;
    senderLabel: string;
    messageType: MessageType;
    text: string;
    attachments: AttachmentMetadata[];
    sourceLine: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Check Android format first
    let match = line.match(ANDROID_MSG_REGEX);
    let isIos = false;

    if (!match) {
      match = line.match(IOS_MSG_REGEX);
      if (match) isIos = true;
    }

    if (match) {
      // Save previous message
      if (currentMsg) {
        messages.push({
          ...currentMsg,
          links: extractLinks(currentMsg.text),
        });
      }

      const dateStr = match[1];
      const timeStr = match[2];
      const senderLabel = match[3].trim();
      const messageBody = match[4];
      const timestamp = normalizeTimestamp(dateStr, timeStr);
      const detection = detectMessageType(messageBody);

      const attachments: AttachmentMetadata[] = [];
      if (detection.attachment) {
        attachments.push(detection.attachment);
      }

      currentMsg = {
        messageId: `msg_${messages.length + 1}`,
        timestamp,
        senderLabel,
        messageType: detection.type,
        text: messageBody,
        attachments,
        sourceLine: i + 1,
      };
      continue;
    }

    // Check system message format
    const sysMatch = line.match(ANDROID_SYSTEM_REGEX) || line.match(IOS_SYSTEM_REGEX);
    if (sysMatch) {
      if (currentMsg) {
        messages.push({
          ...currentMsg,
          links: extractLinks(currentMsg.text),
        });
      }

      const dateStr = sysMatch[1];
      const timeStr = sysMatch[2];
      const sysText = sysMatch[3].trim();
      const timestamp = normalizeTimestamp(dateStr, timeStr);

      currentMsg = {
        messageId: `msg_${messages.length + 1}`,
        timestamp,
        senderLabel: 'System',
        messageType: 'system',
        text: sysText,
        attachments: [],
        sourceLine: i + 1,
      };
      continue;
    }

    // If not a new header, it is a multiline continuation of currentMsg
    if (currentMsg) {
      currentMsg.text += '\n' + line;
    }
  }

  // Push last message
  if (currentMsg) {
    messages.push({
      ...currentMsg,
      links: extractLinks(currentMsg.text),
    });
  }

  return messages;
}
