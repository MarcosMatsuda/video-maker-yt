import { useState, useEffect } from 'react';
import type { Video } from '../../types';
import { uploadFile } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
  onReload: () => Promise<void>;
}

export function AvatarStep({ video, onSave, onReload }: Props) {
  const toast = useToast();
  const [heygenUrl, setHeygenUrl] = useState(video.heygen_url || '');

  useEffect(() => { setHeygenUrl(video.heygen_url || ''); }, [video]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(video.id, file, 'video');
      toast('Vídeo enviado!');
      await onReload();
    } catch {
      toast('Erro no upload', 'error');
    }
  };

  const handleSaveUrl = async () => {
    await onSave({ heygen_url: heygenUrl });
    toast('Link salvo!');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Avatar (HeyGen)</h2>
        <p className="text-sm text-soft">
          Acesse{' '}
          <a href="https://heygen.com" target="_blank" rel="noreferrer" className="text-accent-2 hover:underline">
            heygen.com
          </a>
          , cole o roteiro, gere o vídeo e baixe o MP4. Faça upload aqui.
        </p>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Link do HeyGen (opcional)</label>
        <div className="flex gap-2">
          <input
            value={heygenUrl}
            onChange={(e) => setHeygenUrl(e.target.value)}
            placeholder="https://heygen.com/..."
            className="flex-1 px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
          />
          <button onClick={handleSaveUrl} className="px-4 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition">
            Salvar
          </button>
        </div>
      </div>

      {video.heygen_file ? (
        <div>
          <p className="text-xs text-green mb-2">Vídeo enviado</p>
          <video src={video.heygen_file} controls className="w-full max-w-md rounded-lg border border-border" />
        </div>
      ) : (
        <label className="block border border-dashed border-border-2 rounded-lg p-8 text-center cursor-pointer hover:border-accent/40 transition">
          <span className="text-sm text-muted">🎭 Clique ou arraste o MP4 do avatar aqui</span>
          <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
        </label>
      )}
    </div>
  );
}
