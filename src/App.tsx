import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { db } from "@/lib/db";
import SettingsPage from "@/pages/SettingsPage";
import IntegrationPage from "@/pages/IntegrationPage";

// ── Componente que redireciona se o banco estiver zerado ──
const HomeGuard = () => {
  const [checking, setChecking] = useState(true);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
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
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  // Se não tem settings → manda pra Configurações do Sistema
  if (!hasSettings) {
    return <Navigate to="/settings" replace />;
  }

  // Se já tem settings → vai pro Dashboard (ou página principal)
  return <Navigate to="/dashboard" replace />;
};

// ── App ──
function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota raiz → verifica se há settings */}
          <Route path="/" element={<HomeGuard />} />

          {/* Páginas da aplicação */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/integration" element={<IntegrationPage />} />

          {/* Substitua /dashboard pela sua página principal real */}
          <Route
            path="/dashboard"
            element={
              <div className="p-8">
                <h1 className="text-2xl font-black">Dashboard</h1>
                <p>Bem-vindo!</p>
              </div>
            }
          />

          {/* Fallback — qualquer rota não encontrada */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;
