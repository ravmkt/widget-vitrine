import React from 'react';

// Error Boundary simples para capturar erros de renderização
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
        <div style={{
          padding: '20px',
          background: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ marginTop: 0 }}>Ocorreu um erro na renderização:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', opacity: 0.8 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <div style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        fontWeight: "bold",
        zIndex: 999999,
        position: "relative",
        fontFamily: "sans-serif",
        gap: "16px",
        padding: "20px",
        textAlign: "center"
      }}>
        <div>🚀 App carregado com sucesso!</div>
        <div style={{ fontSize: "14px", fontWeight: "normal", color: "#9ca3af" }}>
          Se você está vendo esta tela, o React montou com sucesso.
        </div>
        <button 
          onClick={() => {
            // Botão para restaurar a aplicação real e ver se ela quebra
            window.location.reload();
          }}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#6366f1",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Recarregar Página
        </button>
      </div>
    </ErrorBoundary>
  );
};

export default App;