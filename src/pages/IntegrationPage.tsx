import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  mainColor?: string; // Cor do fundo (padrão: #0094ea)
  strokeColor?: string; // Cor das linhas/detalhes (padrão: #ffffff)
}

// 1. ÍCONE CARROSSEL (Stories lado a lado)
export const CarouselLayoutIcon: React.FC<IconProps> = ({
  size = 44,
  mainColor = "#0094ea",
  strokeColor = "#ffffff",
  className,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 33.12 41.04"
      fill="none"
      className={className}
      {...props}
    >
      {/* Fundo Principal */}
      <rect width="32.14" height="32.14" rx="4" fill={mainColor} y="0.06" />
      
      {/* Três Cards Verticais */}
      <rect x="3.2" y="8.2" width="6" height="15.8" rx="1.5" stroke={strokeColor} strokeWidth="0.8" />
      <rect x="13.1" y="8.2" width="6" height="15.8" rx="1.5" stroke={strokeColor} strokeWidth="0.8" />
      <rect x="23.0" y="8.2" width="6" height="15.8" rx="1.5" stroke={strokeColor} strokeWidth="0.8" />
    </svg>
  );
};

// 2. ÍCONE DESTAQUE (Stories em evidência com brilho)
export const FeaturedLayoutIcon: React.FC<IconProps> = ({
  size = 44,
  mainColor = "#0094ea",
  strokeColor = "#ffffff",
  className,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 33.12 41.04"
      fill="none"
      className={className}
      {...props}
    >
      {/* Fundo Principal */}
      <rect width="32.14" height="32.14" rx="4" fill={mainColor} y="0.06" />
      
      {/* Card Lateral Esquerdo */}
      <rect x="3.2" y="8.2" width="6" height="15.8" rx="1.5" stroke={strokeColor} strokeWidth="0.8" />
      
      {/* Card Central em Destaque (Maior) */}
      <rect x="11.8" y="6.2" width="8.5" height="19.8" rx="2" stroke={strokeColor} strokeWidth="0.9" />
      
      {/* Card Lateral Direito */}
      <rect x="23.0" y="8.2" width="6" height="15.8" rx="1.5" stroke={strokeColor} strokeWidth="0.8" />
      
      {/* Brilhos / Estrelas (Vetorizados e limpos) */}
      <g fill={strokeColor}>
        <path d="M 25.6 8.0 C 25.6 8.7 25.7 8.8 26.4 8.8 C 25.7 8.9 25.6 9.0 25.6 9.7 C 25.5 9.0 25.5 8.9 24.7 8.8 C 25.5 8.8 25.5 8.7 25.6 8.0 Z" />
        <path d="M 18.4 7.6 C 18.4 8.0 18.4 8.0 18.8 8.0 C 18.4 8.1 18.4 8.1 18.4 8.5 C 18.4 8.1 18.3 8.1 18.0 8.0 C 18.3 8.0 18.4 8.0 18.4 7.6 Z" />
        <path d="M 22.1 2.1 C 22.3 5.0 22.4 5.1 25.3 5.3 C 22.4 5.5 22.3 5.7 22.1 8.6 C 21.9 5.7 21.7 5.5 18.8 5.3 C 21.7 5.1 21.9 5.0 22.1 2.1 Z" />
      </g>
    </svg>
  );
};

// 3. ÍCONE GRID (Grade 2x2)
export const GridLayoutIcon: React.FC<IconProps> = ({
  size = 44,
  mainColor = "#0094ea",
  strokeColor = "#ffffff",
  className,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 33.12 41.04"
      fill="none"
      className={className}
      {...props}
    >
      {/* Fundo Principal */}
      <rect width="32.14" height="32.14" rx="4" fill={mainColor} y="0.06" />
      
      {/* Grid 2x2 */}
      <rect x="3.7" y="4.2" width="10" height="10" rx="2" stroke={strokeColor} strokeWidth="0.8" />
      <rect x="18.0" y="4.2" width="10" height="10" rx="2" stroke={strokeColor} strokeWidth="0.8" />
      <rect x="3.7" y="17.6" width="10" height="10" rx="2" stroke={strokeColor} strokeWidth="0.8" />
      <rect x="18.0" y="17.6" width="10" height="10" rx="2" stroke={strokeColor} strokeWidth="0.8" />
    </svg>
  );
};

