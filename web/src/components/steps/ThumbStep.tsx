import type { Video } from '../../types';
import { uploadFile } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
  onReload: () => Promise<void>;
}

function generateThumbnail(video: Video): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, 1280, 720);

    // Grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < 1280; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 0; y < 720; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }

    // Accent sidebar
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    const tomColors: Record<string, string> = { alta: '#22c55e', queda: '#ef4444', neutro: '#f0b429', critico: '#ef4444' };
    const color = tomColors[video.tom] || '#f0b429';
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 6, 720);

    // Logo
    ctx.fillStyle = '#f0b429';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('₿ CRIPTO ANÁLISE', 60, 60);

    // Tom badge
    ctx.fillStyle = color;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(video.tom.toUpperCase(), 60, 100);

    // Title
    ctx.fillStyle = '#e8e6e0';
    ctx.font = 'bold 64px sans-serif';
    const words = video.titulo.split(' ');
    let line = '';
    let y = 280;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > 1100 && line) {
        ctx.fillText(line, 60, y);
        line = word;
        y += 80;
        if (y > 520) break;
      } else {
        line = test;
      }
    }
    if (line && y <= 520) ctx.fillText(line, 60, y);

    // Footer
    ctx.fillStyle = '#6b6a66';
    ctx.font = '18px sans-serif';
    ctx.fillText('ANÁLISE TÉCNICA E ESPECULAÇÃO', 60, 660);

    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export function ThumbStep({ video, onReload }: Props) {
  const toast = useToast();

  const handleGenerate = async () => {
    try {
      const blob = await generateThumbnail(video);
      await uploadFile(video.id, blob, 'thumb');
      toast('Thumbnail gerada!');
      await onReload();
    } catch {
      toast('Erro ao gerar thumbnail', 'error');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(video.id, file, 'thumb');
      toast('Thumbnail enviada!');
      await onReload();
    } catch {
      toast('Erro no upload', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Thumbnail</h2>
        <p className="text-sm text-soft">Gere automaticamente ou envie uma personalizada.</p>
      </div>

      {video.thumb_file && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img src={`${video.thumb_file}?t=${Date.now()}`} alt="Thumbnail" className="w-full max-w-lg" />
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleGenerate} className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
          Gerar thumbnail
        </button>
        <label className="px-5 py-2 bg-surface-3 text-soft rounded-lg text-sm cursor-pointer hover:bg-surface-3/80 transition">
          Enviar custom
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>
    </div>
  );
}
