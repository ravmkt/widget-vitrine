"use client";

import React from 'react';
import { Film } from 'lucide-react';
import { Video } from '@/lib/db';
import { cn } from '@/lib/utils';
import { getExternalVideoData } from '@/lib/videoEmbeds';

type VideoThumbnailProps = {
  video: Video;
  className?: string;
  iconSize?: number;
};

const getBestThumbnailUrl = (video: Video) => {
  const rawVideo = video as any;

  const directThumb =
    video.thumbnail_url ||
    rawVideo.poster_url ||
    rawVideo.image_url ||
    rawVideo.cover_url ||
    rawVideo.thumb_url ||
    rawVideo.thumbnail ||
    rawVideo.thumbnailUrl ||
    rawVideo.image ||
    rawVideo.media?.thumbnail_url ||
    rawVideo.media?.thumbnailUrl ||
    '';

  if (directThumb) {
    return directThumb;
  }

  try {
    if (video.source_type === 'external_url') {
      const externalData = getExternalVideoData(video as any) as any;

      return (
        externalData?.thumbnail_url ||
        externalData?.thumbnailUrl ||
        externalData?.image_url ||
        externalData?.imageUrl ||
        externalData?.poster_url ||
        ''
      );
    }
  } catch {
    // ignora fallback externo
  }

  return '';
};

const VideoThumbnail = ({
  video,
  className,
  iconSize = 18,
}: VideoThumbnailProps) => {
  const thumbnailUrl = getBestThumbnailUrl(video);
  const videoUrl = (video as any).video_url || '';

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={video.title || 'Thumbnail do vídeo'}
        className={cn(
          'rounded-xl object-cover border border-slate-200 bg-slate-100',
          className,
        )}
        loading="lazy"
      />
    );
  }

  if (videoUrl) {
    return (
      <video
        src={`${videoUrl}#t=0.1`}
        className={cn(
          'rounded-xl object-cover border border-slate-200 bg-slate-950',
          className,
        )}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400',
        className,
      )}
    >
      <Film size={iconSize} />
    </div>
  );
};

export default VideoThumbnail;
