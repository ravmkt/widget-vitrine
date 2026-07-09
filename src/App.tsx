import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from './components/AppLayout';

// Importando Páginas
import DashboardPage from './pages/DashboardPage';
import StoriesPage from './pages/StoriesPage';
import VideoGalleryPage from './pages/VideoGalleryPage';
import ProductsPage from './pages/ProductsPage';
import MedidasPage from './pages/MedidasPage';
import AppearancePage from './pages/AppearancePage';
import CommentsPage from './pages/CommentsPage';
import IntegrationPage from './pages/IntegrationPage';
import SettingsPage from './pages/SettingsPage';
import StoryDetailsPage from './pages/StoryDetailsPage';
import StoriesReportPage from './pages/StoriesReportPage';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:id" element={<StoryDetailsPage />} />
          <Route path="/stories/report" element={<StoriesReportPage />} />
          <Route path="/gallery" element={<VideoGalleryPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/medidas" element={<MedidasPage />} />
          <Route path="/appearance" element={<AppearancePage />} />
          <Route path="/comments" element={<CommentsPage />} />
          <Route path="/integration" element={<IntegrationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
      <Toaster richColors position="top-right" closeButton />
    </BrowserRouter>
  );
};

export default App;