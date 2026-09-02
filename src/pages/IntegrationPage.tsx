import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Store,
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

// ── ÍCONES INTEGRADOS COM FOCO EXCLUSIVO NA ÁREA ÚTIL QUADRADA (32.14 x 32.14) ──

// Ícone 4: Flutuante (Card celular à esquerda + Mão detalhada com clique)
export const FlutuanteIcon = ({ className = "h-11 w-11" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0.0625 32.144531 32.148437" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="flt-328da3bf98"><path d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="flt-2f1ee6ceac"><path d="M 15 15 L 24.394531 15 L 24.394531 24.53125 L 15 24.53125 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="flt-93054d6f5f"><path d="M 16 12.839844 L 17 12.839844 L 17 15 L 16 15 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="flt-0eb371e6fa"><path d="M 12.707031 15 L 15 15 L 15 16 L 12.707031 16 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="flt-d146e84599"><path d="M 5.035156 5.714844 L 14.535156 5.714844 L 14.535156 26.6875 L 5.035156 26.6875 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="flt-75f24c203e"><path d="M 6.640625 5.714844 L 12.894531 5.714844 C 13.320312 5.714844 13.726562 5.882812 14.027344 6.183594 C 14.328125 6.484375 14.5 6.894531 14.5 7.320312 L 14.5 24.949219 C 14.5 25.375 14.328125 25.78125 14.027344 26.082031 C 13.726562 26.382812 13.320312 26.554688 12.894531 26.554688 L 6.640625 26.554688 C 6.214844 26.554688 5.808594 26.382812 5.507812 26.082031 C 5.203125 25.78125 5.035156 25.375 5.035156 24.949219 L 5.035156 7.320312 C 5.035156 6.894531 5.203125 6.484375 5.507812 6.183594 C 5.808594 5.882812 6.214844 5.714844 6.640625 5.714844 Z" clipRule="nonzero"/></clipPath>
    </defs>
    <g clipPath="url(#flt-328da3bf98)">
      <path fill="currentColor" d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <g clipPath="url(#flt-2f1ee6ceac)">
      <path fill="#ffffff" d="M 24.253906 19.597656 C 23.691406 18.625 23.125 17.652344 22.566406 16.675781 C 22.371094 16.335938 22.078125 16.15625 21.695312 16.167969 C 21.320312 16.175781 21.039062 16.367188 20.886719 16.722656 C 20.851562 16.804688 20.820312 16.820312 20.734375 16.773438 C 20.234375 16.5 19.648438 16.703125 19.429688 17.222656 C 19.390625 17.3125 19.359375 17.296875 19.285156 17.269531 C 19.132812 17.214844 18.972656 17.15625 18.816406 17.152344 C 18.464844 17.152344 18.191406 17.308594 18.023438 17.628906 C 18.011719 17.65625 17.980469 17.675781 17.960938 17.695312 C 17.9375 17.671875 17.914062 17.652344 17.898438 17.628906 C 17.871094 17.578125 17.847656 17.527344 17.816406 17.476562 C 17.46875 16.875 17.125 16.273438 16.773438 15.675781 C 16.519531 15.242188 16.070312 15.097656 15.605469 15.289062 C 15.152344 15.472656 14.914062 16.042969 15.132812 16.480469 C 15.3125 16.839844 15.523438 17.183594 15.726562 17.527344 C 16.328125 18.5625 16.929688 19.589844 17.53125 20.625 C 17.566406 20.679688 17.589844 20.742188 17.632812 20.835938 C 17.558594 20.824219 17.527344 20.824219 17.5 20.8125 C 17.207031 20.710938 16.910156 20.617188 16.621094 20.507812 C 16.320312 20.394531 16.019531 20.355469 15.714844 20.472656 C 15.316406 20.628906 15.042969 21.046875 15.050781 21.464844 C 15.058594 21.945312 15.285156 22.304688 15.71875 22.472656 C 16.382812 22.730469 17.050781 22.984375 17.71875 23.238281 C 18.507812 23.539062 19.300781 23.84375 20.09375 24.140625 C 20.6875 24.359375 21.292969 24.375 21.882812 24.164062 C 22.457031 23.957031 22.996094 23.671875 23.476562 23.296875 C 24.007812 22.878906 24.398438 22.363281 24.558594 21.699219 C 24.738281 20.964844 24.640625 20.257812 24.253906 19.597656 Z M 24.289062 21.355469 C 24.222656 21.839844 24.007812 22.261719 23.6875 22.636719 C 23.269531 23.128906 22.714844 23.410156 22.15625 23.6875 C 21.667969 23.933594 21.160156 24.0625 20.617188 23.933594 C 20.351562 23.871094 20.09375 23.777344 19.835938 23.683594 C 18.605469 23.222656 17.378906 22.753906 16.152344 22.289062 C 16.027344 22.242188 15.902344 22.1875 15.78125 22.128906 C 15.476562 21.976562 15.328125 21.648438 15.402344 21.304688 C 15.46875 21 15.757812 20.753906 16.070312 20.730469 C 16.316406 20.714844 16.539062 20.789062 16.761719 20.871094 C 17.25 21.046875 17.734375 21.226562 18.222656 21.40625 C 18.269531 21.421875 18.316406 21.4375 18.367188 21.457031 C 18.375 21.445312 18.382812 21.4375 18.390625 21.425781 C 18.316406 21.296875 18.246094 21.164062 18.171875 21.035156 C 17.46875 19.832031 16.765625 18.628906 16.0625 17.425781 C 15.871094 17.09375 15.671875 16.765625 15.484375 16.433594 C 15.371094 16.230469 15.363281 16.023438 15.488281 15.820312 C 15.613281 15.617188 15.796875 15.535156 16.03125 15.550781 C 16.222656 15.566406 16.363281 15.667969 16.460938 15.832031 C 16.8125 16.4375 17.171875 17.035156 17.523438 17.640625 C 17.875 18.234375 18.21875 18.832031 18.566406 19.429688 C 18.585938 19.460938 18.605469 19.492188 18.625 19.523438 C 18.6875 19.609375 18.761719 19.65625 18.867188 19.601562 C 18.953125 19.558594 18.972656 19.46875 18.910156 19.359375 C 18.828125 19.203125 18.738281 19.054688 18.652344 18.902344 C 18.542969 18.707031 18.425781 18.515625 18.320312 18.320312 C 18.195312 18.074219 18.246094 17.808594 18.449219 17.628906 C 18.636719 17.460938 18.929688 17.425781 19.140625 17.570312 C 19.238281 17.640625 19.316406 17.75 19.382812 17.855469 C 19.59375 18.203125 19.792969 18.554688 19.996094 18.90625 C 20.0625 19.023438 20.160156 19.058594 20.261719 19.003906 C 20.347656 18.957031 20.367188 18.863281 20.300781 18.75 C 20.128906 18.453125 19.953125 18.15625 19.78125 17.855469 C 19.621094 17.578125 19.703125 17.246094 19.972656 17.074219 C 20.238281 16.90625 20.582031 16.976562 20.757812 17.246094 C 20.957031 17.558594 21.140625 17.878906 21.332031 18.199219 C 21.347656 18.222656 21.359375 18.246094 21.375 18.269531 C 21.441406 18.367188 21.53125 18.394531 21.613281 18.34375 C 21.699219 18.292969 21.722656 18.207031 21.660156 18.101562 C 21.539062 17.878906 21.402344 17.667969 21.28125 17.445312 C 21.226562 17.339844 21.175781 17.222656 21.164062 17.105469 C 21.136719 16.835938 21.3125 16.597656 21.566406 16.519531 C 21.808594 16.445312 22.078125 16.539062 22.214844 16.765625 C 22.574219 17.375 22.925781 17.988281 23.285156 18.601562 C 23.511719 18.988281 23.742188 19.378906 23.964844 19.769531 C 24.25 20.261719 24.367188 20.792969 24.289062 21.355469 Z" fillOpacity="1" fillRule="nonzero"/></g>
    <path fill="#ffffff" d="M 15.0625 14.230469 C 14.878906 13.90625 14.695312 13.578125 14.507812 13.257812 C 14.457031 13.171875 14.375 13.136719 14.277344 13.191406 C 14.191406 13.234375 14.160156 13.332031 14.210938 13.429688 C 14.316406 13.617188 14.425781 13.800781 14.535156 13.984375 C 14.617188 14.121094 14.695312 14.257812 14.777344 14.390625 C 14.820312 14.460938 14.886719 14.5 14.964844 14.453125 C 15.019531 14.421875 15.0625 14.371094 15.105469 14.335938 C 15.082031 14.28125 15.078125 14.253906 15.0625 14.230469 Z" fillOpacity="1" fillRule="nonzero"/>
    <g clipPath="url(#flt-93054d6f5f)">
      <path fill="#ffffff" d="M 16.410156 14.234375 C 16.519531 14.273438 16.601562 14.21875 16.636719 14.085938 C 16.707031 13.832031 16.773438 13.574219 16.839844 13.320312 C 16.867188 13.21875 16.886719 13.113281 16.921875 12.976562 C 16.882812 12.941406 16.839844 12.882812 16.785156 12.855469 C 16.707031 12.824219 16.625 12.84375 16.59375 12.933594 C 16.558594 13.03125 16.53125 13.128906 16.507812 13.226562 C 16.4375 13.488281 16.375 13.753906 16.308594 14.019531 C 16.285156 14.117188 16.300781 14.199219 16.410156 14.234375 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <g clipPath="url(#flt-0eb371e6fa)">
      <path fill="#ffffff" d="M 13.9375 15.679688 C 14.050781 15.707031 14.140625 15.632812 14.140625 15.492188 C 14.121094 15.46875 14.085938 15.421875 14.042969 15.375 C 14.03125 15.363281 14.007812 15.359375 13.988281 15.351562 C 13.644531 15.261719 13.300781 15.171875 12.957031 15.082031 C 12.824219 15.046875 12.753906 15.085938 12.726562 15.195312 C 12.699219 15.304688 12.746094 15.363281 12.875 15.398438 C 13.003906 15.433594 13.132812 15.476562 13.261719 15.507812 C 13.488281 15.566406 13.710938 15.628906 13.9375 15.679688 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <path fill="#ffffff" d="M 14.097656 16.933594 C 13.777344 17.113281 13.460938 17.289062 13.144531 17.472656 C 13.042969 17.527344 13.019531 17.617188 13.066406 17.707031 C 13.109375 17.796875 13.1875 17.824219 13.292969 17.765625 C 13.617188 17.589844 13.9375 17.410156 14.257812 17.222656 C 14.300781 17.199219 14.324219 17.140625 14.339844 17.121094 C 14.347656 16.949219 14.222656 16.867188 14.097656 16.933594 Z" fillOpacity="1" fillRule="nonzero"/>
    <path fill="#ffffff" d="M 17.6875 15.121094 C 18.011719 14.941406 18.332031 14.761719 18.652344 14.578125 C 18.695312 14.550781 18.71875 14.496094 18.734375 14.472656 C 18.742188 14.300781 18.617188 14.21875 18.492188 14.289062 C 18.171875 14.464844 17.855469 14.644531 17.539062 14.824219 C 17.4375 14.882812 17.414062 14.96875 17.460938 15.0625 C 17.503906 15.148438 17.582031 15.175781 17.6875 15.121094 Z" fillOpacity="1" fillRule="nonzero"/>
    <g clipPath="url(#flt-d146e84599)">
      <g clipPath="url(#flt-75f24c203e)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 5.035824, 5.705678)" fill="none" strokeLinejoin="miter" d="M 2.196588 0.0125459 L 10.756686 0.0125459 C 11.339478 0.0125459 11.895537 0.242455 12.307234 0.654152 C 12.718932 1.06585 12.954187 1.627255 12.954187 2.210048 L 12.954187 26.339791 C 12.954187 26.922584 12.718932 27.478643 12.307234 27.89034 C 11.895537 28.302037 11.339478 28.537293 10.756686 28.537293 L 2.196588 28.537293 C 1.613796 28.537293 1.057737 28.302037 0.64604 27.89034 C 0.228995 27.478643 -0.00091348 26.922584 -0.00091348 26.339791 L -0.00091348 2.210048 C -0.00091348 1.627255 0.228995 1.06585 0.64604 0.654152 C 1.057737 0.242455 1.613796 0.0125459 2.196588 0.0125459 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
  </svg>
);

// Ícone 1: Carrossel (3 cards verticais idênticos lado a lado)
export const CarrosselIcon = ({ className = "h-11 w-11" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0.0625 32.144531 32.148437" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="car-5834149a83)"><path d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-ede1d607f6)"><path d="M 2.710938 7.652344 L 10.738281 7.652344 L 10.738281 24.457031 L 2.710938 24.457031 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-c987543210)"><path d="M 4.316406 7.664062 L 8.800781 7.664062 C 9.6875 7.664062 10.40625 8.382812 10.40625 9.265625 L 10.40625 23 C 10.40625 23.886719 9.6875 24.605469 8.800781 24.605469 L 4.316406 24.605469 C 3.429688 24.605469 2.710938 23.886719 2.710938 23 L 2.710938 9.265625 C 2.710938 8.382812 3.429688 7.664062 4.316406 7.664062 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-36ee04c3f3)"><path d="M 12.21875 7.652344 L 20 7.652344 L 20 24.457031 L 12.21875 24.457031 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-e2a43ee0f8"><path d="M 13.824219 7.664062 L 18.308594 7.664062 C 19.195312 7.664062 19.914062 8.382812 19.914062 9.265625 L 19.914062 23 C 19.914062 23.886719 19.195312 24.605469 18.308594 24.605469 L 13.824219 24.605469 C 12.9375 24.605469 12.21875 23.886719 12.21875 23 L 12.21875 9.265625 C 12.21875 8.382812 12.9375 7.664062 13.824219 7.664062 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-3c255e1140)"><path d="M 21.695312 7.652344 L 29.71875 7.652344 L 29.71875 24.457031 L 21.695312 24.457031 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="car-0cc25c4ab7)"><path d="M 23.296875 7.664062 L 27.78125 7.664062 C 28.667969 7.664062 29.386719 8.382812 29.386719 9.265625 L 29.386719 23 C 29.386719 23.886719 28.667969 24.605469 27.78125 24.605469 L 23.296875 24.605469 C 22.414062 24.605469 21.695312 23.886719 21.695312 23 L 21.695312 9.265625 C 21.695312 8.382812 22.414062 7.664062 23.296875 7.664062 Z" clipRule="nonzero"/></clipPath>
    </defs>
    <g clipPath="url(#car-5834149a83)">
      <path fill="currentColor" d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <g clipPath="url(#car-ede1d607f6)">
      <g clipPath="url(#car-c987543210)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 2.712225, 7.652416)" fill="none" strokeLinejoin="miter" d="M 2.195739 0.0159409 L 8.333773 0.0159409 C 9.547478 0.0159409 10.531274 0.999737 10.531274 2.208096 L 10.531274 21.007161 C 10.531274 22.220866 9.547478 23.204662 8.333773 23.204662 L 2.195739 23.204662 C 0.982034 23.204662 -0.00176271 22.220866 -0.00176271 21.007161 L -0.00176271 2.208096 C -0.00176271 0.999737 0.982034 0.0159409 2.195739 0.0159409 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#car-36ee04c3f3)">
      <g clipPath="url(#car-e2a43ee0f8)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 12.220342, 7.652416)" fill="none" strokeLinejoin="miter" d="M 2.195322 0.0159409 L 8.333356 0.0159409 C 9.547061 0.0159409 10.530857 0.999737 10.530857 2.208096 L 10.530857 21.007161 C 10.530857 22.220866 9.547061 23.204662 8.333356 23.204662 L 2.195322 23.204662 C 0.981617 23.204662 -0.00217971 22.220866 -0.00217971 21.007161 L -0.00217971 2.208096 C -0.00217971 0.999737 0.981617 0.0159409 2.195322 0.0159409 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#car-3c255e1140)">
      <g clipPath="url(#car-0cc25c4ab7)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 21.693563, 7.652416)" fill="none" strokeLinejoin="miter" d="M 2.19455 0.0159409 L 8.332583 0.0159409 C 9.546289 0.0159409 10.530085 0.999737 10.530085 2.208096 L 10.530085 21.007161 C 10.530085 22.220866 9.546289 23.204662 8.332583 23.204662 L 2.19455 23.204662 C 0.986191 23.204662 0.00239473 22.220866 0.00239473 21.007161 L 0.00239473 2.208096 C 0.00239473 0.999737 0.986191 0.0159409 2.19455 0.0159409 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
  </svg>
);

// Ícone 2: Carrossel Dinâmico (Card centralizado em destaque com brilhos de faísca)
export const CarrosselDinamicoIcon = ({ className = "h-11 w-11" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0.0625 32.144531 32.148437" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="din-f98553cfa5)"><path d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-c62883263b)"><path d="M 2.710938 7.652344 L 10.738281 7.652344 L 10.738281 24.457031 L 2.710938 24.457031 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-44885c3536)"><path d="M 4.316406 7.664062 L 8.800781 7.664062 C 9.6875 7.664062 10.40625 8.382812 10.40625 9.265625 L 10.40625 23 C 10.40625 23.886719 9.6875 24.605469 8.800781 24.605469 L 4.316406 24.605469 C 3.429688 24.605469 2.710938 23.886719 2.710938 23 L 2.710938 9.265625 C 2.710938 8.382812 3.429688 7.664062 4.316406 7.664062 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-478276e71d"><path d="M 11.320312 5.714844 L 20.816406 5.714844 L 20.816406 26.6875 L 11.320312 26.6875 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-7b516e87e3)"><path d="M 12.925781 5.714844 L 19.175781 5.714844 C 19.601562 5.714844 20.011719 5.882812 20.3125 6.183594 C 20.613281 6.484375 20.78125 6.894531 20.78125 7.320312 L 20.78125 24.949219 C 20.78125 25.375 20.613281 25.78125 20.3125 26.082031 C 20.011719 26.382812 19.601562 26.554688 19.175781 26.554688 L 12.925781 26.554688 C 12.5 26.554688 12.089844 26.382812 11.789062 26.082031 C 11.488281 25.78125 11.320312 25.375 11.320312 24.949219 L 11.320312 7.320312 C 11.320312 6.894531 11.488281 6.484375 11.789062 6.183594 C 12.089844 5.882812 12.5 5.714844 12.925781 5.714844 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-420e341ea8"><path d="M 21.695312 7.652344 L 29.71875 7.652344 L 29.71875 24.457031 L 21.695312 24.457031 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-9fe2599d0b"><path d="M 23.296875 7.664062 L 27.78125 7.664062 C 28.667969 7.664062 29.386719 8.382812 29.386719 9.265625 L 29.386719 23 C 29.386719 23.886719 28.667969 24.605469 27.78125 24.605469 L 23.296875 24.605469 C 22.414062 24.605469 21.695312 23.886719 21.695312 23 L 21.695312 9.265625 C 21.695312 8.382812 22.414062 7.664062 23.296875 7.664062 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-c06f921f05"><path d="M 16.589844 0.0625 L 29 0.0625 L 29 9.5625 L 16.589844 9.5625 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-93c10214ea"><path d="M 8 8 L 11 8 L 11 9.5625 L 8 9.5625 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-1eefc4690a"><path d="M 6 0.0625 L 7 0.0625 L 7 1 L 6 1 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-7b89f72ce0"><path d="M 9 0.0625 L 12.929688 0.0625 L 12.929688 5 L 9 5 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-73131a24c6"><path d="M 0.589844 2 L 3 2 L 3 4 L 0.589844 4 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="din-e70773aae1"><rect x="0" width="13" y="0" height="10"/></clipPath>
    </defs>
    <g clipPath="url(#din-f98553cfa5)">
      <path fill="currentColor" d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <g clipPath="url(#din-c62883263b)">
      <g clipPath="url(#din-44885c3536)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 2.712225, 7.652417)" fill="none" strokeLinejoin="miter" d="M 2.195739 0.0159396 L 8.333773 0.0159396 C 9.547478 0.0159396 10.531274 0.999736 10.531274 2.208094 L 10.531274 21.007159 C 10.531274 22.220865 9.547478 23.204661 8.333773 23.204661 L 2.195739 23.204661 C 0.982034 23.204661 -0.00176271 22.220865 -0.00176271 21.007159 L -0.00176271 2.208094 C -0.00176271 0.999736 0.982034 0.0159396 2.195739 0.0159396 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#din-478276e71d)">
      <g clipPath="url(#din-7b516e87e3)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 11.318882, 5.705678)" fill="none" strokeLinejoin="miter" d="M 2.199459 0.0125459 L 10.75421 0.0125459 C 11.339478 0.0125459 11.898408 0.242455 12.310105 0.654152 C 12.721803 1.06585 12.951712 1.627255 12.951712 2.210048 L 12.951712 26.339791 C 12.951712 26.922584 12.721803 27.478643 12.310105 27.89034 C 11.898408 28.302037 11.337003 28.537293 10.75421 28.537293 L 2.199459 28.537293 C 1.616667 28.537293 1.055261 28.302037 0.643564 27.89034 C 0.231867 27.478643 0.00195775 26.922584 0.00195775 26.339791 L 0.00195775 2.210048 C 0.00195775 1.627255 0.231867 1.06585 0.643564 0.654152 C 1.055261 0.242455 1.616667 0.0125459 2.199459 0.0125459 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#din-420e341ea8)">
      <g clipPath="url(#din-9fe2599d0b)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 21.693563, 7.652417)" fill="none" strokeLinejoin="miter" d="M 2.19455 0.0159396 L 8.332583 0.0159396 C 9.546289 0.0159396 10.530085 0.2208094 L 10.530085 21.007159 C 10.530085 22.220865 9.546289 23.204661 8.332583 23.204661 L 2.19455 23.204661 C 0.986191 23.204661 0.00239473 22.220865 0.00239473 21.007159 L 0.00239473 2.208094 C 0.00239473 0.999736 0.986191 0.0159396 2.19455 0.0159396 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#din-c06f921f05)">
      <g transform="matrix(1, 0, 0, 1, 16, -0.000001)">
        <g clipPath="url(#din-e70773aae1)">
          <g clipPath="url(#din-93c10214ea)">
            <path fill="#ffffff" d="M 9.601562 8.007812 C 9.65625 8.777344 9.699219 8.820312 10.46875 8.875 C 9.699219 8.929688 9.65625 8.972656 9.601562 9.742188 C 9.550781 8.972656 9.507812 8.929688 8.738281 8.875 C 9.507812 8.820312 9.550781 8.777344 9.601562 8.007812 Z" fillOpacity="1" fillRule="nonzero"/>
          </g>
          <path fill="#ffffff" d="M 2.414062 7.59375 C 2.441406 7.992188 2.464844 8.015625 2.863281 8.042969 C 2.464844 8.070312 2.441406 8.09375 2.414062 8.492188 C 2.386719 8.089844 2.363281 8.070312 1.964844 8.042969 C 2.363281 8.015625 2.386719 7.992188 2.414062 7.59375 Z" fillOpacity="1" fillRule="nonzero"/>
          <g clipPath="url(#din-1eefc4690a)">
            <path fill="#ffffff" d="M 6.550781 0.964844 C 6.523438 0.566406 6.5 0.542969 6.101562 0.515625 C 6.5 0.488281 6.523438 0.464844 6.550781 0.0664062 C 6.578125 0.464844 6.601562 0.488281 7 0.515625 C 6.601562 0.542969 6.578125 0.566406 6.550781 0.964844 Z" fillOpacity="1" fillRule="nonzero"/>
          </g>
          <g clipPath="url(#din-7b89f72ce0)">
            <path fill="#ffffff" d="M 11.265625 0.964844 C 11.367188 2.445312 11.453125 2.527344 12.929688 2.628906 C 11.453125 2.730469 11.367188 2.8125 11.265625 4.292969 C 11.164062 2.8125 11.082031 2.730469 9.601562 2.628906 C 11.082031 2.527344 11.164062 2.445312 11.265625 0.964844 Z" fillOpacity="1" fillRule="nonzero"/>
          </g>
          <g clipPath="url(#din-73131a24c6)">
            <path fill="#ffffff" d="M 1.421875 2.125 C 1.472656 2.863281 1.515625 2.90625 2.253906 2.957031 C 1.511719 3.007812 1.472656 3.046875 1.421875 3.785156 C 1.371094 3.046875 1.328125 3.003906 0.589844 2.957031 C 1.328125 2.90625 1.371094 2.863281 1.421875 2.125 Z" fillOpacity="1" fillRule="nonzero"/>
          </g>
          <path fill="#ffffff" d="M 6.101562 2.125 C 6.300781 5 6.460938 5.160156 9.339844 5.359375 C 6.460938 5.558594 6.300781 5.71875 6.101562 8.597656 C 5.902344 5.71875 5.742188 5.5625 2.863281 5.359375 C 5.742188 5.160156 5.902344 5 6.101562 2.125 Z" fillOpacity="1" fillRule="nonzero"/>
        </g>
      </g>
    </g>
  </svg>
);

// Ícone 3: Galeria (Layout em grade 2x2 simétrica)
export const GradeIcon = ({ className = "h-11 w-11" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0.0625 32.144531 32.148437" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="grd-8a71bd9a82)"><path d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-90458fc666)"><path d="M 3.214844 3.695312 L 14.765625 3.695312 L 14.765625 15.242188 L 3.214844 15.242188 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-01ecac1835)"><path d="M 4.820312 3.695312 L 13.011719 3.695312 C 13.898438 3.695312 14.617188 4.414062 14.617188 5.300781 L 14.617188 13.59375 C 14.617188 14.480469 13.898438 15.199219 13.011719 15.199219 L 4.820312 15.199219 C 3.933594 15.199219 3.214844 14.480469 3.214844 13.59375 L 3.214844 5.300781 C 3.214844 4.414062 3.933594 3.695312 4.820312 3.695312 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-619051102a)"><path d="M 17.523438 3.695312 L 29 3.695312 L 29 15.242188 L 17.523438 15.242188 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-e191beee68)"><path d="M 19.132812 3.695312 L 27.320312 3.695312 C 28.207031 3.695312 28.929688 4.414062 28.929688 5.300781 L 28.929688 13.59375 C 28.929688 14.480469 28.207031 15.199219 27.320312 15.199219 L 19.132812 15.199219 C 18.242188 15.199219 17.523438 14.480469 17.523438 13.59375 L 17.523438 5.300781 C 17.523438 4.414062 18.242188 3.695312 19.132812 3.695312 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-43fe408327)"><path d="M 3.214844 17.070312 L 14.765625 17.070312 L 14.765625 28.621094 L 3.214844 28.621094 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-8d8d70d659)"><path d="M 4.820312 17.074219 L 13.011719 17.074219 C 13.898438 17.074219 14.617188 17.792969 14.617188 18.679688 L 14.617188 26.96875 C 14.617188 27.859375 13.898438 28.578125 13.011719 28.578125 L 4.820312 28.578125 C 3.933594 28.578125 3.214844 27.859375 3.214844 26.96875 L 3.214844 18.679688 C 3.214844 17.792969 3.933594 17.074219 4.820312 17.074219 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-a92f09777f)"><path d="M 17.523438 17.070312 L 29 17.070312 L 29 28.621094 L 17.523438 28.621094 Z" clipRule="nonzero"/></clipPath>
      <clipPath id="grd-97d8e915f9)"><path d="M 19.132812 17.074219 L 27.320312 17.074219 C 28.207031 17.074219 28.929688 17.792969 28.929688 18.679688 L 28.929688 26.96875 C 28.929688 27.859375 28.207031 28.578125 27.320312 28.578125 L 19.132812 28.578125 C 18.242188 28.578125 17.523438 27.859375 17.523438 26.96875 L 17.523438 18.679688 C 17.523438 17.792969 18.242188 17.074219 19.132812 17.074219 Z" clipRule="nonzero"/></clipPath>
    </defs>
    <g clipPath="url(#grd-8a71bd9a82)">
      <path fill="currentColor" d="M 0 0.0625 L 32.144531 0.0625 L 32.144531 32.210938 L 0 32.210938 Z" fillOpacity="1" fillRule="nonzero"/>
    </g>
    <g clipPath="url(#grd-90458fc666)">
      <g clipPath="url(#grd-01ecac1835)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 3.214588, 3.693415)" fill="none" strokeLinejoin="miter" d="M 2.197852 0.0025979 L 13.409922 0.0025979 C 14.623627 0.0025979 15.607423 0.986394 15.607423 2.200099 L 15.607423 13.551184 C 15.607423 14.76489 14.623627 15.748686 13.409922 15.748686 L 2.197852 15.748686 C 0.984146 15.748686 0.000349922 14.76489 0.000349922 13.551184 L 0.000349922 2.200099 C 0.000349922 0.986394 0.984146 0.0025979 2.197852 0.0025979 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#grd-619051102a)">
      <g clipPath="url(#grd-e191beee68)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 17.524162, 3.693415)" fill="none" strokeLinejoin="miter" d="M 2.201856 0.0025979 L 13.40858 0.0025979 C 14.622285 0.0025979 15.611428 0.986394 15.611428 2.200099 L 15.611428 13.551184 C 15.611428 14.76489 14.622285 15.748686 13.40858 15.748686 L 2.201856 15.748686 C 0.982804 15.748686 -0.000991959 14.76489 -0.000991959 13.551184 L -0.000991959 2.200099 C -0.000991959 0.986394 0.982804 0.0025979 2.201856 0.0025979 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#grd-43fe408327)">
      <g clipPath="url(#grd-8d8d70d659)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 3.214588, 17.071806)" fill="none" strokeLinejoin="miter" d="M 2.197852 0.00330302 L 13.409922 0.00330302 C 14.623627 0.00330302 15.607423 0.987099 15.607423 2.200805 L 15.607423 13.546543 C 15.607423 14.765595 14.623627 15.749391 13.409922 15.749391 L 2.197852 15.749391 C 0.984146 15.749391 0.000349922 14.765595 0.000349922 13.546543 L 0.000349922 2.200805 C 0.000349922 0.987099 0.984146 0.00330302 2.197852 0.00330302 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
    <g clipPath="url(#grd-a92f09777f)">
      <g clipPath="url(#grd-97d8e915f9)">
        <path strokeLinecap="butt" transform="matrix(0.730588, 0, 0, 0.730588, 17.524162, 17.071806)" fill="none" strokeLinejoin="miter" d="M 2.201856 0.00330302 L 13.40858 0.00330302 C 14.622285 0.00330302 15.611428 0.987099 15.611428 2.200805 L 15.611428 13.546543 C 15.611428 14.765595 14.622285 15.749391 13.40858 15.749391 L 2.201856 15.749391 C 0.982804 15.749391 -0.000991959 14.765595 -0.000991959 13.546543 L -0.000991959 2.200805 C -0.000991959 0.987099 0.982804 0.00330302 2.201856 0.00330302 Z" stroke="#ffffff" strokeWidth="0.88" strokeOpacity="1" strokeMiterlimit="4"/>
      </g>
    </g>
  </svg>
);


export const IntegrationPage = () => {
  const { storeId } = useTenant();

  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [installTab, setInstallTab] = useState<'platform' | 'gtm'>('platform');
  const [securityToken, setSecurityToken] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(true);

  const publicUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WIDGET_PUBLIC_URL || '';

    if (envUrl) {
      return String(envUrl).replace(/\/$/, '').trim();
    }

    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '').trim();
    }

    return '';
  }, []);

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
    .replace(/\/$/, '')
    .trim();

  const supabaseAnonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();

  const isLocal =
    publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');

  const hasStoreId = Boolean(storeId);
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
  const canInstall = hasStoreId && hasSupabaseConfig && Boolean(publicUrl);

  const widgetVersion = '2026.08.27-04';

  // Busca o token de segurança da loja
  useEffect(() => {
    let active = true;

    async function fetchToken() {
      if (!supabase || !storeId) {
        setTokenLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('store_settings')
        .select('security_token')
        .eq('store_id', storeId)
        .maybeSingle();

      if (!active) return;

      if (!error && data?.security_token) {
        setSecurityToken(data.security_token);
      }

      setTokenLoading(false);
    }

    fetchToken();

    return () => {
      active = false;
    };
  }, [storeId]);

  const scriptCode = useMemo(() => {
    return `<script>
window.VIDLYTICS_CONFIG = {
  storeId: "${storeId || ''}",
  platform: "custom",
  supabaseUrl: "${supabaseUrl}",
  supabaseAnonKey: "${supabaseAnonKey}",
  widgets: {
    floatingVideo: true,
    carousel: true,
    gallery: true
  }
};

(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/widget.js?v=${widgetVersion}';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;
  }, [storeId, supabaseUrl, supabaseAnonKey, publicUrl, widgetVersion]);

  const trackingScriptCode = useMemo(() => {
    return `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/vidlytics-tracking.js'
    + '?store=${encodeURIComponent(storeId || '')}'
    + '&token=${encodeURIComponent(securityToken)}';
  script.type = 'text/javascript';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  }, [publicUrl, storeId, securityToken]);

  const hasSecurityToken = Boolean(securityToken);
  const trackingReady = canInstall && hasSecurityToken && !tokenLoading;

  const copyToClipboard = async (text: string, onDone: () => void) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      onDone();
    } catch (error) {
      console.error('Erro ao copiar script:', error);
    }
  };

  const handleCopyScript = () => {
    copyToClipboard(scriptCode, () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyTrackingScript = () => {
    copyToClipboard(trackingScriptCode, () => {
      setCopiedTracking(true);
      window.setTimeout(() => setCopiedTracking(false), 2500);
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 dark:border-[#ff7a29]/25 bg-blue-50 dark:bg-[#ff7a29]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29] shadow-xs">
            <Store className="h-3.5 w-3.5" />
            Integração
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Instalação do Vidlytics
          </h1>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">
            Instale o widget na sua loja para exibir vídeos e stories interativos como vídeo flutuante, carrossel e galeria em páginas estratégicas.
          </p>
        </div>
      </div>

      {/* ── ALERTAS DE AMBIENTE ── */}
      {!hasStoreId && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <p className="font-black text-sm uppercase tracking-tight">Loja não identificada</p>
            <p className="mt-0.5 opacity-90 font-medium">
              O <strong>storeId</strong> não foi localizado no contexto da loja. Sem ele, o widget não saberá quais vídeos carregar.
            </p>
          </div>
        </div>
      )}

      {!hasSupabaseConfig && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <p className="font-black text-sm uppercase tracking-tight">Configuração do Supabase ausente</p>
            <p className="mt-0.5 opacity-90 font-medium">
              Verifique se as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> estão configuradas no ambiente.
            </p>
          </div>
        </div>
      )}

      {isLocal && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-black text-sm uppercase tracking-tight">URL pública ausente</p>
            <p className="mt-0.5 opacity-90 font-medium">
              O widget está usando uma URL local. Para funcionar na loja real, configure a variável <strong>VITE_WIDGET_PUBLIC_URL</strong> com o domínio público da aplicação.
            </p>
          </div>
        </div>
      )}

      {/* ── MÓDULOS SUPERIORES: FORMATOS DE VÍDEO (DUAL-THEME) ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card: Flutuante */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="h-11 w-11 overflow-hidden rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4 text-[#0091ff] dark:text-[#ff7a29]">
              <FlutuanteIcon className="h-full w-full" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Flutuante
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Exiba vídeos fixos no canto da tela, ideal para destaques, lançamentos, ofertas e apresentações rápidas de produto.
            </p>
          </div>
        </div>

        {/* Card: Carrossel */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="h-11 w-11 overflow-hidden rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4 text-[#0091ff] dark:text-[#ff7a29]">
              <CarrosselIcon className="h-full w-full" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Carrossel
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Mostre múltiplos vídeos em formato horizontal na Home, páginas de categorias ou diretamente na vitrine de produtos.
            </p>
          </div>
        </div>

        {/* Card: Carrossel Dinâmico */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="h-11 w-11 overflow-hidden rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4 text-[#0091ff] dark:text-[#ff7a29]">
              <CarrosselDinamicoIcon className="h-full w-full" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Carrossel Dinâmico
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Exibição inteligente baseada no comportamento do usuário, produtos navegados e coleções automáticas de alta conversão.
            </p>
          </div>
        </div>

        {/* Card: Galeria */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="h-11 w-11 overflow-hidden rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4 text-[#0091ff] dark:text-[#ff7a29]">
              <GradeIcon className="h-full w-full" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Galeria
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Crie seções em grade completas com vídeos compráveis para destacar looks, depoimentos, provadores e campanhas.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTÕES / TABS DE SELEÇÃO DE INSTALAÇÃO ── */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111524] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setInstallTab('platform')}
            className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              installTab === 'platform'
                ? 'bg-white dark:bg-[#1a1f35] text-[#0091ff] dark:text-[#ff7a29] shadow-md border border-slate-100 dark:border-orange-500/10'
                : 'text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Via Plataforma
          </button>
          <button
            type="button"
            onClick={() => setInstallTab('gtm')}
            className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              installTab === 'gtm'
                ? 'bg-white dark:bg-[#1a1f35] text-[#0091ff] dark:text-[#ff7a29] shadow-md border border-slate-100 dark:border-orange-500/10'
                : 'text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Via Google Tag Manager
          </button>
        </div>
      </div>

      {/* ── SEÇÃO: COMO INSTALAR NA SUA LOJA (FOCADO EXCLUSIVAMENTE NO SCRIPT PRINCIPAL) ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-white/5 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Como instalar na sua loja
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#8a90a0]">
            Três passos simples para ativar a experiência de vídeo commerce no seu e-commerce.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {installTab === 'platform' ? (
            <>
              {/* Passo 1 - Plataforma */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    1
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Acesse o painel da loja
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Abra as configurações do tema da sua plataforma (Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray, etc.) e localize a área de scripts ou HTML personalizado.
                  </p>
                </div>
              </div>

              {/* Passo 2 - Plataforma */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    2
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Cole o Script Principal
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Copie o <strong>Script Principal (Passo 1)</strong> no cabeçalho <code>&lt;head&gt;</code> ou na seção global de scripts para que os widgets e players fiquem ativos em todo o site.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Passo 1 - GTM */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    1
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Acesse o Google Tag Manager
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Abra o contêiner do GTM instalado no seu site e vá para a seção de Tags para adicionar uma nova configuração.
                  </p>
                </div>
              </div>

              {/* Passo 2 - GTM */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    2
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Crie a Tag do Script Principal
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Crie uma tag do tipo <strong>HTML Personalizado</strong>, cole o código do Script Principal dentro dela e configure o gatilho para disparar em todas as páginas (<strong>All Pages</strong>).
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Passo 3 - Comum a ambos */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-6 flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                3
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Publique seus vídeos
              </h3>

              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Faça upload dos vídeos no Vidlytics, configure suas coleções de stories e os vídeos aparecerão automaticamente para seus clientes de acordo com as regras de exibição.
              </p>
            </div>
          </div>
        </div>

        {/* Banner de Direcionamento CSS atualizado conforme solicitado */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#111524]/70 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Precisa customizar o posicionamento ou local de exibição?
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#c0c5d4]">
              A configuração de exibição e os seletores CSS (para escolher exatamente onde os widgets vão renderizar na sua loja) são definidos de forma visual e simples diretamente na tela de <strong>Edição de cada Story</strong> (no menu <strong>Stories</strong>), sem que você precise programar nada no seu tema.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── PASSO 1: SCRIPT PRINCIPAL ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-sm shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
                1
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Script Principal (Widget)
                </h2>
                <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                  Este script carrega o player de vídeo, os stories e os widgets no seu tema. Cole este código dentro da tag <strong>&lt;head&gt;</strong> da sua loja.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyScript}
              disabled={!canInstall}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} className="!text-white" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} className="!text-white" />
                  Copiar Script
                </>
              )}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-[#111524] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#14182b] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8a90a0]">widget.js</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#22c55e] md:text-sm [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10">
              {scriptCode}
            </pre>
          </div>
        </div>

        {/* ── PASSO 2: SCRIPT DE RASTREAMENTO DE VENDAS ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0091ff] dark:bg-[#ff7a29] text-white font-black text-sm shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
                2
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Script de Rastreamento (Vendas)
                  </h2>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Recomendado
                  </span>
                </div>

                {installTab === 'platform' ? (
                  <p className="mt-1.5 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Compatível com <strong>Yampi, Shopify, Nuvemshop, WBuy, Bagy e Tray</strong>. Cole o código abaixo na área de <strong>Scripts / HTML personalizado</strong> da sua plataforma, na página de <strong>Obrigado / Confirmação de Pedido</strong>.
                  </p>
                ) : (
                  <div className="mt-1.5 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    <p>No Google Tag Manager:</p>
                    <ol className="list-decimal list-inside space-y-0.5 mt-1">
                      <li>Crie uma nova tag do tipo <strong>HTML Personalizado</strong></li>
                      <li>Cole o código de rastreamento abaixo dentro dela</li>
                      <li>No gatilho, selecione o evento de compra / transação de sucesso</li>
                      <li>Publique o contêiner do GTM</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyTrackingScript}
              disabled={!trackingReady}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
            >
              {copiedTracking ? (
                <>
                  <CheckCircle2 size={16} className="!text-white" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} className="!text-white" />
                  Copiar Script
                </>
              )}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-[#111524] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#14182b] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8a90a0]">vidlytics-tracking.js</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#22c55e] md:text-sm [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10">
              {trackingScriptCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exportação default obrigatória para satisfazer a importação do App.tsx
export default IntegrationPage;
