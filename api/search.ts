import type { VercelRequest, VercelResponse } from '@vercel/node';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

async function ytFetch(endpoint: string, params: Record<string, string>) {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY environment variable is required');
  const url = new URL(`${YT_BASE}${endpoint}`);
  url.searchParams.set('key', YOUTUBE_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API Error: ${res.status} ${res.statusText} - ${(err as any).error?.message || ''}`);
  }
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const data = await ytFetch('/search', {
      part: 'snippet',
      q: query,
      type: 'channel',
      maxResults: '5'
    });
    const results = (data.items || []).map((item: any) => ({
      id: item.snippet.channelId,
      name: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
      handle: ''
    }));
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
