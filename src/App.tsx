import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";

// Pages - Video Commerce Core
import Dashboard from "./pages/Dashboard";
import StoriesManager from "./pages/StoriesManager";
import VideoGallery from "./pages/VideoGallery";
import StoryEditor from "./pages/StoryEditor";
import StyleModels from "./pages/StyleModels";
import WidgetInstall from "./pages/WidgetInstall";
import WidgetPreview from "./pages/WidgetPreview";

// Pages - Integration Module
import ProductsPage from "./pages/ProductsPage";
import YampiSettings from "./pages/YampiSettings";
import NotFound from "./pages/NotFound";

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
            
            {/* Video Commerce Core */}
            <Route path="/stories" element={<StoriesManager />} />
            <Route path="/stories/new" element={<StoryEditor />} />
            <Route path="/stories/edit/:id" element={<StoryEditor />} />
            <Route path="/videos" element={<VideoGallery />} />
            <Route path="/styles" element={<StyleModels />} />
            
            {/* Widget Management */}
            <Route path="/widget/install" element={<WidgetInstall />} />
            <Route path="/widget/preview" element={<WidgetPreview />} />
            
            {/* Yampi Integration (Secondary) */}
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/settings/yampi" element={<YampiSettings />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;