// 4. ÍCONE FLUTUANTE (Story flutuante com indicação de clique/tap)
export const FloatingLayoutIcon: React.FC<IconProps> = ({
  size = 44,
  mainColor = "#0094ea",
  strokeColor = "#ffffff",
  className,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 33.12 41.04"
      fill="none"
      className={className}
      {...props}
    >
      {/* Fundo Principal */}
      <rect width="32.14" height="32.14" rx="4" fill={mainColor} y="0.06" />
      
      {/* Card Celular/Widget na Esquerda */}
      <rect x="5.5" y="6.2" width="8.5" height="19.8" rx="2" stroke={strokeColor} strokeWidth="0.9" />
      
      {/* Mão de Clique / Tap Gesture na Direita */}
      <g fill={strokeColor}>
        <path d="M 24.25 19.6 C 23.69 18.63 23.13 17.65 22.57 16.68 C 22.37 16.34 22.08 16.16 21.7 16.17 C 21.32 16.18 21.04 16.37 20.89 16.72 C 20.85 16.8 20.82 16.82 20.73 16.77 C 20.23 16.5 19.65 16.7 19.43 17.22 C 19.39 17.31 19.36 17.3 19.29 17.27 C 19.13 17.21 18.97 17.16 18.82 17.15 C 18.46 17.15 18.19 17.31 18.02 17.63 C 18.01 17.66 17.98 17.68 17.96 17.7 C 17.94 17.67 17.91 17.65 17.9 17.63 C 17.87 17.58 17.85 17.53 17.82 17.48 C 17.47 16.88 17.13 16.27 16.77 15.68 C 16.52 15.24 16.07 15.1 15.61 15.29 C 15.15 15.47 14.91 16.04 15.13 16.48 C 15.31 16.84 15.52 17.18 15.73 17.53 C 16.33 18.56 16.93 19.59 17.53 20.63 C 17.57 20.68 17.59 20.74 17.63 20.84 C 17.56 20.82 17.53 20.82 17.5 20.81 C 17.21 20.71 16.91 20.62 16.62 20.51 C 16.32 20.39 16.02 20.36 15.71 20.47 C 15.32 20.63 15.04 21.05 15.05 21.46 C 15.06 21.95 15.29 22.3 15.72 22.47 C 16.38 22.73 17.05 22.98 17.72 23.24 C 18.51 23.54 19.3 23.84 20.09 24.14 C 20.69 24.36 21.29 24.38 21.88 24.16 C 22.46 23.96 23.0 23.67 23.48 23.3 C 24.01 22.88 24.4 22.36 24.56 21.7 C 24.74 20.96 24.64 20.26 24.25 19.6 Z M 24.29 21.36 C 24.22 21.84 24.01 22.26 23.69 22.64 C 23.27 23.13 22.71 23.41 22.16 23.69 C 21.67 23.93 21.16 24.06 20.62 23.93 C 20.35 23.87 20.09 23.78 19.84 23.68 C 18.61 23.22 17.38 22.75 16.15 22.29 C 16.03 22.24 15.9 22.19 15.78 22.13 C 15.48 21.98 15.33 21.65 15.4 21.3 C 15.47 21 15.76 20.75 16.07 20.73 C 16.32 20.71 16.54 20.79 16.76 20.87 C 17.25 21.05 17.73 21.23 18.22 21.41 C 18.27 21.42 18.32 21.44 18.37 21.46 C 18.38 21.45 18.38 21.44 18.39 21.43 C 18.32 21.3 18.25 21.16 18.17 21.04 C 17.47 19.83 16.77 18.63 16.06 17.43 C 15.87 17.09 15.67 16.77 15.48 16.43 C 15.37 16.23 15.36 16.02 15.49 15.82 C 15.61 15.62 15.8 15.54 16.03 15.55 C 16.22 15.57 16.36 15.67 16.46 15.83 C 16.81 16.44 17.17 17.04 17.52 17.64 C 17.88 18.23 18.22 18.83 18.57 19.43 C 18.59 19.46 18.61 19.49 18.63 19.52 C 18.69 19.61 18.76 19.66 18.87 19.6 C 18.95 19.56 18.97 19.47 18.91 19.36 C 18.83 19.2 18.74 19.05 18.65 18.9 C 18.54 18.71 18.43 18.52 18.32 18.32 C 18.2 18.07 18.25 17.81 18.45 17.63 C 18.64 17.46 18.93 17.43 19.14 17.57 C 19.24 17.64 19.32 17.75 19.38 17.86 C 19.59 18.2 19.79 18.55 20.0 18.91 C 20.06 19.02 20.16 19.06 20.26 19.0 C 20.35 18.96 20.37 18.86 20.3 18.75 C 20.13 18.45 19.95 18.16 19.78 17.86 C 19.62 17.58 19.7 17.25 19.97 17.07 C 20.24 16.91 20.58 16.98 20.76 17.25 C 20.96 17.56 21.14 17.88 21.33 18.2 C 21.35 18.22 21.36 18.25 21.38 18.27 C 21.44 18.37 21.53 18.39 21.61 18.34 C 21.7 18.29 21.72 18.21 21.66 18.1 C 21.54 17.88 21.4 17.67 21.28 17.45 C 21.23 17.34 21.18 17.22 21.16 17.11 C 21.14 16.84 21.31 16.6 21.57 16.52 C 21.81 16.45 22.08 16.54 22.21 16.77 C 22.57 17.38 22.93 17.99 23.29 18.6 C 23.51 18.99 23.74 19.38 23.96 19.77 C 24.25 20.26 24.37 20.79 24.29 21.36 Z" />
        
        {/* Linhas de Interação ao redor do clique */}
        <path d="M 15.06 14.23 C 14.88 13.91 14.7 13.58 14.51 13.26 C 14.46 13.17 14.38 13.14 14.28 13.19 C 14.19 13.23 14.16 13.33 14.21 13.43 C 14.32 13.62 14.43 13.8 14.54 13.98 C 14.62 14.12 14.7 14.26 14.78 14.39 C 14.82 14.46 14.89 14.5 14.96 14.45 C 15.02 14.42 15.06 14.37 15.11 14.34 C 15.08 14.28 15.08 14.25 15.06 14.23 Z" />
        <path d="M 16.41 14.23 C 16.52 14.27 16.6 14.22 16.64 14.09 C 16.71 13.83 16.77 13.57 16.84 13.32 C 16.87 13.22 16.89 13.11 16.92 12.98 C 16.88 12.94 16.84 12.88 16.79 12.86 C 16.71 12.82 16.63 12.84 16.59 12.93 C 16.56 13.03 16.53 13.13 16.51 13.23 C 16.44 13.49 16.38 13.75 16.31 14.02 C 16.29 14.12 16.3 14.2 16.41 14.23 Z" />
        <path d="M 13.94 15.68 C 14.05 15.71 14.14 15.63 14.14 15.49 C 14.12 15.47 14.09 15.42 14.04 15.38 C 14.03 15.36 14.01 15.36 13.99 15.35 C 13.64 15.26 13.3 15.17 12.96 15.08 C 12.82 15.05 12.75 15.09 12.73 15.2 C 12.7 15.3 12.75 15.36 12.88 15.4 C 13.0 15.43 13.13 15.48 13.26 15.51 C 13.49 15.57 13.71 15.63 13.94 15.68 Z" />
        <path d="M 14.1 16.93 C 13.78 17.11 13.46 17.29 13.14 17.47 C 13.04 17.53 13.02 17.62 13.07 17.71 C 13.11 17.8 13.19 17.82 13.29 17.77 C 13.62 17.59 13.94 17.41 14.26 17.22 C 14.3 17.2 14.32 17.14 14.34 17.12 C 14.35 16.95 14.22 16.87 14.1 16.93 Z" />
        <path d="M 17.69 15.12 C 18.01 14.94 18.33 14.76 18.65 14.58 C 18.7 14.55 18.72 14.5 18.73 14.47 C 18.74 14.3 18.62 14.22 18.49 14.29 C 18.17 14.46 17.86 14.64 17.54 14.82 C 17.44 14.88 17.41 14.97 17.46 15.06 C 17.5 15.15 17.58 15.18 17.69 15.12 Z" />
      </g>
    </svg>
  );
};
