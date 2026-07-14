import React, { useState, useEffect, useMemo } from 'react';
import { Story, Appearance, Video, db, GeneralSettings } from '@/lib/db';
import { Play, X } from 'lucide-react';

interface WidgetPreviewProps {
  stories: Story[];
  generalSettings: GeneralSettings | null;
  appearances: Appearance[];
  videos: Video[];
}

const idsEqual = (a?: any, b?: any) => {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a) === String(b);
};

const getStoryAppearanceId = (story?: any | null) => {
  if (!story) return null;

  return (
    story.appearance_id ||
    story.appearanceId ||
    story.appearance?.id ||
    story.style_id ||
    story.styleId ||
    null
  );
};

const getDefaultAppearanceId = (settings?: any | null) => {
  if (!settings) return null;

  return (
    settings.default_appearance_id ||
    settings.defaultAppearanceId ||
    settings.appearance_id ||
    settings.appearanceId ||
    null
  );
};

const resolveAppearanceForStory = (
  story: any | null,
  appearances: Appearance[] = [],
  generalSettings: any | null = null,
) => {
  const storyAppearanceId = getStoryAppearanceId(story);

  if (storyAppearanceId) {
    const storyAppearance = appearances.find(app =>
      idsEqual(app.id, storyAppearanceId),
    );

    if (storyAppearance) return storyAppearance;
  }

  const defaultAppearanceId = getDefaultAppearanceId(generalSettings);

  if (defaultAppearanceId) {
    const defaultAppearance = appearances.find(app =>
      idsEqual(app.id, defaultAppearanceId),
    );

    if (defaultAppearance) return defaultAppearance;
  }

  return (
    appearances.find((app: any) => app.is_default || app.isDefault) ||
    appearances[0] ||
    null
  );
};

const getVideoThumb = (video?: any | null) => {
  if (!video) return 'https://via.placeholder.com/150';

  return (
    video.thumbnail_url ||
    video.thumbnailUrl ||
    video.poster_url ||
    video.posterUrl ||
    video.image_url ||
    video.imageUrl ||
    'https://via.placeholder.com/150'
  );
};

const getVideoUrl = (video?: any | null) => {
  if (!video) return '';

  return video.video_url || video.videoUrl || video.url || '';
};

