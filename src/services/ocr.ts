/**
 * Label OCR with Tesseract.js, loaded on demand. The first run downloads the
 * engine and language data (~10 MB), which the service worker then caches.
 */
export type OcrProgress = (status: string, progress: number) => void;

/** Downscale large photos first: much faster on low-end phones, same accuracy. */
async function prepareImage(file: Blob, maxSide = 1800, invert = false): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && !invert) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.filter = invert ? 'grayscale(1) invert(1) contrast(1.3)' : 'grayscale(1) contrast(1.2)';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/png'));
  } catch {
    return file;
  }
}

export class OcrError extends Error {
  constructor(public readonly kind: 'load' | 'timeout' | 'read') {
    super(kind);
    this.name = 'OcrError';
  }
}

/** Generous limit: the first run downloads ~10 MB on possibly slow mobile data. */
const OCR_TIMEOUT_MS = 180_000;

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

/**
 * Runs `job` with a Tesseract worker. Tesseract can report loading failures only
 * through its error handler (its promise may never settle), so both that and an
 * overall timeout turn into an OcrError instead of an endless spinner.
 */
async function withWorker<T>(langs: string, onProgress: OcrProgress | undefined, job: (w: TesseractWorker) => Promise<T>): Promise<T> {
  const { createWorker } = await import('tesseract.js').catch(() => {
    throw new OcrError('load');
  });
  let worker: TesseractWorker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new OcrError('timeout')), OCR_TIMEOUT_MS);
      (async () => {
        worker = await createWorker(langs, 1, {
          logger: (m: { status: string; progress: number }) => onProgress?.(m.status, m.progress),
          errorHandler: () => reject(new OcrError('load')),
        });
        return job(worker);
      })().then(resolve, (e: unknown) => reject(e instanceof OcrError ? e : new OcrError(worker ? 'read' : 'load')));
    });
  } finally {
    if (timer) clearTimeout(timer);
    void worker?.terminate().catch(() => undefined);
  }
}

/** Tesseract language codes for the app's UI languages. */
const OCR_LANGS: Record<string, string> = { en: 'eng', es: 'spa+eng', de: 'deu+eng', fr: 'fra+eng' };

export async function recognizeLabel(file: Blob, uiLanguage: string, onProgress?: OcrProgress): Promise<string> {
  return withWorker(OCR_LANGS[uiLanguage] ?? 'eng', onProgress, async (worker) => {
    const image = await prepareImage(file);
    const { data } = await worker.recognize(image);
    return data.text;
  });
}

/** Confidently read words with at least three letters. */
export function usefulWordCount(words: FrontWord[]): number {
  return words.filter((w) => w.confidence >= 55 && (w.text.match(/[a-z]/gi) ?? []).length >= 3).length;
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
  const { PSM } = await import('tesseract.js');
  return withWorker(OCR_LANGS[uiLanguage] ?? 'eng', onProgress, async (worker) => {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const read = async (invert: boolean): Promise<FrontWord[]> => {
      const image = await prepareImage(file, 1600, invert);
      const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
      const out: FrontWord[] = [];
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            for (const w of line.words) {
              out.push({ text: w.text, confidence: w.confidence, height: Math.max(0, w.bbox.y1 - w.bbox.y0) });
            }
          }
        }
      }
      return out;
    };
    const words = await read(false);
    // Light text on a coloured pack can come out as "background" after greyscale
    // conversion. If little was read, read the inverted image too and combine.
    if (usefulWordCount(words) < 3) words.push(...(await read(true)));
    return words;
  });
}
