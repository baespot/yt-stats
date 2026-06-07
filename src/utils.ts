import { ParsedInput } from "./types";

export function parseYouTubeInput(rawText: string): ParsedInput[] {
  const lines = rawText.split(/[\n,]+/).map(i => i.trim()).filter(Boolean);
  const inputs: ParsedInput[] = [];

  for (const line of lines) {
    // Single video
    const videoMatch = line.match(/[?&]v=([^&]+)/);
    if (videoMatch) {
      inputs.push({ type: 'video', id: videoMatch[1] });
      continue;
    }
    const shortVideoMatch = line.match(/youtu\.be\/([^?]+)/);
    if (shortVideoMatch) {
      inputs.push({ type: 'video', id: shortVideoMatch[1] });
      continue;
    }

    // Playlist
    const playlistMatch = line.match(/[?&]list=([^&]+)/);
    if (playlistMatch) {
      inputs.push({ type: 'playlist', id: playlistMatch[1] });
      continue;
    }

    // Channel ID URL
    const channelIdMatch = line.match(/youtube\.com\/channel\/([^/?]+)/);
    if (channelIdMatch) {
      inputs.push({ type: 'channel', id: channelIdMatch[1] });
      continue;
    }

    // Channel Handle URL
    const channelHandleUrlMatch = line.match(/youtube\.com\/@([^/?]+)/);
    if (channelHandleUrlMatch) {
      inputs.push({ type: 'channelHandle', handle: '@' + channelHandleUrlMatch[1] });
      continue;
    }

    // Raw Handle
    const rawHandleMatch = line.match(/^@([^/?]+)/);
    if (rawHandleMatch) {
      inputs.push({ type: 'channelHandle', handle: '@' + rawHandleMatch[1] });
      continue;
    }

    // Raw Channel ID
    const rawChannelIdMatch = line.match(/^UC[-_a-zA-Z0-9]{22}$/);
    if (rawChannelIdMatch) {
      inputs.push({ type: 'channel', id: rawChannelIdMatch[0] });
      continue;
    }
  }

  // Deduplicate entries by type + id / handle
  const unique = [];
  const seen = new Set();
  for (const item of inputs) {
    const key = item.type + '-' + (item.id || item.handle);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

export function formatNumber(num: number | string): string {
  if (typeof num === 'string') num = parseInt(num, 10);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

export function getRankColor(rank: number) {
  if (rank === 1) return 'text-yellow-400 bg-yellow-400/10';
  if (rank === 2) return 'text-gray-300 bg-gray-300/10';
  if (rank === 3) return 'text-amber-600 bg-amber-600/10';
  return 'text-gray-400 bg-gray-800';
}
