import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { buildQuery, matchConfidence, queryFromText, type QueryToken } from '../analysis/identify';
import { Icon } from '../components/Icon';
import { Button, Card, PageTitle, linkButton } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { CameraError, attachStream, captureFrame, openCamera, stopStream } from '../services/camera';
import { identifyProduct, type IdentifyResult } from '../services/identify';

type Phase =
  | { kind: 'camera' }
  | { kind: 'cameraError'; reason: CameraError['kind'] }
  | { kind: 'reading'; pct: number }
  | { kind: 'searching' }
  | { kind: 'results'; result: IdentifyResult }
  | { kind: 'unreadable' };

export default function IdentifyPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(initialQuery ? { kind: 'searching' } : { kind: 'camera' });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [words, setWords] = useState(initialQuery);

  const search = useCallback(async (tokens: QueryToken[]) => {
    if (tokens.length === 0) {
      setPhase({ kind: 'unreadable' });
      return;
    }
    setPhase({ kind: 'searching' });
    setPhase({ kind: 'results', result: await identifyProduct(tokens) });
  }, []);

  // Start the camera (unless we arrived with typed words).
  const cameraOn = phase.kind === 'camera';
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    openCamera({ width: 1920, height: 1080 })
      .then(async (stream) => {
        if (cancelled || !videoRef.current) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        await attachStream(videoRef.current, stream);
      })
      .catch((e: unknown) => !cancelled && setPhase({ kind: 'cameraError', reason: e instanceof CameraError ? e.kind : 'unavailable' }));
    return () => {
      cancelled = true;
      stopStream(streamRef.current, videoRef.current);
      streamRef.current = null;
    };
  }, [cameraOn]);

  useEffect(() => {
    if (initialQuery) void search(queryFromText(initialQuery));
  }, [initialQuery, search]);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const readPhoto = async (blob: Blob) => {
    setPhotoUrl(URL.createObjectURL(blob));
    setPhase({ kind: 'reading', pct: 0 });
    try {
      const { recognizeFrontWords } = await import('../services/ocr');
      const ocrWords = await recognizeFrontWords(blob, locale, (status, p) => {
        if (status.startsWith('recognizing')) setPhase({ kind: 'reading', pct: Math.round(p * 100) });
      });
      const tokens = buildQuery(ocrWords);
      setWords(tokens.map((x) => x.token).join(' '));
      await search(tokens);
    } catch {
      setPhase({ kind: 'unreadable' });
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    navigator.vibrate?.(40);
    const blob = await captureFrame(video);
    stopStream(streamRef.current, video);
    streamRef.current = null;
    await readPhoto(blob);
  };

  const retake = () => {
    setPhotoUrl(null);
    setWords('');
    setPhase({ kind: 'camera' });
  };

  const submitWords = (e: FormEvent) => {
    e.preventDefault();
    void search(queryFromText(words));
  };

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="sr-only"
      aria-label={t('identify.choosePhoto')}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          stopStream(streamRef.current, videoRef.current);
          void readPhoto(f);
        }
        e.target.value = '';
      }}
    />
  );

  const wordsForm = (
    <form onSubmit={submitWords} className="space-y-2">
      <label htmlFor="identify-words" className="block text-sm font-medium">{t('identify.wordsLabel')}</label>
      <div className="flex gap-2">
        <input
          id="identify-words"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder={t('identify.wordsPlaceholder')}
          autoComplete="off"
          className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
        />
        <Button type="submit">{t('identify.search')}</Button>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{t('identify.wordsHint')}</p>
    </form>
  );

  return (
    <div className="space-y-4">
      <PageTitle>{t('identify.title')}</PageTitle>
      {fileInput}

      {phase.kind === 'camera' && (
        <>
          <p className="text-gray-700 dark:text-gray-300">{t('identify.instructions')}</p>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted aria-label={t('identify.videoLabel')} />
            <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/70" aria-hidden="true" />
          </div>
          <Button onClick={() => void takePhoto()} className="w-full text-lg">
            <Icon name="camera" /> {t('identify.takePhoto')}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">{t('identify.choosePhoto')}</Button>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>{t('identify.tip1')}</li>
            <li>{t('identify.tip2')}</li>
            <li>{t('identify.tip3')}</li>
          </ul>
        </>
      )}

      {phase.kind === 'cameraError' && (
        <Card className="space-y-3">
          <p role="status" className="rounded-xl bg-amber-100 p-3 text-amber-950 dark:bg-amber-900 dark:text-amber-50">{t(`identify.camera.${phase.reason}`)}</p>
          <Button onClick={() => fileRef.current?.click()} className="w-full"><Icon name="camera" className="h-5 w-5" /> {t('identify.choosePhoto')}</Button>
          {wordsForm}
        </Card>
      )}

      {photoUrl && phase.kind !== 'camera' && (
        <img src={photoUrl} alt={t('identify.yourPhoto')} className="max-h-48 w-full rounded-xl bg-black object-contain" />
      )}

      {phase.kind === 'reading' && (
        <div role="status" className="space-y-2">
          <p>{t('identify.reading', { pct: phase.pct })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden="true">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${phase.pct}%` }} />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('add.ocrFirstRun')}</p>
        </div>
      )}

      {phase.kind === 'searching' && <p role="status">{t('identify.searching')}</p>}

      {phase.kind === 'unreadable' && (
        <Card className="space-y-3">
          <p role="alert" className="font-medium">{t('identify.unreadable')}</p>
          {wordsForm}
          <Button variant="secondary" onClick={retake} className="w-full">{t('identify.retake')}</Button>
        </Card>
      )}

      {phase.kind === 'results' && (
        <Results result={phase.result} wordsForm={wordsForm} onRetake={retake} onPick={(code) => navigate(`/product/${encodeURIComponent(code)}`)} />
      )}
    </div>
  );
}

function Results({ result, wordsForm, onRetake, onPick }: {
  result: IdentifyResult;
  wordsForm: ReactNode;
  onRetake: () => void;
  onPick: (barcode: string) => void;
}) {
  const { t } = useI18n();
  const confidence = matchConfidence(result.matches.map((m) => m.score));
  return (
    <section aria-labelledby="matches-heading" className="space-y-3">
      <Card>{wordsForm}</Card>
      <h2 id="matches-heading" className="text-lg font-semibold">
        {result.matches.length === 0 ? t('identify.noMatches') : t(`identify.confidence.${confidence}`)}
      </h2>
      {result.onlineFailed && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">{t('identify.offline')}</p>}
      {result.matches.length > 0 && <p className="text-sm text-gray-700 dark:text-gray-300">{t('identify.pickHint')}</p>}
      <ul className="space-y-2">
        {result.matches.map(({ candidate: c, score }, i) => (
          <li key={c.barcode}>
            <button
              type="button"
              onClick={() => onPick(c.barcode)}
              className={`flex min-h-[72px] w-full items-center gap-3 rounded-xl border bg-white p-2 text-left dark:bg-gray-900 ${i === 0 && confidence === 'strong' ? 'border-brand-600 ring-2 ring-brand-600' : 'border-gray-200 dark:border-gray-700'}`}
            >
              {c.imageUrl ? (
                <img src={c.imageUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" />
              ) : (
                <span className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.name}</span>
                <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{[c.brand, c.quantity, c.local ? t('identify.fromHistory') : null].filter(Boolean).join(' · ')}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden="true">
                    <span className="block h-full bg-brand-600" style={{ width: `${Math.round(score * 100)}%` }} />
                  </span>
                  {t('identify.matchPct', { pct: Math.round(score * 100) })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Card className="space-y-2">
        <h3 className="font-semibold">{t('identify.notListed')}</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={onRetake}><Icon name="camera" className="h-5 w-5" />{t('identify.retake')}</Button>
          <Link to="/scan" className={linkButton('secondary')}><Icon name="scan" className="h-5 w-5" />{t('identify.useBarcode')}</Link>
          <Link to="/add?mode=photo" className={linkButton('secondary')}><Icon name="edit" className="h-5 w-5" />{t('home.photoLabel')}</Link>
        </div>
      </Card>
    </section>
  );
}
