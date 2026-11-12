/**
 * Camera barcode scanning: native BarcodeDetector where available (Chrome/Android),
 * falling back to @zxing/browser (loaded lazily so it doesn't weigh down first load).
 */

interface DetectedBarcode {
  rawValue: string;
}
interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

function nativeCtor(): BarcodeDetectorCtor | undefined {
  const w = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector;
}

export async function hasNativeDetector(): Promise<boolean> {
  const Ctor = nativeCtor();
  if (!Ctor) return false;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? FORMATS;
    return formats.some((f) => f.startsWith('ean'));
  } catch {
    return false;
  }
}

export interface ScanSession {
  stop(): void;
  /** Whether the active camera exposes a torch. */
  torchSupported: boolean;
  setTorch(on: boolean): Promise<void>;
}

export class CameraError extends Error {
  constructor(public readonly kind: 'denied' | 'unavailable' | 'insecure') {
    super(kind);
    this.name = 'CameraError';
  }
}

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unavailable');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    throw new CameraError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
  }
}

/** Starts scanning into `video`; calls onDetect once with the first valid code. */
export async function startScanner(video: HTMLVideoElement, onDetect: (code: string) => void): Promise<ScanSession> {
  const stream = await openCamera();
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play().catch(() => undefined);
  const track = stream.getVideoTracks()[0];
  const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities;
  let stopped = false;
  let detected = false;
  const emit = (code: string) => {
    if (detected || stopped || !/^\d{6,14}$/.test(code)) return;
    detected = true;
    onDetect(code);
  };

  let stopZxing: (() => void) | undefined;
  const Ctor = nativeCtor();
  if (Ctor && (await hasNativeDetector())) {
    const detector = new Ctor({ formats: FORMATS });
    const loop = async () => {
      if (stopped || detected) return;
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const first = codes[0];
          if (first) emit(first.rawValue);
        } catch {
          /* frame not ready */
        }
      }
      window.setTimeout(() => void loop(), 150);
    };
    void loop();
  } else {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromStream(stream, video, (result) => {
      if (result) emit(result.getText());
    });
    stopZxing = () => controls.stop();
  }

  return {
    torchSupported: caps.torch === true,
    async setTorch(on: boolean) {
      if (!track) return;
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    },
    stop() {
      stopped = true;
      stopZxing?.();
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}
