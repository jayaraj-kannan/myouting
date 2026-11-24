import { describe, it, expect } from 'vitest';
import { parseWhatsAppChat } from './whatsapp-parser';
import { isSafeUrl } from './link-extractor';

describe('WhatsApp Parser', () => {
  it('parses Android 24-hour messages with timestamps', () => {
    const raw = `24/11/2026, 14:30 - Priya: Let's plan Pondicherry trip next weekend!
24/11/2026, 14:31 - Rahul: Count me in!
24/11/2026, 14:32 - Karthik: Budget should be under Rs 3000 per person.`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(3);
    expect(messages[0].senderLabel).toBe('Priya');
    expect(messages[0].text).toBe("Let's plan Pondicherry trip next weekend!");
    expect(messages[0].messageType).toBe('text');
    expect(messages[0].timestamp).toContain('2026-11-24T14:30');
    expect(messages[2].senderLabel).toBe('Karthik');
  });

  it('parses Android 12-hour AM/PM format', () => {
    const raw = `12/05/2026, 9:15 AM - Priya: Good morning team!
12/05/2026, 1:45 PM - Rahul: Let's meet at 6:00 AM on Saturday.`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].timestamp).toContain('2026-05-12T09:15');
    expect(messages[1].timestamp).toContain('2026-05-12T13:45');
  });

  it('parses iOS bracket timestamp format', () => {
    const raw = `[24/11/26, 14:30:15] Ananya: Budget around ₹2500 per head?
[24/11/26, 14:31:00] Vikram: Yes, sounds reasonable.`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].senderLabel).toBe('Ananya');
    expect(messages[0].text).toBe('Budget around ₹2500 per head?');
    expect(messages[1].senderLabel).toBe('Vikram');
  });

  it('handles multiline messages cleanly', () => {
    const raw = `24/11/2026, 14:32 - Karthik: Here is the itinerary draft:
Day 1: Promenade Beach and French Quarter
Day 2: Auroville and Paradise Beach
24/11/2026, 14:35 - Priya: Looks awesome!`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toContain('Day 1: Promenade Beach');
    expect(messages[0].text).toContain('Day 2: Auroville');
    expect(messages[1].text).toBe('Looks awesome!');
  });

  it('identifies media omitted and file attachments', () => {
    const raw = `24/11/2026, 14:35 - Priya: <Media omitted>
24/11/2026, 14:36 - Rahul: resort-booking.pdf (file attached)
24/11/2026, 14:37 - Ananya: beach-photo.jpg (file attached)`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(3);
    expect(messages[0].messageType).toBe('image');
    expect(messages[0].attachments[0].processingStatus).toBe('skipped');

    expect(messages[1].messageType).toBe('document');
    expect(messages[1].attachments[0].fileName).toBe('resort-booking.pdf');

    expect(messages[2].messageType).toBe('image');
    expect(messages[2].attachments[0].fileName).toBe('beach-photo.jpg');
  });

  it('extracts links and checks SSRF safety', () => {
    const raw = `24/11/2026, 14:40 - Ananya: Check out https://hotel-beach.com/stay and http://169.254.169.254/latest/meta-data`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(1);
    expect(messages[0].links).toHaveLength(2);

    const safeLink = messages[0].links.find(l => l.url === 'https://hotel-beach.com/stay');
    const dangerousLink = messages[0].links.find(l => l.url.includes('169.254.169.254'));

    expect(safeLink?.isSafe).toBe(true);
    expect(dangerousLink?.isSafe).toBe(false);
  });

  it('classifies system messages separately', () => {
    const raw = `24/11/2026, 14:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
24/11/2026, 14:01 - Priya: Hey guys`;

    const messages = parseWhatsAppChat(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].messageType).toBe('system');
    expect(messages[0].senderLabel).toBe('System');
    expect(messages[1].senderLabel).toBe('Priya');
  });
});

describe('SSRF link protector', () => {
  it('blocks private IPs, localhost, and metadata endpoints', () => {
    expect(isSafeUrl('http://localhost:3000')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1:8080')).toBe(false);
    expect(isSafeUrl('http://10.0.0.1/secrets')).toBe(false);
    expect(isSafeUrl('http://172.16.0.5/api')).toBe(false);
    expect(isSafeUrl('http://192.168.1.1/router')).toBe(false);
    expect(isSafeUrl('http://169.254.169.254/metadata')).toBe(false);
    expect(isSafeUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    expect(isSafeUrl('ftp://example.com')).toBe(false);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);

    expect(isSafeUrl('https://google.com')).toBe(true);
    expect(isSafeUrl('https://en.wikipedia.org/wiki/Pondicherry')).toBe(true);
  });
});
