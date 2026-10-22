import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
}

const CAMERA_KEY = "cadastro-rapido:camera";

function readSavedCamera(): string {
  try {
    return localStorage.getItem(CAMERA_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCamera(id: string) {
  try {
    localStorage.setItem(CAMERA_KEY, id);
  } catch {
    // armazenamento bloqueado — só perde a conveniência de lembrar a câmera
  }
}

/**
 * Lê código de barras pela câmera (traseira, no celular).
 * A biblioteca (zxing) é carregada sob demanda para não pesar nas outras telas.
 * O navegador só libera a câmera em HTTPS (ou localhost).
 * Com mais de uma câmera (notebook com câmera virtual, celular com várias lentes)
 * aparece um seletor; a escolha fica lembrada neste aparelho.
 */
export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState(readSavedCamera);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    setError(null);
    setStarting(true);

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
        // Execução já descartada (StrictMode monta o efeito duas vezes, ou trocou de câmera):
        // não abrir a câmera — o stop() dela limparia o <video> da execução que vale
        if (cancelled) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints);

        const video: MediaTrackConstraints = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: { ideal: "environment" } };

        const stream = await navigator.mediaDevices.getUserMedia({ video });
        if (cancelled) {
          // Só desliga a câmera desta execução, sem mexer no <video> (que pode já ser de outra)
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        controls = await reader.decodeFromStream(stream, videoRef.current!, (result, _err, ctrl) => {
          if (!result) return;
          ctrl.stop();
          navigator.vibrate?.(80);
          onDetectedRef.current(result.getText());
        });
        if (cancelled) {
          controls.stop();
          return;
        }

        // Os nomes das câmeras só aparecem depois que a permissão foi concedida
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCameras(devices.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (cameraId && (name === "OverconstrainedError" || name === "NotFoundError")) {
          // Câmera lembrada não existe mais — volta para a padrão
          saveCamera("");
          if (!cancelled) setCameraId("");
          return;
        }
        setError(
          name === "NotAllowedError"
            ? "Acesso à câmera negado. Libere a câmera para este site nas configurações do navegador."
            : name === "NotFoundError"
              ? "Nenhuma câmera encontrada neste aparelho."
              : name === "NotReadableError"
                ? "A câmera está sendo usada por outro programa. Feche-o e tente de novo."
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
  }, [cameraId]);

  function handleCameraChange(id: string) {
    saveCamera(id);
    setCameraId(id);
  }

  if (error) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-ink-900 p-6 text-center text-sm text-white/80">
        <CameraOff size={28} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink-900">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
        {/* Faixa de mira — só visual, a leitura usa o quadro inteiro */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" />
        <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2 bg-danger-500/80" />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Abrindo câmera...
          </div>
        )}
      </div>

      {cameras.length > 1 && (
        <select
          value={cameraId}
          onChange={(e) => handleCameraChange(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-sm text-ink-700"
        >
          <option value="">Câmera padrão</option>
          {cameras.map((c, i) => (
            <option key={c.deviceId} value={c.deviceId}>
              {c.label || `Câmera ${i + 1}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