const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  stories,
  generalSettings,
  appearances,
  videos,
}) => {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(
    new Map(),
  );

  useEffect(() => {
    const buildStoryVideoMap = async () => {
      const storeId = (generalSettings as any)?.store_id || '';

      let allStoryVideos: any[] = [];

      try {
        allStoryVideos = storeId
          ? await (db.storyVideos as any).getAll(storeId)
          : await db.storyVideos.getAll();
      } catch {
        allStoryVideos = await db.storyVideos.getAll();
      }

      const map = new Map<string, Video[]>();

      stories.forEach(story => {
        const relations = allStoryVideos
          .filter((sv: any) => sv.story_id === story.id)
          .sort(
            (a: any, b: any) =>
              Number(a.position || 0) - Number(b.position || 0),
          );

        const videosForStory = relations
          .map((sv: any) => videos.find(v => v.id === sv.video_id))
          .filter((v): v is Video => v !== undefined);

        map.set(story.id, videosForStory);
      });

      setStoryVideosMap(map);
    };

    buildStoryVideoMap();
  }, [stories, videos, generalSettings]);

  const activeStories = useMemo(
    () => stories.filter((s: any) => s.active !== false),
    [stories],
  );

  const activeAppearance = useMemo(
    () =>
      resolveAppearanceForStory(
        activeStory,
        appearances,
        generalSettings,
      ),
    [activeStory, appearances, generalSettings],
  );

  const handleStoryClick = (story: Story) => {
    setActiveStory(story);
  };

  const handleCtaClick = (link?: string) => {
    if (link) {
      window.open(link, '_blank');
    } else {
      alert('Este story não possui um link de compra configurado.');
    }
  };

  const mainVideoForActiveStory = activeStory
    ? storyVideosMap.get(activeStory.id)?.[0] || null
    : null;

  if (!generalSettings || !(generalSettings as any).app_enabled) {
    return null;
  }

  return (
    <div className="relative mx-auto flex h-[640px] w-[320px] flex-col overflow-hidden rounded-[40px] border-[12px] border-slate-900 bg-slate-950 shadow-2xl">
      <div className="absolute left-1/2 top-0 z-50 flex h-6 w-32 -translate-x-1/2 transform items-center justify-center rounded-b-2xl bg-slate-900">
        <div className="mb-1 h-1 w-12 rounded-full bg-slate-800" />
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 pb-3 pt-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {(generalSettings as any).store_name?.charAt(0) || 'L'}
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-800">
              {(generalSettings as any).store_name || 'Loja'}
            </h4>

            <p className="text-[10px] text-gray-400">
              {((generalSettings as any).store_url || '').replace(
                /(^\w+:|^)\/\//,
                '',
              )}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
          Loja Ativa
        </span>
      </div>

      <div className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-slate-50 p-4">
        <div className="space-y-3">
          <div className="flex h-24 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="flex h-8 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-600">
              Ver Novidades
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex h-32 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              <div className="h-20 rounded-lg bg-gray-100" />
              <div className="h-2 w-3/4 rounded bg-gray-200" />
            </div>

            <div className="flex h-32 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              <div className="h-20 rounded-lg bg-gray-100" />
              <div className="h-2 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        </div>

        {(generalSettings as any).stories_enabled && activeStories.length > 0 && (
          <div className="mt-auto border-t border-gray-100 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Stories em Destaque
            </p>

            <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
              {activeStories.map(story => {
                const storyAppearance = resolveAppearanceForStory(
                  story,
                  appearances,
                  generalSettings,
                );

                const storyThumb = getVideoThumb(
                  storyVideosMap.get(story.id)?.[0],
                );

                const themeColor =
                  storyAppearance?.primary_color || '#8B5CF6';

                return (
                  <button
                    key={story.id}
                    onClick={() => handleStoryClick(story)}
                    className="group flex flex-shrink-0 flex-col items-center gap-1 focus:outline-none"
                    type="button"
                  >
                    <div
                      className="rounded-full p-[2px] transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(45deg, ${themeColor}, #EC4899)`,
                      }}
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-slate-200">
                        <img
                          src={storyThumb}
                          alt={story.title}
                          className="h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-4 w-4 fill-white text-white opacity-80" />
                        </div>
                      </div>
                    </div>

                    <span className="max-w-[60px] truncate text-center text-[9px] font-medium text-gray-700">
                      {story.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeStory && mainVideoForActiveStory && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-black p-4">
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full w-2/3 animate-[pulse_1.5s_infinite]"
              style={{
                backgroundColor: activeAppearance?.primary_color || '#FFFFFF',
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{
                  backgroundColor:
                    activeAppearance?.primary_color || '#8B5CF6',
                }}
              >
                {(generalSettings as any).store_name?.charAt(0) || 'L'}
              </div>

              <span className="text-xs font-bold">{activeStory.title}</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveStory(null)}
              className="rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative my-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
            <video
              src={getVideoUrl(mainVideoForActiveStory)}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>

          {(activeStory as any).cta_enabled &&
            (activeStory as any).cta_type !== 'none' && (
              <div className="pb-4">
                <button
                  type="button"
                  onClick={() => handleCtaClick((activeStory as any).cta_url)}
                  style={{
                    backgroundColor:
                      activeAppearance?.button_color ||
                      activeAppearance?.primary_color ||
                      '#8B5CF6',
                  }}
                  className="w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-lg transition-opacity hover:opacity-90"
                >
                  {(activeStory as any).cta_text || 'Comprar Agora'}
                </button>
              </div>
            )}
        </div>
      )}

      <div className="absolute bottom-1 left-1/2 h-1 w-32 -translate-x-1/2 transform rounded-full bg-slate-800" />
    </div>
  );
};

export default WidgetPreview;
