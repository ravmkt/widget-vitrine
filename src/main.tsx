import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  const errorDiv = document.createElement("div");
  errorDiv.style.position = "fixed";
  errorDiv.style.inset = "0";
  errorDiv.style.background = "#7f1d1d";
  errorDiv.style.color = "#fef2f2";
  errorDiv.style.padding = "24px";
  errorDiv.style.fontFamily = "sans-serif";
  errorDiv.style.zIndex = "999999";
  errorDiv.innerHTML = `
    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Erro Crítico de Inicialização</h1>
    <p>O elemento com ID 'root' não foi encontrado no documento HTML.</p>
  `;
  document.body.appendChild(errorDiv);
  console.error("Elemento 'root' não encontrado no DOM.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("React montado com sucesso no elemento #root.");
  } catch (error) {
    console.error("Erro ao renderizar o React no elemento #root:", error);
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.inset = "0";
    errorDiv.style.background = "#7f1d1d";
    errorDiv.style.color = "#fef2f2";
    errorDiv.style.padding = "24px";
    errorDiv.style.fontFamily = "sans-serif";
    errorDiv.style.zIndex = "999999";
    errorDiv.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Erro ao Renderizar React</h1>
      <pre style="background: #450a0a; padding: 16px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    `;
    document.body.appendChild(errorDiv);
  }
}