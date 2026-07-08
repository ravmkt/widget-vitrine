import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import ProductsPage from "./pages/ProductsPage";
import StoriesManager from "./pages/StoriesManager";
import NotFound from "./pages/NotFound";

// Placeholders para páginas restantes
const PlaceholderPage = ({ name }: { name: string }) => (
  <div className="h-full flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
    <div className="h-20 w-20 bg-violet-50 rounded-3xl flex items-center justify-center text-violet-600 mb-6">
      <Code className="h-10 w-10" />
    </div>
    <h2 className="text-2xl font-black text-slate-900 mb-2">{name}</h2>
    <p className="text-slate-500 font-medium max-w-md">Esta funcionalidade está sendo preparada para o seu ambiente. Em breve você poderá gerenciar {name.toLowerCase()} aqui.</p>
  </div>
);

import { Code } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/stories" element={<StoriesManager />} />
            <Route path="/videos" element={<PlaceholderPage name="Galeria de Vídeos" />} />
            <Route path="/stories/new" element={<PlaceholderPage name="Cadastro de Story" />} />
            <Route path="/styles" element={<PlaceholderPage name="Modelos de Estilo" />} />
            <Route path="/settings/yampi" element={<PlaceholderPage name="Configuração Yampi" />} />
            <Route path="/widget/install" element={<PlaceholderPage name="Instalação do Widget" />} />
            <Route path="/widget/preview" element={<PlaceholderPage name="Preview do Widget" />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;