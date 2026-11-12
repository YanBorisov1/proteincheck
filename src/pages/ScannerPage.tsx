import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeForm } from '../components/BarcodeForm';
import { Icon } from '../components/Icon';
import { Button, Card, PageTitle } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { CameraError, startScanner, type ScanSession } from '../services/barcode';

type Status = 'starting' | 'scanning' | 'found' | 'denied' | 'unavailable' | 'insecure';

export default function ScannerPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScanSession | null>(null);
  const [status, setStatus] = useState<Status>('starting');
  const [code, setCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;
    startScanner(video, (found) => {
      setCode(found);
      setStatus('found');
      navigator.vibrate?.(80);
      sessionRef.current?.stop();
      navigate(`/product/${found}`);
    })
      .then((session) => {
        if (cancelled) {
          session.stop();
          return;
        }
        sessionRef.current = session;
        setTorchSupported(session.torchSupported);
        setStatus((s) => (s === 'found' ? s : 'scanning'));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus(e instanceof CameraError ? e.kind : 'unavailable');
      });
    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [navigate]);

  const toggleTorch = async () => {
    const next = !torch;
    try {
      await sessionRef.current?.setTorch(next);
      setTorch(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const error = status === 'denied' || status === 'unavailable' || status === 'insecure';

  return (
    <div className="space-y-4">
      <PageTitle>{t('scanner.title')}</PageTitle>
      <div className={`relative overflow-hidden rounded-2xl bg-black ${error ? 'hidden' : ''}`}>
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted aria-label={t('scanner.videoLabel')} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="h-1/3 w-4/5 rounded-xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {torchSupported && (
          <button
            type="button"
            onClick={() => void toggleTorch()}
            aria-pressed={torch}
            className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label={torch ? t('scanner.torchOff') : t('scanner.torchOn')}
          >
            <Icon name="flash" />
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className={error ? 'rounded-xl bg-amber-100 p-3 text-amber-950 dark:bg-amber-900 dark:text-amber-50' : 'text-gray-700 dark:text-gray-300'}>
        {status === 'starting' && t('scanner.starting')}
        {status === 'scanning' && t('scanner.instructions')}
        {status === 'found' && t('scanner.found', { code })}
        {status === 'denied' && t('scanner.denied')}
        {status === 'unavailable' && t('scanner.unavailable')}
        {status === 'insecure' && t('scanner.insecure')}
      </p>
      <Card>
        <h2 className="mb-2 font-semibold">{t('scanner.manual')}</h2>
        <BarcodeForm id="scanner-barcode" />
      </Card>
      <Button variant="secondary" className="w-full" onClick={() => navigate('/add?mode=photo')}>
        <Icon name="camera" className="h-5 w-5" /> {t('home.photoLabel')}
      </Button>
    </div>
  );
}
