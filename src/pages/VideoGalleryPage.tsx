import React from 'react';
import Navbar from '@/components/Navbar';
import { Film, UploadCloud } from 'lucide-react';

const VideoGalleryPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Galeria de Vídeos</h1>
          <p className="text-slate-500 mt-1">
            Gerencie seus arquivos de vídeo para usar em stories e carrosséis.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center max-w-2xl mx-auto">
          <UploadCloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Funcionalidade em Desenvolvimento</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            A galeria de vídeos permitirá o upload e gerenciamento de seus arquivos de mídia.
            Esta funcionalidade requer um backend para armazenamento de arquivos, que não pode ser configurado no modo Build.
            Por enquanto, utilize URLs de vídeo externas para seus stories.
          </p>
          <button
            onClick={() => alert('Esta funcionalidade será implementada em breve!')}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
          >
            <Film className="w-4 h-4" />
            Ver Stories Existentes
          </button>
        </div>
      </main>
    </div>
  );
};

export default VideoGalleryPage;