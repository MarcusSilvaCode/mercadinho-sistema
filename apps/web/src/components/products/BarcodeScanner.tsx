import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
}

/**
 * Lê código de barras pela câmera traseira do celular.
 * A biblioteca (zxing) é carregada sob demanda para não pesar nas outras telas.
 * O navegador só libera a câmera em HTTPS (ou localhost).
 */
export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador não permite usar a câmera aqui. Abra o sistema pelo endereço https://.");
        setStarting(false);
        return;
      }

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints);

        const started = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result, _err, ctrl) => {
            if (!result) return;
            ctrl.stop();
            navigator.vibrate?.(80);
            onDetectedRef.current(result.getText());
          },
        );
        if (cancelled) started.stop();
        else controls = started;
      } catch (err) {
        const name = (err as { name?: string })?.name;
        setError(
          name === "NotAllowedError"
            ? "Acesso à câmera negado. Libere a câmera para este site nas configurações do navegador."
            : name === "NotFoundError"
              ? "Nenhuma câmera encontrada neste aparelho."
              : "Não foi possível abrir a câmera. Digite o código abaixo.",
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  if (error) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-ink-900 p-6 text-center text-sm text-white/80">
        <CameraOff size={28} />
        {error}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink-900">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {/* Faixa de mira — só visual, a leitura usa o quadro inteiro */}
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" />
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2 bg-danger-500/80" />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
          Abrindo câmera...
        </div>
      )}
    </div>
  );
}
