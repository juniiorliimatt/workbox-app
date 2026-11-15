import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { SESSION_ACTIVITY_EVENT } from '@/utils/sessionActivity';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

/** Eventos que indicam usuário ativo + a atividade reportada pela tela (telemetria ao vivo chegando). */
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'wheel', 'click', 'touchstart', SESSION_ACTIVITY_EVENT];

export const IdleMonitor = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<() => void>(() => undefined);
  // `logout` muda de identidade a cada render do AuthProvider (inclusive na renovação do token a cada ~13 min). Se o
  // timer dependesse dela, todo re-render reiniciaria a contagem e o logout por inatividade nunca dispararia.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void logoutRef.current(); // o logout já trata a falha do backend e limpa o estado local
      }, IDLE_TIMEOUT_MS);
    };
    resetRef.current = reset;
    reset();

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      resetRef.current = () => undefined;
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isAuthenticated]);

  // Navegar é ação do usuário: conta como atividade.
  useEffect(() => {
    resetRef.current();
  }, [location.pathname]);

  return null;
};
