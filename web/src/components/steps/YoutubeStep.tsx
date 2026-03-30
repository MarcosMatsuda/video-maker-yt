import { useState, useEffect } from 'react';
import type { Video } from '../../types';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
}

export function YoutubeStep({ video, onSave }: Props) {
  const toast = useToast();
  const [tituloYt, setTituloYt] = useState(video.titulo_yt || '');
  const [descricao, setDescricao] = useState(video.descricao || '');
  const [tags, setTags] = useState(video.tags || '');

  useEffect(() => {
    setTituloYt(video.titulo_yt || '');
    setDescricao(video.descricao || '');
    setTags(video.tags || '');
  }, [video]);

  const handleSave = async () => {
    await onSave({ titulo_yt: tituloYt, descricao, tags });
    toast('Dados do YouTube salvos!');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">YouTube</h2>
        <p className="text-sm text-soft">
          Preencha os dados para publicar no{' '}
          <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-accent-2 hover:underline">
            YouTube Studio
          </a>
          .
        </p>
      </div>

      <div>
        <label className="flex justify-between text-xs text-muted mb-1">
          <span>Título do YouTube</span>
          <span>{tituloYt.length}/100</span>
        </label>
        <input
          value={tituloYt}
          onChange={(e) => setTituloYt(e.target.value.slice(0, 100))}
          placeholder="Título clickbait com substância"
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Descrição</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={6}
          placeholder="Descrição do vídeo para o YouTube..."
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-y"
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Tags (separadas por vírgula)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="bitcoin, btc, cripto, análise técnica"
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
        />
      </div>

      <button onClick={handleSave} className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
        Salvar dados YouTube
      </button>
    </div>
  );
}
