import React, { useState } from 'react';
import { Story, WidgetSettings } from '@/lib/supabase';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface WidgetPreviewProps {
  stories: Story[];
  settings: WidgetSettings;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ stories, settings }) => {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const activeStories = stories.filter(s => s.active);

  const handleStoryClick = (story: Story) => {
    setActiveStory(story);
  };

  return (
    <div className="relative mx-auto w-[320px] h-[640px] bg-slate-950 rounded-[40px] border-[12px] border-slate-900 shadow-2xl overflow-hidden flex flex-col">
      {/* Speaker & Camera Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-32 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center">
        <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
      </div>

      {/* Mock Store Header */}
      <div className="bg-white pt-8 pb-3 px-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs">
            U
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-800">Useanny</h4>
            <p className="text-[10px] text-gray-400">useanny.com.br</p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
          Loja Ativa
        </span>
      </div>

      {/* Mock Store Content */}
      <div className="flex-1 bg-slate-50 p-4 overflow-y-auto relative flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-24 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-8 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 text-xs font-bold">
              Ver Novidades
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-32 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="h-20 bg-gray-100 rounded-lg"></div>
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="h-32 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="h-20 bg-gray-100 rounded-lg"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Widget Rendered inside the Mock Store */}
        {settings.active && activeStories.length > 0 && (
          <div className="mt-auto pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Stories em Destaque
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {activeStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleStoryClick(story)}
                  className="flex flex-col items-center gap-1 flex-shrink-0 focus:outline-none group"
                >
                  <div 
                    className="p-[2px] rounded-full transition-transform duration-300 group-hover:scale-105"
                    style={{ 
                      background: `linear-gradient(45deg, ${settings.theme_color}, #EC4899)` 
                    }}
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden relative bg-slate-200">
                      <img 
                        src={story.thumbnail_url} 
                        alt={story.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white opacity-80" />
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-gray-700 max-w-[60px] truncate text-center">
                    {story.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal inside the Phone */}
      {activeStory && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col justify-between p-4">
          {/* Progress Bar */}
          <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden mt-4">
            <div className="bg-white h-full w-2/3 animate-[pulse_1.5s_infinite]"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between text-white mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-[10px]">
                U
              </div>
              <span className="text-xs font-bold">{activeStory.title}</span>
            </div>
            <button 
              onClick={() => setActiveStory(null)}
              className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video Container */}
          <div className="flex-1 my-4 rounded-2xl overflow-hidden bg-slate-900 relative flex items-center justify-center">
            <video 
              src={activeStory.video_url} 
              className="w-full h-full object-cover"
              autoPlay 
              loop 
              muted 
              playsInline
            />
          </div>

          {/* Footer Action */}
          <div className="pb-4">
            <button 
              style={{ backgroundColor: settings.theme_color }}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Comprar Agora
            </button>
          </div>
        </div>
      )}

      {/* Home Indicator */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-800 rounded-full"></div>
    </div>
  );
};

export default WidgetPreview;