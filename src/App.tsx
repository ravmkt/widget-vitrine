import StoriesWidgetPage from '@/pages/StoriesWidgetPage';
import StoryDetailsPage from '@/pages/StoryDetailsPage';
import VideoPerformancePage from '@/pages/VideoPerformancePage';
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { TenantProvider } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import SettingsPage from "@/pages/SettingsPage";
import IntegrationPage from "@/pages/IntegrationPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import StoriesPage from "@/pages/StoriesPage";
import VideoGalleryPage from "@/pages/VideoGalleryPage";
import PerformancePage from "@/pages/PerformancePage";
import VideoEditPage from "@/pages/VideoEditPage";
import ProductsPage from "@/pages/ProductsPage";
import MedidasPage from "@/pages/MedidasPage";
import AppearancePage from "@/pages/AppearancePage";
import CommentsPage from "@/pages/CommentsPage";
import StoragePage from "@/pages/StoragePage";
import { BillingPage } from "@/pages/BillingPage";
import { PlansPage } from "@/pages/PlansPage";
import InstagramCallback from "@/pages/auth/InstagramCallback";
import { Toaster } from "sonner";
import StoryPreviewPage from "@/pages/StoryPreviewPage";
import AuthCallbackPage from '@/pages/AuthCallbackPage';

// â”€â”€ Protege rotas que exigem login â”€â”€
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// â”€â”€ Redireciona usuÃ¡rio logado para o dashboard â”€â”€
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// â”€â”€ HomeGuard: redireciona raiz conforme estado do banco â”€â”€
const HomeGuard = () => {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const check = async () => {
      try {
        const settingsArr = await db.generalSettings.getAll();
        if (settingsArr?.length && settingsArr[0]?.store_name) {
          setHasSettings(true);
        } else {
          setHasSettings(false);
        }
      } catch {
        setHasSettings(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasSettings) {
    return <Navigate to="/settings" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// ── App ──
function App() {
  return (
    <TenantProvider>
      <Toaster richColors position="top-center" duration={3000} />
      <BrowserRouter>
        <Routes>
{/* Rotas pÃºblicas */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/api/auth/instagram/callback" element={<InstagramCallback />} />
          <Route path="/auth/instagram/callback" element={<InstagramCallback />} />

          {/* Raiz â†’ verifica estado */}
          <Route path="/" element={<HomeGuard />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />

          {/* â”€â”€ Stories (rotas especÃ­ficas ANTES da genÃ©rica) â”€â”€ */}
          <Route path="/stories/widget" element={<ProtectedRoute><AppLayout><StoriesWidgetPage /></AppLayout></ProtectedRoute>} />
          <Route path="/stories/preview/:id" element={<ProtectedRoute><StoryPreviewPage /></ProtectedRoute>} />
<Route path="/stories/:id" element={<ProtectedRoute><AppLayout><StoryDetailsPage /></AppLayout></ProtectedRoute>} /> 
          <Route path="/stories" element={<ProtectedRoute><AppLayout><StoriesPage /></AppLayout></ProtectedRoute>} />

          {/* â”€â”€ VÃ­deos (rotas especÃ­ficas ANTES das genÃ©ricas) â”€â”€ */}
          <Route path="/videos/performance" element={<ProtectedRoute><AppLayout><PerformancePage /></AppLayout></ProtectedRoute>} />
          <Route path="/videos/:videoId/performance" element={<ProtectedRoute><AppLayout><VideoPerformancePage /></AppLayout></ProtectedRoute>} />
          <Route path="/videos/new" element={<ProtectedRoute><AppLayout><VideoEditPage /></AppLayout></ProtectedRoute>} />
          <Route path="/videos/:id/edit" element={<ProtectedRoute><AppLayout><VideoEditPage /></AppLayout></ProtectedRoute>} />
<Route path="/gallery" element={<Navigate to="/armazenamento" replace />} />

          {/* Produtos, Medidas, AparÃªncia, ComentÃ¡rios */}
<Route path="/produtos" element={<ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/medidas" element={<ProtectedRoute><AppLayout><MedidasPage /></AppLayout></ProtectedRoute>} />
          <Route path="/aparencia" element={<ProtectedRoute><AppLayout><AppearancePage /></AppLayout></ProtectedRoute>} />
          <Route path="/comentarios" element={<ProtectedRoute><AppLayout><CommentsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/storage" element={<ProtectedRoute><AppLayout><StoragePage /></AppLayout></ProtectedRoute>} />
          <Route path="/armazenamento" element={<ProtectedRoute><AppLayout><StoragePage /></AppLayout></ProtectedRoute>} />

          {/* ConfiguraÃ§Ãµes */}
          <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/integration" element={<ProtectedRoute><AppLayout><IntegrationPage /></AppLayout></ProtectedRoute>} />

          {/* Financeiro e Planos */}
          <Route path="/billing" element={<ProtectedRoute><AppLayout><BillingPage /></AppLayout></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><AppLayout><PlansPage /></AppLayout></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;


