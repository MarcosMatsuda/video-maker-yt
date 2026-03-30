import { useState } from 'react';
import type { VideoStatus } from '../types';
import { useVideos } from '../hooks/useVideo';
import { VideoCard } from '../components/videos/VideoCard';

export function VideosPage() {
  const { videos, loading, reload } = useVideos();
  const [filter, setFilter] = useState<VideoStatus | ''>('');

  const filtered = filter ? videos.filter((v) => v.status === filter) : videos;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Vídeos</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as VideoStatus | '')}
          className="px-3 py-1.5 bg-surface-3 border border-border-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent/50"
        >
          <option value="">Todos</option>
          <option value="briefing">Briefing</option>
          <option value="roteiro">Roteiro</option>
          <option value="avatar">Avatar</option>
          <option value="graficos">Gráficos</option>
          <option value="thumb">Thumbnail</option>
          <option value="montagem">Montagem</option>
          <option value="pronto">Pronto</option>
          <option value="publicado">Publicado</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg">Nenhum vídeo ainda.</p>
          <p className="text-muted/60 text-sm mt-1">Crie um novo vídeo para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} onDelete={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
