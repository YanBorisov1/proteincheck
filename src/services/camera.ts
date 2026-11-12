/** Rear-camera access shared by the barcode scanner and the product photo screen. */

export class CameraError extends Error {
  constructor(public readonly kind: 'denied' | 'unavailable' | 'insecure') {
    super(kind);
    this.name = 'CameraError';
  }
}

export async function openCamera(resolution: { width: number; height: number } = { width: 1280, height: 720 }): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unavailable');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: resolution.width }, height: { ideal: resolution.height } },
    });
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    throw new CameraError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
  }
}

export async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play().catch(() => undefined);
}

export function stopStream(stream: MediaStream | null, video?: HTMLVideoElement | null): void {
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}

/** Grabs the current video frame as a JPEG. */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/jpeg', 0.92));
}
