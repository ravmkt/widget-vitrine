import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from './pages/Index';
import StoriesPage from './pages/StoriesPage';
import StoryDetailsPage from './pages/StoryDetailsPage';
import SettingsPage from './pages/SettingsPage';
import StoriesWidgetPage from './pages/StoriesWidgetPage';
import NotFound from './pages/NotFound';

// Error Boundary robusto para capturar e exibir erros de renderização de forma amigável
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-bold">Ocorreu um erro na renderização</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Um erro inesperado impediu a renderização desta página. Veja os detalhes técnicos abaixo:
            </p>
            <pre className="bg-black/50 p-4 rounded-xl text-xs text-red-400 overflow-auto max-h-60 font-mono mb-6 border border-red-500/10">
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:id" element={<StoryDetailsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/widget" element={<StoriesWidgetPage />} />
          <Route path="/widget/:storeId" element={<StoriesWidgetPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" closeButton />
    </ErrorBoundary>
  );
};

export default App;