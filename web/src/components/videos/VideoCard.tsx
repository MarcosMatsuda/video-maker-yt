import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Video } from '../../types';
import { TOM_CONFIG } from '../../types';
import { videoApi } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onDelete: () => void;
}

export function VideoCard({ video, onDelete }: Props) {
  const tom = TOM_CONFIG[video.tom];
  const toast = useToast();
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalVideo = video.notas?.match(/\[video_final\]:\s*(.+)/)?.[1]?.trim();
  const previewSrc = finalVideo || video.heygen_file;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Deletar "${video.titulo}"?`)) return;
    await videoApi.delete(video.id);
    toast('Video deletado');
    onDelete();
  };

  const handleMouseEnter = () => {
    if (!previewSrc) return;
    hoverTimeout.current = setTimeout(() => {
      setHovering(true);
      videoRef.current?.play().catch(() => {});
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link
      to={`/video/${video.id}`}
      className="bg-surface-2 border border-border rounded-xl overflow-hidden hover:border-border-2 transition group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-red/80 transition opacity-0 group-hover:opacity-100"
        title="Deletar"
      >
        x
      </button>

      {/* Thumbnail / Preview */}
      <div className="aspect-video bg-surface-3 relative overflow-hidden">
        {/* Thumbnail image (always rendered as base) */}
        {video.thumb_file ? (
          <img src={video.thumb_file} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-3xl">
            B
          </div>
        )}

        {/* Video preview on hover */}
        {previewSrc && (
          <video
            ref={videoRef}
            src={previewSrc}
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovering ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Tom badge */}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface/80 backdrop-blur ${tom.color}`}
        >
          {tom.label}
        </span>

        {/* Play icon hint */}
        {previewSrc && !hovering && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[14px] border-l-white border-y-[8px] border-y-transparent ml-1" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-text truncate group-hover:text-accent transition">
          {video.titulo}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-3 text-muted capitalize">
            {video.status}
          </span>
          <span className="text-[11px] text-muted">
            {new Date(video.criado_em).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </Link>
  );
}
