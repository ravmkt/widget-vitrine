import React, { useEffect, useState, Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation, // ── Adicionado para ouvir as mudanças de página ──
} from "react-router-dom";
import { TenantProvider } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { MasterAdminRoute } from "@/components/MasterAdminRoute";
import { Toaster } from "sonner";
import LandingPage from "./pages/LandingPage";
import LoginPage from "@/pages/LoginPage";

// ── Lazy-loaded pages (code-splitting) ──
const MasterAdminPage = lazy(() => import("@/pages/MasterAdminPage"));
const StoriesWidgetPage = lazy(() => import("@/pages/StoriesWidgetPage"));
const StoryDetailsPage = lazy(() => import("@/pages/StoryDetailsPage"));
const VideoPerformancePage = lazy(() => import("@/pages/VideoPerformancePage"));
const IndicaGanhaPage = lazy(() =>
  import("@/pages/IndicaGanhaPage").then((m) => ({ default: m.IndicaGanhaPage }))
);
const LiveCommercePage = lazy(() =>
  import("@/pages/LiveCommercePage").then((m) => ({ default: m.LiveCommercePage }))
);
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const IntegrationPage = lazy(() => import("@/pages/IntegrationPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MasterLoginPage = lazy(() => import("@/pages/MasterLoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const StoriesPage = lazy(() => import("@/pages/StoriesPage"));
const PerformancePage = lazy(() => import("@/pages/PerformancePage"));
const VideoEditPage = lazy(() => import("@/pages/VideoEditPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const MedidasPage = lazy(() => import("@/pages/MedidasPage"));
const AppearancePage = lazy(() => import("@/pages/AppearancePage"));
const CommentsPage = lazy(() => import("@/pages/CommentsPage"));
const StoragePage = lazy(() => import("@/pages/StoragePage"));
const BillingPage = lazy(() =>
  import("@/pages/BillingPage").then((m) => ({ default: m.BillingPage }))
);
const PlansPage = lazy(() =>
  import("@/pages/PlansPage").then((m) => ({ default: m.PlansPage }))
);
const InstagramCallback = lazy(() => import("@/pages/auth/InstagramCallback"));
const StoryPreviewPage = lazy(() => import("@/pages/StoryPreviewPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const HelpArticlesPage = lazy(() => import("@/pages/HelpArticlesPage"));

// ── Loader usado durante o carregamento lazy das páginas ──
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff]" />
  </div>
);

// ── Componente que força a rolagem para o topo ao mudar de rota ──
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// ── Protege rotas que exigem login ──
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff]" />
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff]" />
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
  const hostname = window.location.hostname.toLowerCase();
  const isAppSubdomain = hostname.startsWith("app.");

  // Se NÃO for o subdomínio app (ex: vidlytics.com.br ou localhost padrão), exibe a Landing Page
  if (!isAppSubdomain && hostname !== "localhost") {
    return <LandingPage />;
  }

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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff]" />
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
        {/* Adicionado aqui para resetar a posição do scroll em todas as páginas */}
        <ScrollToTop />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/master/login" element={<MasterLoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/api/auth/instagram/callback" element={<InstagramCallback />} />
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />

            {/* Raiz → verifica estado */}
            <Route path="/" element={<HomeGuard />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
            <Route path="/indica-e-ganha" element={<ProtectedRoute><AppLayout><IndicaGanhaPage /></AppLayout></ProtectedRoute>} />

            {/* ── Stories (rotas específicas ANTES da genérica) ── */}
            <Route path="/stories/widget" element={<ProtectedRoute><AppLayout><StoriesWidgetPage /></AppLayout></ProtectedRoute>} />
            <Route path="/stories/preview/:id" element={<ProtectedRoute><StoryPreviewPage /></ProtectedRoute>} />
            <Route path="/stories/:id" element={<ProtectedRoute><AppLayout><StoryDetailsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/stories" element={<ProtectedRoute><AppLayout><StoriesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/live-commerce" element={<ProtectedRoute><AppLayout><LiveCommercePage /></AppLayout></ProtectedRoute>} />

            {/* ── Vídeos (rotas específicas ANTES das genéricas) ── */}
            <Route path="/videos/performance" element={<ProtectedRoute><AppLayout><PerformancePage /></AppLayout></ProtectedRoute>} />
            <Route path="/videos/:videoId/performance" element={<ProtectedRoute><AppLayout><VideoPerformancePage /></AppLayout></ProtectedRoute>} />
            <Route path="/videos/new" element={<ProtectedRoute><AppLayout><VideoEditPage /></AppLayout></ProtectedRoute>} />
            <Route path="/videos/:id/edit" element={<ProtectedRoute><AppLayout><VideoEditPage /></AppLayout></ProtectedRoute>} />
            <Route path="/gallery" element={<Navigate to="/armazenamento" replace />} />

            {/* Produtos, Medidas, Aparência, Comentários */}
            <Route path="/produtos" element={<ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/medidas" element={<ProtectedRoute><AppLayout><MedidasPage /></AppLayout></ProtectedRoute>} />
            <Route path="/aparencia" element={<ProtectedRoute><AppLayout><AppearancePage /></AppLayout></ProtectedRoute>} />
            <Route path="/comentarios" element={<ProtectedRoute><AppLayout><CommentsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/storage" element={<ProtectedRoute><AppLayout><StoragePage /></AppLayout></ProtectedRoute>} />
            <Route path="/armazenamento" element={<ProtectedRoute><AppLayout><StoragePage /></AppLayout></ProtectedRoute>} />

            {/* Configurações */}
            <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/integration" element={<ProtectedRoute><AppLayout><IntegrationPage /></AppLayout></ProtectedRoute>} />

            {/* Financeiro e Planos */}
            <Route path="/billing" element={<ProtectedRoute><AppLayout><BillingPage /></AppLayout></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><AppLayout><PlansPage /></AppLayout></ProtectedRoute>} />

            {/* Suporte */}
            <Route path="/suporte/artigos" element={<ProtectedRoute><AppLayout><HelpArticlesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/suporte" element={<ProtectedRoute><AppLayout><SupportPage /></AppLayout></ProtectedRoute>} />

            {/* Rota Master Admin (God Mode) */}
            <Route path="/master" element={<MasterAdminRoute><MasterAdminPage /></MasterAdminRoute>} />
            <Route path="/admin" element={<Navigate to="/master" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;
