import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos — mesmo valor do backend (Fase 3 / StoreSettings)
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * Reseta o cronômetro a cada interação do usuário. Ao expirar, apenas
 * bloqueia a UI (useAuthStore.lock) — não encerra o caixa nem apaga
 * uma venda em andamento, conforme a regra da especificação.
 */
export function useInactivityTimer(enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lock = useAuthStore((s) => s.lock);

  useEffect(() => {
    if (!enabled) return;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => lock(), TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [enabled, lock]);
}
