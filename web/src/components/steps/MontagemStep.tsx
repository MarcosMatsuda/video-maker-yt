import { useState, useEffect, useRef } from 'react';
import type { Video } from '../../types';
import { montagemApi } from '../../lib/api';
import type { MontagemStatus } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
}

export function MontagemStep({ video, onSave }: Props) {
  const toast = useToast();
  const [status, setStatus] = useState<MontagemStatus>({ status: 'idle' });
  const [notas, setNotas] = useState(video.notas || '');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setNotas(video.notas || ''); }, [video]);

  const [showResult, setShowResult] = useState(true);

  // Check if there's already a final video
  const finalVideo = video.notas?.match(/\[video_final\]:\s*(.+)/)?.[1]?.trim();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const s = await montagemApi.status(video.id);
        setStatus(s);
        if (s.status === 'done' || s.status === 'error') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (s.status === 'done') toast('Video montado!');
          if (s.status === 'error') toast('Erro na montagem', 'error');
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  };

  const handleStart = async () => {
    try {
      const s = await montagemApi.start(video.id);
      setStatus(s);
      if (s.status === 'processing') startPolling();
      if (s.status === 'error') toast('Erro na montagem', 'error');
    } catch (err: any) {
      toast(err?.message || 'Erro ao iniciar montagem', 'error');
    }
  };

  const handleSaveNotas = async () => {
    await onSave({ notas });
    toast('Notas salvas!');
  };

  const hasAvatar = !!video.heygen_file;
  const imageCount = (video.imagens_lista || []).filter((s) => s.asset_url && !s.pulada).length;
  const totalImages = (video.imagens_lista || []).filter((s) => !s.pulada).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Montagem</h2>
        <p className="text-sm text-soft">
          O sistema monta o video final automaticamente: avatar + imagens sobrepostas.
        </p>
      </div>

      {/* Checklist */}
      <div className="bg-surface-3 border border-border rounded-lg p-4 space-y-2">
        <p className="text-[11px] text-muted uppercase tracking-wider mb-2">Pre-requisitos</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${hasAvatar ? 'bg-green' : 'bg-red'}`} />
          <span className="text-sm text-soft">
            Video do avatar {hasAvatar ? '— pronto' : '— pendente (step 3)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${imageCount > 0 ? 'bg-green' : 'bg-yellow'}`} />
          <span className="text-sm text-soft">
            Imagens — {imageCount}/{totalImages} enviadas {imageCount === 0 && '(opcional)'}
          </span>
        </div>
      </div>

      {/* Status */}
      {status.status === 'processing' && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-accent">{status.progress || 'Processando...'}</span>
          </div>
        </div>
      )}

      {status.status === 'error' && (
        <div className="bg-red/10 border border-red/30 rounded-lg p-4">
          <p className="text-sm text-red font-medium mb-1">Erro na montagem</p>
          {status.error && (
            <pre className="text-xs text-soft whitespace-pre-wrap">{status.error}</pre>
          )}
        </div>
      )}

      {((status.status === 'done' && status.output) || finalVideo) && showResult ? (
        <div className="space-y-3">
          <p className="text-sm text-green font-medium">Video final pronto!</p>
          <video
            src={status.output || finalVideo}
            controls
            className="w-full max-w-2xl rounded-lg border border-border"
          />
          <div className="flex gap-3">
            <a
              href={status.output || finalVideo}
              download
              className="inline-block px-4 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition"
            >
              Baixar video final
            </a>
            <button
              onClick={() => { setShowResult(false); setStatus({ status: 'idle' }); }}
              className="px-4 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition"
            >
              Montar novamente
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowResult(true); handleStart(); }}
          disabled={!hasAvatar || status.status === 'processing'}
          className="w-full py-3 bg-accent text-bg rounded-xl text-sm font-semibold hover:brightness-110 transition disabled:opacity-40"
        >
          {status.status === 'processing' ? 'Montando...' : 'Montar video'}
        </button>
      )}

      {/* Notas */}
      <div>
        <label className="block text-xs text-muted mb-1">Notas de montagem</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Anotacoes sobre a montagem, ajustes, etc."
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-y"
        />
        <button onClick={handleSaveNotas} className="mt-2 px-4 py-1.5 bg-surface-3 text-soft rounded-lg text-xs hover:bg-surface-3/80 transition">
          Salvar notas
        </button>
      </div>
    </div>
  );
}
