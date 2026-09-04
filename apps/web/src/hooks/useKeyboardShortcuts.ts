import { useEffect } from "react";

interface ShortcutHandlers {
  onNewSale?: () => void; // F2
  onSearch?: () => void; // F3
  onDiscount?: () => void; // F4
  onFinish?: () => void; // F5
  onCancel?: () => void; // F6
  onChangeQuantity?: () => void; // F7
  onEscape?: () => void; // ESC
}

/**
 * Atalhos globais do PDV. Ignora o disparo quando o foco está em um campo
 * de texto comum (para não capturar teclas durante digitação livre), mas
 * SEMPRE permite ESC — é a saída de emergência de qualquer modal.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handlers.onEscape?.();
        return;
      }

      switch (e.key) {
        case "F2":
          e.preventDefault();
          handlers.onNewSale?.();
          break;
        case "F3":
          e.preventDefault();
          handlers.onSearch?.();
          break;
        case "F4":
          e.preventDefault();
          handlers.onDiscount?.();
          break;
        case "F5":
          e.preventDefault();
          handlers.onFinish?.();
          break;
        case "F6":
          e.preventDefault();
          handlers.onCancel?.();
          break;
        case "F7":
          e.preventDefault();
          handlers.onChangeQuantity?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, handlers]);
}
