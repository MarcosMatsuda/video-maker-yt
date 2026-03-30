import type { Video, VideoStatus } from '../../types';
import { STEPS, STATUS_ORDER } from '../../types';

interface StepNavProps {
  video: Video;
  activeStep: VideoStatus;
  onStepClick: (step: VideoStatus) => void;
}

function getStepState(video: Video, stepKey: VideoStatus): 'done' | 'active' | 'todo' {
  const currentIdx = STATUS_ORDER.indexOf(video.status);
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'todo';
}

export function StepNav({ video, activeStep, onStepClick }: StepNavProps) {
  return (
    <div className="w-[200px] shrink-0">
      <div className="space-y-1">
        {STEPS.map((step) => {
          const state = getStepState(video, step.key);
          const isActive = activeStep === step.key;

          return (
            <button
              key={step.key}
              onClick={() => onStepClick(step.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left ${
                isActive
                  ? 'bg-accent/10 text-accent font-medium border border-accent/20'
                  : 'hover:bg-surface-3 text-soft'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  state === 'done'
                    ? 'bg-green/20 text-green'
                    : state === 'active'
                      ? 'bg-accent/20 text-accent'
                      : 'bg-surface-3 text-muted'
                }`}
              >
                {state === 'done' ? '✓' : STATUS_ORDER.indexOf(step.key) + 1}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-surface-2 rounded-lg border border-border">
        <div className="text-xs text-muted uppercase tracking-wider mb-3">Info</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Status</span>
            <span className="text-text capitalize">{video.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Tom</span>
            <span className="text-text capitalize">{video.tom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Duração</span>
            <span className="text-text">{video.duracao_min} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
