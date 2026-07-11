"use client";

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from './components/AppLayout';
import SessionGate from './components/SessionGate';

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
import VideoPerformancePage from './pages/VideoPerformancePage';
import VideoEditPage from './pages/VideoEditPage';
import StoryPreviewPage from './pages/StoryPreviewPage';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/stories/preview/:id" element={<StoryPreviewPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <SessionGate>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/stories" element={<StoriesPage />} />
                  <Route path="/stories/new" element={<StoryDetailsPage />} />
                  <Route path="/stories/:id" element={<StoryDetailsPage />} />
                  <Route path="/gallery" element={<VideoGalleryPage />} />
                  <Route path="/videos/new" element={<VideoEditPage />} />
                  <Route path="/videos/:id/edit" element={<VideoEditPage />} />
                  <Route path="/videos/performance" element={<VideoPerformancePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/medidas" element={<MedidasPage />} />
                  <Route path="/appearance" element={<AppearancePage />} />
                  <Route path="/comments" element={<CommentsPage />} />
                  <Route path="/integration" element={<IntegrationPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </SessionGate>
          }
        />
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </BrowserRouter>
  );
};

export default App;