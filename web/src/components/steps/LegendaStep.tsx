import { useState, useEffect, useRef } from 'react';
import type { Video } from '../../types';
import { legendaApi } from '../../lib/api';
import type { LegendaStatus } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
}

export function LegendaStep({ video, onSave }: Props) {
  const toast = useToast();
  const [status, setStatus] = useState<LegendaStatus>({ status: 'idle' });
  const [srtContent, setSrtContent] = useState('');
  const [showSrt, setShowSrt] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const existingSrt = video.notas?.match(/\[legenda_srt\]:\s*(.+)/)?.[1]?.trim();

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Load existing SRT content
  useEffect(() => {
    if (existingSrt) {
      legendaApi.getSrt(video.id).then(setSrtContent).catch(() => {});
    }
  }, [existingSrt, video.id]);

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const s = await legendaApi.status(video.id);
        setStatus(s);
        if (s.status === 'done' || s.status === 'error') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (s.status === 'done') {
            toast('Legenda gerada!');
            legendaApi.getSrt(video.id).then(setSrtContent).catch(() => {});
          }
          if (s.status === 'error') toast('Erro ao gerar legenda', 'error');
        }
      } catch {
        // ignore
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    try {
      const s = await legendaApi.start(video.id);
      setStatus(s);
      if (s.status === 'processing') startPolling();
    } catch (err: any) {
      toast(err?.message || 'Erro ao gerar legenda', 'error');
    }
  };

  const hasAvatar = !!video.heygen_file;
  const hasLegenda = !!existingSrt || status.status === 'done';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Legenda</h2>
        <p className="text-sm text-soft">
          O Whisper analisa o audio do avatar e gera a legenda automaticamente com timing sincronizado.
        </p>
      </div>

      {!hasAvatar && (
        <div className="bg-surface-3 border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-soft">Faca o upload do video do avatar primeiro (step 3).</p>
        </div>
      )}

      {hasAvatar && (
        <>
          {/* Status */}
          {status.status === 'processing' && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-accent">{status.progress || 'Processando...'}</span>
              </div>
              <p className="text-xs text-soft mt-2">Isso pode levar 2-5 minutos dependendo da duracao do video.</p>
            </div>
          )}

          {status.status === 'error' && (
            <div className="bg-red/10 border border-red/30 rounded-lg p-4">
              <p className="text-sm text-red font-medium mb-1">Erro ao gerar legenda</p>
              {status.error && (
                <pre className="text-xs text-soft whitespace-pre-wrap">{status.error}</pre>
              )}
            </div>
          )}

          {hasLegenda && srtContent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green font-medium">Legenda gerada!</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSrt(!showSrt)}
                    className="text-xs text-accent hover:text-accent/80 transition"
                  >
                    {showSrt ? 'Esconder' : 'Ver legenda'}
                  </button>
                  <a
                    href={existingSrt || status.srt}
                    download={`${video.titulo || 'legenda'}.srt`}
                    className="text-xs text-accent hover:text-accent/80 transition"
                  >
                    Baixar .srt
                  </a>
                </div>
              </div>

              {showSrt && (
                <pre className="bg-surface-3 border border-border rounded-lg p-4 text-xs text-soft leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
                  {srtContent}
                </pre>
              )}

              <button
                onClick={handleGenerate}
                disabled={status.status === 'processing'}
                className="px-4 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition"
              >
                Gerar novamente
              </button>
            </div>
          ) : status.status !== 'processing' ? (
            <button
              onClick={handleGenerate}
              className="w-full py-3 bg-accent text-bg rounded-xl text-sm font-semibold hover:brightness-110 transition"
            >
              Gerar legenda com Whisper
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
