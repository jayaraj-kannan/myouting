import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface UnpackedZipResult {
  chatText: string;
  chatFileName: string;
  extractedFiles: Array<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    localPath?: string;
  }>;
}

const MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_FILE_COUNT = 500;

export function extractChatFromZip(zipBuffer: Buffer, outputDir?: string): UnpackedZipResult {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err: any) {
    throw new ApiError(400, 'INVALID_ZIP', 'The provided file is not a valid ZIP archive: ' + err.message);
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_FILE_COUNT) {
    throw new ApiError(400, 'ZIP_TOO_LARGE', `ZIP contains ${entries.length} files (maximum permitted: ${MAX_FILE_COUNT})`);
  }

  let totalSize = 0;
  for (const entry of entries) {
    totalSize += entry.header.size;
    if (totalSize > MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES) {
      throw new ApiError(400, 'ZIP_BOMB_DETECTED', 'Uncompressed ZIP content exceeds 100MB limit');
    }

    // Path traversal check
    const normalizedName = path.normalize(entry.entryName);
    if (normalizedName.startsWith('..') || path.isAbsolute(normalizedName)) {
      throw new ApiError(400, 'PATH_TRAVERSAL_DETECTED', `Disallowed entry name: ${entry.entryName}`);
    }
  }

  // Find the chat text entry: commonly '_chat.txt' (iOS/WhatsApp) or any .txt
  const chatEntry = entries.find(e => !e.isDirectory && (e.name === '_chat.txt' || e.name.toLowerCase().endsWith('.txt')));

  if (!chatEntry) {
    throw new ApiError(400, 'NO_CHAT_FILE_FOUND', 'Could not find any .txt chat export inside the ZIP archive.');
  }

  const chatText = zip.readAsText(chatEntry, 'utf8');

  // If output directory is supplied, safely extract media attachments
  const extractedFiles: Array<{ fileName: string; fileSize: number; mimeType: string; localPath?: string }> = [];

  if (outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const entry of entries) {
      if (entry.isDirectory || entry.entryName === chatEntry.entryName) continue;

      const safeBaseName = path.basename(entry.entryName);
      const targetFilePath = path.join(outputDir, safeBaseName);
      fs.writeFileSync(targetFilePath, entry.getData());

      const ext = path.extname(safeBaseName).toLowerCase().replace('.', '');
      extractedFiles.push({
        fileName: safeBaseName,
        fileSize: entry.header.size,
        mimeType: ext,
        localPath: targetFilePath,
      });
    }
  }

  logger.info({ chatFileName: chatEntry.name, attachmentCount: extractedFiles.length }, 'Successfully processed ZIP chat export');

  return {
    chatText,
    chatFileName: chatEntry.name,
    extractedFiles,
  };
}
