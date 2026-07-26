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
import VideoPerformancePage from "@/pages/VideoPerformancePage";
import ProductsPage from "@/pages/ProductsPage";
import MedidasPage from "@/pages/MedidasPage";
import AppearancePage from "@/pages/AppearancePage";
import CommentsPage from "@/pages/CommentsPage";

// ── Protege rotas que exigem login ──
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

// ── Redireciona usuário logado para o dashboard ──
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

// ── HomeGuard: redireciona raiz conforme estado do banco ──
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

  // Não logado → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logado mas sem settings → setup
  if (!hasSettings) {
    return <Navigate to="/settings" replace />;
  }

  // Logado e com settings → dashboard
  return <Navigate to="/dashboard" replace />;
};

// ── App ──
function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas (só acessa se NÃO estiver logado) */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* Raiz → verifica estado */}
          <Route path="/" element={<HomeGuard />} />

          {/* Rotas protegidas (só acessa se estiver logado) */}
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/stories" element={<ProtectedRoute><AppLayout><StoriesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><AppLayout><VideoGalleryPage /></AppLayout></ProtectedRoute>} />
          <Route path="/videos/performance" element={<ProtectedRoute><AppLayout><VideoPerformancePage /></AppLayout></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/medidas" element={<ProtectedRoute><AppLayout><MedidasPage /></AppLayout></ProtectedRoute>} />
          <Route path="/aparencia" element={<ProtectedRoute><AppLayout><AppearancePage /></AppLayout></ProtectedRoute>} />
          <Route path="/comentarios" element={<ProtectedRoute><AppLayout><CommentsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/integration" element={<ProtectedRoute><AppLayout><IntegrationPage /></AppLayout></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;