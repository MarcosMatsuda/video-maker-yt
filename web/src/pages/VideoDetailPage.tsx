import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { VideoStatus } from '../types';
import { useVideoDetail } from '../hooks/useVideo';
import { videoApi } from '../lib/api';
import { useToast } from '../components/layout/Toast';
import { StepNav } from '../components/layout/StepNav';
import { BriefingStep } from '../components/steps/BriefingStep';
import { RoteiroStep } from '../components/steps/RoteiroStep';
import { AvatarStep } from '../components/steps/AvatarStep';
import { GraficosStep } from '../components/steps/GraficosStep';
import { ThumbStep } from '../components/steps/ThumbStep';
import { MontagemStep } from '../components/steps/MontagemStep';
import { LegendaStep } from '../components/steps/LegendaStep';
import { YoutubeStep } from '../components/steps/YoutubeStep';

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { video, loading, reload, save } = useVideoDetail(id ? Number(id) : null);
  const [activeStep, setActiveStep] = useState<VideoStatus>('briefing');

  // Sync active step with video status on first load
  if (video && activeStep !== video.status && !loading) {
    // Only set once on initial load, keep user navigation free after
  }

  if (loading || !video) {
    return <div className="text-center py-20 text-muted">Carregando...</div>;
  }

  const handleDelete = async () => {
    if (!confirm('Deletar este vídeo?')) return;
    await videoApi.delete(video.id);
    toast('Vídeo deletado');
    navigate('/');
  };

  const stepComponent: Record<VideoStatus, React.ReactNode> = {
    briefing: <BriefingStep video={video} onSave={save} />,
    roteiro: <RoteiroStep video={video} onSave={save} />,
    avatar: <AvatarStep video={video} onSave={save} onReload={reload} />,
    legenda: <LegendaStep video={video} onSave={save} />,
    graficos: <GraficosStep video={video} onSave={save} onReload={reload} />,
    thumb: <ThumbStep video={video} onSave={save} onReload={reload} />,
    montagem: <MontagemStep video={video} onSave={save} />,
    pronto: <YoutubeStep video={video} onSave={save} />,
    publicado: <YoutubeStep video={video} onSave={save} />,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-sm text-muted hover:text-soft transition">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-text">{video.titulo}</h1>
        </div>
        <button onClick={handleDelete} className="px-3 py-1.5 text-xs text-red border border-red/30 rounded-lg hover:bg-red/10 transition">
          Deletar
        </button>
      </div>

      <div className="flex gap-6">
        <StepNav video={video} activeStep={activeStep} onStepClick={setActiveStep} />
        <div className="flex-1 bg-surface-2 border border-border rounded-xl p-6 min-h-[500px]">
          {stepComponent[activeStep]}
        </div>
      </div>
    </div>
  );
}
