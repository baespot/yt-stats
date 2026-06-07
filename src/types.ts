export interface VideoStats {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  uploadDate: string;
  likeViewRatio: string;
  privacyStatus: string;
  isShort: boolean;
}

export interface ChannelStats {
  id: string;
  name: string;
  handle: string;
  bannerUrl: string;
  thumbnailUrl: string;
  viewCount: number;
  totalLikes: number;
  videoCount: string;
  subscriberCount: string;
  videos: VideoStats[];
  publicVideoCount?: number;
  privateVideoCount?: number;
}

export interface PlaylistStats {
  id: string;
  name: string;
  thumbnailUrl: string;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  videos: VideoStats[];
  publicVideoCount?: number;
  privateVideoCount?: number;
}

export interface AnalysisResponse {
  channels: ChannelStats[];
  playlists: PlaylistStats[];
  videos: VideoStats[];
}

export interface ParsedInput {
  type: 'channel' | 'channelHandle' | 'video' | 'playlist';
  id?: string;
  handle?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  handle: string;
  thumbnailUrl: string;
}
