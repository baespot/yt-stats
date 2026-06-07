import React, { useState, useRef, useEffect, UIEvent } from 'react';
import { AnalysisResponse, ChannelStats, PlaylistStats, VideoStats } from '../types';
import { formatNumber } from '../utils';
import { Copy, ChevronDown, ChevronRight, Video, Youtube, ListVideo, BarChart3, Download, LayoutGrid, List, Play } from 'lucide-react';

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { color: 'var(--rank-gold-text)', backgroundColor: 'var(--rank-gold-bg)' };
  if (rank === 2) return { color: 'var(--rank-silver-text)', backgroundColor: 'var(--rank-silver-bg)' };
  if (rank === 3) return { color: 'var(--rank-bronze-text)', backgroundColor: 'var(--rank-bronze-bg)' };
  return { color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-base)' };
};

const getRankDotColor = (rank: number) => {
  if (rank === 1) return '#22c55e';
  if (rank === 2) return '#3b82f6';
  return '#e5e7eb';
};

type SortOption = 'views' | 'likes' | 'recent' | 'oldest' | 'title';

const VirtualTable = ({ videos, showChannel = false, title = "Top Videos", isCollapsible = false, isOpen = true, onToggle = () => {} }: { videos: VideoStats[], showChannel?: boolean, title?: string, isCollapsible?: boolean, isOpen?: boolean, onToggle?: () => void }) => {
  const LIST_ROW_HEIGHT = 76;
  const GRID_ROW_HEIGHT = 280;
  const BUFFER = 10;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const [sortBy, setSortBy] = useState<SortOption>('views');
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onScroll = () => setScrollTop(node.scrollTop);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
       if (!containerRef.current) return;
       const width = containerRef.current.clientWidth;
       if (viewMode === 'list') {
         setCols(1);
       } else {
         setCols(width < 768 ? 2 : 3);
       }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, isOpen]);

  if (!videos || !videos.length) return null;
  
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'views') return b.views - a.views;
    if (sortBy === 'likes') return b.likes - a.likes;
    if (sortBy === 'recent') return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    if (sortBy === 'oldest') return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const header = showChannel ? ['Rank', 'Title', 'Channel', 'Views', 'Likes', 'Date'] : ['Rank', 'Title', 'Views', 'Likes', 'Date'];
  
  const generateRows = (delimiter: string) => {
    return sortedVideos.map((v, i) => {
      const row = showChannel 
        ? [i + 1, `"${v.title.replace(/"/g, '""')}"`, `"${v.channelName}"`, v.views, v.likes, v.uploadDate]
        : [i + 1, `"${v.title.replace(/"/g, '""')}"`, v.views, v.likes, v.uploadDate];
      return row.join(delimiter);
    });
  };

  const copyToClipboard = () => navigator.clipboard.writeText([header.join('\t'), ...generateRows('\t')].join('\n'));
  const exportCSV = () => downloadFile([header.join(','), ...generateRows(',')].join('\n'), `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`, 'text/csv;charset=utf-8;');
  
  const rowHeight = viewMode === 'list' ? LIST_ROW_HEIGHT : GRID_ROW_HEIGHT;
  const itemsPerRow = cols;
  
  const totalRows = Math.ceil(sortedVideos.length / itemsPerRow);
  const visibleRowCount = Math.ceil(600 / rowHeight);
  
  const startRowIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER);
  const endRowIndex = Math.min(totalRows, startRowIndex + visibleRowCount + 2 * BUFFER);

  const startIndex = startRowIndex * itemsPerRow;
  const endIndex = endRowIndex * itemsPerRow;

  const visibleRows = sortedVideos.slice(startIndex, endIndex);
  const topSpacerHeight = startRowIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRowIndex) * rowHeight);

  return (
    <div className="bg-white border border-gray-100 overflow-hidden mt-6 flex flex-col w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 border-b border-gray-100 bg-white gap-4">
        
        <div className="flex flex-row items-center gap-4">
          <div className="flex items-center border border-gray-100 rounded-sm overflow-hidden bg-white shrink-0">
             <button onClick={() => setViewMode('list')} className={`p-2 transition-colors min-h-[44px] ${viewMode === 'list' ? 'bg-[var(--text-secondary)] text-[var(--bg-base)]' : 'text-[var(--text-secondary)] hover:bg-gray-50'}`} title="List View"><List className="w-5 h-5" /></button>
             <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors min-h-[44px] border-l border-gray-100 ${viewMode === 'grid' ? 'bg-[var(--text-secondary)] text-[var(--bg-base)]' : 'text-[var(--text-secondary)] hover:bg-gray-50'}`} title="Grid View"><LayoutGrid className="w-5 h-5" /></button>
          </div>
          <h3 className="section-heading text-sm md:text-base truncate pr-2">
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select 
             value={sortBy} 
             onChange={(e) => setSortBy(e.target.value as SortOption)}
             className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] bg-white border border-gray-100 min-h-[44px] outline-none hover:border-[var(--text-tertiary)] cursor-pointer appearance-none rounded-sm"
          >
             <option value="views">Most Popular</option>
             <option value="likes">Most Liked</option>
             <option value="recent">Most Recent</option>
             <option value="oldest">Oldest</option>
             <option value="title">Title A-Z</option>
          </select>
          
          <button onClick={exportCSV} className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition-colors border border-gray-100 min-h-[44px] rounded-sm shrink-0">CSV</button>

          {isCollapsible && (
            <button 
              onClick={onToggle}
              className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition-colors border border-gray-100 min-h-[44px] rounded-sm shrink-0"
            >
              {isOpen ? 'HIDE VIDEOS' : 'SHOW VIDEOS'}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar w-full relative" style={{ height: '600px' }} ref={containerRef}>
          {viewMode === 'list' && (
            <table className="w-full text-left text-sm whitespace-nowrap m-0 border-spacing-0" style={{ minWidth: (showChannel ? '880px' : '760px') }}>
              <thead className="bg-white text-[var(--text-secondary)] text-xs uppercase tracking-widest font-mono font-bold sticky top-0 z-10 box-shadow-[0_1px_0_var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 w-16 border-b border-gray-100">Rank</th>
                  <th className="px-4 py-3 w-[45%] border-b border-gray-100">Video</th>
                  {showChannel && <th className="px-4 py-3 border-b border-gray-100">Channel</th>}
                  <th className="px-4 py-3 text-right border-b border-gray-100">Views</th>
                  <th className="px-4 py-3 text-right border-b border-gray-100">Likes</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right pr-6">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {topSpacerHeight > 0 && <tr style={{ height: topSpacerHeight }}><td colSpan={showChannel ? 6 : 5} /></tr>}
                {visibleRows.map((video, idx) => {
                  const rank = startIndex + idx + 1;
                  return (
                    <tr key={video.id + idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0" style={{ height: LIST_ROW_HEIGHT }}>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-mono font-bold text-[10px]" style={getRankStyle(rank)}>
                          #{rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`} className="w-16 sm:w-20 rounded-lg aspect-video object-cover shrink-0 block" style={{border:"1px solid var(--border-color)"}} alt="" loading="lazy" />
                          <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors font-bold tracking-tight truncate max-w-[200px] md:max-w-sm lg:max-w-md block leading-relaxed w-full">
                            {video.title}
                          </a>
                        </div>
                      </td>
                      {showChannel && <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs truncate max-w-[150px]">{video.channelName}</td>}
                      <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">{formatNumber(video.views)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">{formatNumber(video.likes)}</td>
                      <td className="px-4 py-3 font-mono text-[var(--text-tertiary)] text-[10px] text-right pr-6 tracking-widest">{new Date(video.uploadDate).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {bottomSpacerHeight > 0 && <tr style={{ height: bottomSpacerHeight }}><td colSpan={showChannel ? 6 : 5} /></tr>}
              </tbody>
            </table>
          )}
          {viewMode === 'grid' && (
            <div className="flex flex-col relative w-full overflow-hidden">
              {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} className="w-full shrink-0" />}
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 shrink-0">
                {visibleRows.map((video, idx) => {
                  const rank = startIndex + idx + 1;
                  return (
                    <div key={video.id + idx} className="flex flex-col bg-white border border-gray-100 hover:border-[var(--text-tertiary)] transition-colors rounded-sm overflow-hidden" style={{ height: GRID_ROW_HEIGHT - 16 }}>
                      <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="w-full aspect-video bg-black relative group overflow-hidden block shrink-0">
                        <img src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" alt="" />
                        <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] shadow-lg border border-[#27272a] backdrop-blur-md" style={getRankStyle(rank)}>#{rank}</span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </a>
                      <div className="p-3 flex flex-col flex-1">
                        <h4 className="font-bold text-[var(--text-primary)] text-xs line-clamp-2 leading-snug mb-2" title={video.title}>{video.title}</h4>
                        {showChannel && <p className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] mb-2 mt-auto truncate">{video.channelName}</p>}
                        {!showChannel && <div className="mt-auto"></div>}
                        
                        <div className="grid grid-cols-2 gap-px bg-[var(--border-color)] border border-gray-100 mt-2 shrink-0">
                          <div className="bg-white p-1.5 flex flex-col overflow-hidden">
                            <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] whitespace-nowrap">Views</span>
                            <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">{formatNumber(video.views)}</span>
                          </div>
                          <div className="bg-white p-1.5 flex flex-col items-end overflow-hidden">
                            <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] whitespace-nowrap">Likes</span>
                            <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">{formatNumber(video.likes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} className="w-full shrink-0" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, subLabel, isRanked = false }: { label: string, value: string | number, subLabel?: React.ReactNode, isRanked?: boolean }) => (
  <div className="flex flex-col p-4 md:p-6 bg-white border border-gray-100 w-full overflow-hidden">
    <span className="text-[10px] md:text-xs font-light tracking-[0.1em] uppercase text-[var(--text-secondary)] mb-2 whitespace-nowrap overflow-hidden text-clip">{label}</span>
    <span className="font-mono font-bold text-[var(--text-primary)] leading-none whitespace-nowrap overflow-hidden text-clip" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.6rem)' }}>
      {value}
    </span>
    {subLabel && <span className="text-[10px] md:text-xs text-[var(--text-tertiary)] mt-2 font-mono whitespace-nowrap uppercase tracking-widest overflow-hidden text-clip">{subLabel}</span>}
  </div>
);

const ChannelCard: React.FC<{ channel: ChannelStats, defaultOpen?: boolean, includeShorts: boolean }> = ({ channel, defaultOpen = true, includeShorts }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const displayVideos = includeShorts ? channel.videos : channel.videos.filter(v => !v.isShort);
  const shortsCount = channel.videos.filter(v => v.isShort).length;
  
  const displayViews = includeShorts 
    ? channel.viewCount 
    : channel.videos.filter(v => !v.isShort).reduce((acc, v) => acc + v.views, 0);

  const displayLikes = includeShorts
    ? channel.totalLikes
    : channel.videos.filter(v => !v.isShort).reduce((acc, v) => acc + v.likes, 0);

  return (
    <div className="bg-white border border-gray-100 overflow-hidden mb-12 fade-in">
      {channel.bannerUrl && (
        <div className="h-32 md:h-56 w-full bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${channel.bannerUrl})` }} />
      )}
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex items-center gap-4">
            {channel.thumbnailUrl && <img src={channel.thumbnailUrl} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-[var(--bg-base)] -mt-10 md:-mt-12 relative z-10 shrink-0" />}
            <div>
              <h2 className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                {channel.name}
              </h2>
              <p className="text-[var(--text-tertiary)] font-mono text-sm mt-1">{channel.handle}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-8">
          <StatCard label="Total Views" value={formatNumber(displayViews)} />
          <StatCard label="Total Likes" value={formatNumber(displayLikes)} />
          <StatCard label="Subscribers" value={formatNumber(channel.subscriberCount)} />
          <StatCard label="Videos" value={formatNumber(displayVideos.length)} subLabel={`${formatNumber(channel.videos.length)} total · ${formatNumber(shortsCount)} shorts`} />
        </div>

        <div className="fade-in mt-6">
          <VirtualTable 
            videos={displayVideos} 
            title="CHANNEL DIRECTORY" 
            isCollapsible={true}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </div>
    </div>
  );
};

const PlaylistCard: React.FC<{ playlist: PlaylistStats, includeShorts: boolean }> = ({ playlist, includeShorts }) => {
  const displayVideos = includeShorts ? playlist.videos : playlist.videos.filter(v => !v.isShort);
  const shortsCount = playlist.videos.filter(v => v.isShort).length;
  
  const displayViews = displayVideos.reduce((acc, v) => acc + v.views, 0);
  const displayLikes = displayVideos.reduce((acc, v) => acc + v.likes, 0);

  return (
    <div className="bg-white border border-gray-100 overflow-hidden mb-12 fade-in p-4 md:p-8">
      <h2 className="section-heading text-2xl md:text-3xl mb-6">{playlist.name}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6">
        <StatCard label="Total Views" value={formatNumber(displayViews)} />
        <StatCard label="Total Likes" value={formatNumber(displayLikes)} />
        <StatCard label="Videos" value={formatNumber(displayVideos.length)} subLabel={`${formatNumber(playlist.videos.length)} total · ${formatNumber(shortsCount)} shorts`} />
      </div>

      <VirtualTable videos={displayVideos} title="PLAYLIST ARCHIVE" />
    </div>
  );
};

const ChannelLeaderboard = ({ channels, includeShorts }: { channels: ChannelStats[], includeShorts: boolean }) => {
  const computedChannels = channels.map(c => {
    const displayVideos = includeShorts ? c.videos : c.videos.filter(v => !v.isShort);
    return {
      ...c,
      displayLikes: includeShorts ? c.totalLikes : c.videos.filter(v => !v.isShort).reduce((acc, v) => acc + v.likes, 0),
      displayViews: includeShorts ? c.viewCount : c.videos.filter(v => !v.isShort).reduce((acc, v) => acc + v.views, 0),
      displayVideoCount: displayVideos.length
    };
  });
  
  const sorted = computedChannels.sort((a, b) => b.displayLikes - a.displayLikes);

  const generateRows = (delimiter: string) => {
    return sorted.map((c, i) => {
      const row = [
        i + 1,
        `"${c.name.replace(/"/g, '""')}"`,
        c.displayLikes,
        c.displayViews,
        c.displayVideoCount
      ];
      return row.join(delimiter);
    });
  };

  const copyToClipboard = () => navigator.clipboard.writeText([['Rank', 'Channel Name', 'Total Likes', 'Total Views', 'Videos'].join('\t'), ...generateRows('\t')].join('\n'));
  const exportCSV = () => downloadFile([['Rank', 'Channel Name', 'Total Likes', 'Total Views', 'Videos'].join(','), ...generateRows(',')].join('\n'), 'channel_leaderboard.csv', 'text/csv;charset=utf-8;');
  const exportTXT = () => downloadFile([['Rank', 'Channel Name', 'Total Likes', 'Total Views', 'Videos'].join('\t'), ...generateRows('\t')].join('\n'), 'channel_leaderboard.txt', 'text/plain;charset=utf-8;');

  return (
    <div className="bg-white border border-gray-100 overflow-hidden mt-6 mb-12 w-full fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-100 bg-white gap-4">
        <h3 className="section-heading" style={{fontSize:"15px"}}>
          CHANNEL LEADERBOARD
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition-colors border border-gray-100 min-h-[44px]">CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap m-0" style={{ minWidth: '600px' }}>
          <thead className="bg-white text-[var(--text-secondary)] text-xs uppercase tracking-widest font-mono font-bold">
            <tr>
              <th className="px-4 py-3 w-16 border-b border-gray-100">Rank</th>
              <th className="px-4 py-3 w-full border-b border-gray-100">Channel Name</th>
              <th className="px-4 py-3 text-right border-b border-gray-100">Likes</th>
              <th className="px-4 py-3 text-right border-b border-gray-100">Views</th>
              <th className="px-4 py-3 text-right border-b border-gray-100">Videos</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {sorted.map((c, idx) => {
              const rank = idx + 1;
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px]" style={getRankStyle(rank)}>
                      #{rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--text-primary)] tracking-tight">
                    <a href={`https://youtube.com/channel/${c.id}`} target="_blank" rel="noreferrer" className="hover:text-[var(--accent)] transition-colors">
                      {c.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">{formatNumber(c.displayLikes)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">{formatNumber(c.displayViews)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">{formatNumber(c.displayVideoCount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ResultsDisplay = ({ data }: { data: AnalysisResponse }) => {
  const [includeShorts, setIncludeShorts] = useState(false);

  if (!data) return null;

  const showMultiChannel = data.channels.length > 1;

  let combinedVideos: VideoStats[] = [];
  if (showMultiChannel) {
    for (const c of data.channels) {
      combinedVideos.push(...(includeShorts ? c.videos : c.videos.filter(v => !v.isShort)));
    }
    combinedVideos.sort((a, b) => b.views - a.views);
    combinedVideos = combinedVideos.slice(0, 50); // Top 50 combined
  }

  return (
    <div className="w-full flex flex-col pt-4">
      
      <div className="flex justify-end mb-8 fade-in">
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-100 hover:border-[var(--text-tertiary)] transition-colors rounded-sm min-h-[44px]">
          <span style={{fontSize:"13px",fontWeight:600,color:"var(--text-primary)"}}>Include Shorts</span>
          <div className="relative flex items-center">
            <input type="checkbox" className="sr-only" checked={includeShorts} onChange={() => setIncludeShorts(!includeShorts)} />
            <div className={`block w-10 h-5 rounded-full transition-colors ${includeShorts ? 'bg-[#22c55e]' : 'bg-gray-200'}`}></div>
            <div className={`absolute left-1 bg-[var(--text-primary)] w-3 h-3 rounded-full transition-transform ${includeShorts ? 'translate-x-5' : ''}`}></div>
          </div>
        </label>
      </div>

      {/* Render Channels */}
      {data.channels.length > 0 && (
        <div className="w-full">
          {data.channels.map(c => <ChannelCard key={c.id} channel={c} defaultOpen={!showMultiChannel} includeShorts={includeShorts} />)}
        </div>
      )}

      {/* Multiple Channels Overall Leaderboards */}
      {showMultiChannel && (
        <div className="mb-12 border-t border-gray-100 pt-12 w-full fade-in">
          <h2 className="section-heading mb-6" style={{fontSize:"clamp(1.2rem,3vw,1.8rem)",letterSpacing:"-0.3px"}}>GLOBAL METRICS</h2>
          <ChannelLeaderboard channels={data.channels} includeShorts={includeShorts} />
          <VirtualTable videos={combinedVideos} showChannel={true} title="COMBINED TOP 50 DIRECTORY" />
        </div>
      )}

      {/* Render Playlists */}
      {data.playlists.length > 0 && (
        <div className="mb-12 w-full">
          {data.playlists.map(p => <PlaylistCard key={p.id} playlist={p} includeShorts={includeShorts} />)}
        </div>
      )}

      {/* Individual Single Videos */}
      {(includeShorts ? data.videos : data.videos.filter(v => !v.isShort)).length > 0 && (
        <div className="mb-12 border-t border-gray-100 pt-12 w-full fade-in">
          <h2 className="section-heading mb-6" style={{fontSize:"clamp(1.2rem,3vw,1.8rem)"}}>DISCRETE ASSETS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(includeShorts ? data.videos : data.videos.filter(v => !v.isShort)).map(v => (
              <div key={v.id} className="bg-white border border-gray-100 hover:border-[var(--text-tertiary)] transition-colors w-full flex flex-col rounded-sm overflow-hidden">
                <div className="aspect-video w-full bg-cover bg-center border-b border-gray-100 bg-black" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/mqdefault.jpg)` }} />
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] line-clamp-2 tracking-tight text-sm md:text-base leading-snug mb-2">{v.title}</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-mono tracking-widest mb-4 mt-auto">{v.channelName}</p>
                  
                  <div className="grid grid-cols-2 gap-px bg-[var(--border-color)] border border-gray-100">
                    <div className="bg-white p-2 flex flex-col overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[var(--text-secondary)] whitespace-nowrap">Views</p>
                      <p className="font-mono font-bold text-[var(--text-primary)] truncate">{formatNumber(v.views)}</p>
                    </div>
                    <div className="bg-white p-2 flex flex-col items-end overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[var(--text-secondary)] whitespace-nowrap">Likes</p>
                      <p className="font-mono font-bold text-[var(--text-primary)] truncate">{formatNumber(v.likes)}</p>
                    </div>
                    <div className="bg-white p-2 flex flex-col overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[var(--text-secondary)] whitespace-nowrap">Ratio</p>
                      <p className="font-mono font-bold text-[var(--text-primary)] truncate">{v.likeViewRatio}%</p>
                    </div>
                    <div className="bg-white p-2 flex flex-col items-end overflow-hidden">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[var(--text-secondary)] whitespace-nowrap">Uploaded</p>
                      <p className="font-mono font-bold text-[var(--text-secondary)] truncate text-xs">{new Date(v.uploadDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

