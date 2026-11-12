/**
 * Label OCR with Tesseract.js, loaded on demand. The first run downloads the
 * engine and language data (~10 MB), which the service worker then caches.
 */
export type OcrProgress = (status: string, progress: number) => void;

/** Downscale large photos first: much faster on low-end phones, same accuracy. */
async function prepareImage(file: Blob, maxSide = 1800): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.filter = 'grayscale(1) contrast(1.2)';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/png'));
  } catch {
    return file;
  }
}

/** Tesseract language codes for the app's UI languages. */
const OCR_LANGS: Record<string, string> = { en: 'eng', es: 'spa+eng', de: 'deu+eng', fr: 'fra+eng' };

export async function recognizeLabel(file: Blob, uiLanguage: string, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(OCR_LANGS[uiLanguage] ?? 'eng', 1, {
    logger: (m: { status: string; progress: number }) => onProgress?.(m.status, m.progress),
  });
  try {
    const image = await prepareImage(file);
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export interface FrontWord {
  text: string;
  confidence: number;
  height: number;
}

/**
 * Reads the words on the front of a pack, with each word's size and confidence.
 * Uses sparse-text mode, which suits scattered words on packaging better than
 * the default "page of text" mode.
 */
export async function recognizeFrontWords(file: Blob, uiLanguage: string, onProgress?: OcrProgress): Promise<FrontWord[]> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker(OCR_LANGS[uiLanguage] ?? 'eng', 1, {
    logger: (m: { status: string; progress: number }) => onProgress?.(m.status, m.progress),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const image = await prepareImage(file, 1600);
    const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
    const words: FrontWord[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const w of line.words) {
            words.push({ text: w.text, confidence: w.confidence, height: Math.max(0, w.bbox.y1 - w.bbox.y0) });
          }
        }
      }
    }
    return words;
  } finally {
    await worker.terminate();
  }
}
