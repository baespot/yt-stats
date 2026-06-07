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

function cleanTitle(title: string) {
  return title.trim();
}

async function fetchVideoStats(videoIds: string[], shortsSet: Set<string> = new Set()) {
  const stats: any[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const data = await ytFetch('/videos', {
      part: 'snippet,statistics,status',
      id: chunk.join(',')
    });
    for (const item of data.items || []) {
      const viewCount = parseInt(item.statistics.viewCount || '0', 10);
      const likeCount = parseInt(item.statistics.likeCount || '0', 10);
      stats.push({
        id: item.id,
        title: cleanTitle(item.snippet.title),
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        views: viewCount,
        likes: likeCount,
        uploadDate: item.snippet.publishedAt,
        likeViewRatio: viewCount > 0 ? ((likeCount / viewCount) * 100).toFixed(2) : '0',
        privacyStatus: item.status?.privacyStatus || 'public',
        isShort: shortsSet.has(item.id)
      });
    }
  }
  return stats;
}

async function fetchAllVideoIdsFromPlaylist(playlistId: string, maxItems = -1) {
  let videoIds: string[] = [];
  let pageToken = '';
  while (true) {
    const data = await ytFetch('/playlistItems', {
      part: 'contentDetails',
      playlistId: playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {})
    });
    const ids = (data.items || []).map((item: any) => item.contentDetails.videoId);
    videoIds.push(...ids);
    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
    } else {
      break;
    }
  }
  if (maxItems > 0) videoIds = videoIds.slice(0, maxItems);
  return videoIds;
}

async function fetchAllVideosFromPlaylist(playlistId: string, shortsSet: Set<string> = new Set(), topN = -1) {
  const videoIds = await fetchAllVideoIdsFromPlaylist(playlistId, topN);
  const videos = await fetchVideoStats(videoIds, shortsSet);
  videos.sort((a, b) => b.views - a.views);
  return videos;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { inputs } = req.body;
    if (!inputs || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    const results = {
      channels: [] as any[],
      playlists: [] as any[],
      videos: [] as any[]
    };

    for (const input of inputs) {
      if (input.type === 'video') {
        const vData = await fetchVideoStats([input.id]);
        if (vData.length) results.videos.push(vData[0]);
      } else if (input.type === 'playlist') {
        const pData = await ytFetch('/playlists', {
          part: 'snippet,contentDetails',
          id: input.id
        });
        if (pData.items && pData.items.length > 0) {
          const item = pData.items[0];
          const channelId = item.snippet.channelId;
          let shortsSet = new Set<string>();
          if (channelId) {
            try {
              const shortIds = await fetchAllVideoIdsFromPlaylist(channelId.replace(/^UC/, 'UUSH'));
              shortsSet = new Set(shortIds);
            } catch (e) {}
          }
          const videos = await fetchAllVideosFromPlaylist(input.id, shortsSet, 40);
          let totalViews = 0, totalLikes = 0;
          let publicVideoCount = 0, privateVideoCount = 0;
          videos.forEach((v: any) => {
            totalViews += v.views;
            totalLikes += v.likes;
            if (v.privacyStatus === 'public') publicVideoCount++;
            else privateVideoCount++;
          });
          results.playlists.push({
            id: input.id,
            name: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
            totalVideos: item.contentDetails.itemCount,
            totalViews,
            totalLikes,
            videos,
            publicVideoCount,
            privateVideoCount
          });
        }
      } else if (input.type === 'channel' || input.type === 'channelHandle') {
        const params: any = { part: 'snippet,statistics,contentDetails,brandingSettings' };
        if (input.type === 'channel') {
          params.id = input.id;
        } else {
          params.forHandle = input.handle;
        }
        const cData = await ytFetch('/channels', params);
        if (cData.items && cData.items.length > 0) {
          const item = cData.items[0];
          const uploadsPlaylistId = item.contentDetails.relatedPlaylists.uploads;
          let shortsSet = new Set<string>();
          try {
            const shortIds = await fetchAllVideoIdsFromPlaylist(item.id.replace(/^UC/, 'UUSH'));
            shortsSet = new Set(shortIds);
          } catch (e) {}
          const videos = await fetchAllVideosFromPlaylist(uploadsPlaylistId, shortsSet, -1);
          let totalViews = parseInt(item.statistics.viewCount || '0', 10);
          let totalLikes = 0;
          let publicVideoCount = 0, privateVideoCount = 0;
          videos.forEach((v: any) => {
            totalLikes += v.likes;
            if (v.privacyStatus === 'public') publicVideoCount++;
            else privateVideoCount++;
          });
          const thumbnailUrl = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
          const bannerUrl = item.brandingSettings?.image?.bannerExternalUrl || item.brandingSettings?.image?.bannerImageUrl || '';
          results.channels.push({
            id: item.id,
            name: item.snippet.title,
            handle: item.snippet.customUrl,
            bannerUrl,
            thumbnailUrl,
            viewCount: totalViews,
            totalLikes,
            videoCount: (publicVideoCount + privateVideoCount).toString(),
            publicVideoCount,
            privateVideoCount,
            subscriberCount: item.statistics.subscriberCount,
            videos
          });
        }
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
