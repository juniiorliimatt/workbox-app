import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

export const IdleMonitor = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isAuthenticated) {
      timerRef.current = setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Configura o timer inicial
    resetTimer();

    // Eventos que indicam que o usuário está ativo
    const events = ['mousemove', 'keydown', 'wheel', 'click', 'touchstart'];
    
    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, logout, location.pathname]);

  return null;
};
