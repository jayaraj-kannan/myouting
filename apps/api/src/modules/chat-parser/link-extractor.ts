import { LinkMetadata } from '../../types';

// RFC 1918 private IPv4 ranges & loopback/metadata
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local / Cloud metadata (AWS, GCP, Azure)
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
  /metadata\.google\.internal/i,
];

export function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractLinks(text: string): LinkMetadata[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const uniqueUrls = Array.from(new Set(matches));
  return uniqueUrls.map((url) => {
    // Strip trailing punctuation like .,),?,! if attached
    const cleanUrl = url.replace(/[.,!?)]+$/, '');
    const safe = isSafeUrl(cleanUrl);
    return {
      url: cleanUrl,
      isSafe: safe,
    };
  });
}
