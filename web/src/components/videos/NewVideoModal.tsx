interface NewVideoModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

export function NewVideoModal({ open, onClose, onCreate }: NewVideoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-2 border border-border rounded-xl p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text mb-2">Novo video</h2>
        <p className="text-sm text-soft mb-5">
          A IA vai sugerir ideias de video com base nas noticias mais recentes de Bitcoin.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition">
            Cancelar
          </button>
          <button onClick={onCreate} className="flex-1 px-4 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
            Comecar
          </button>
        </div>
      </div>
    </div>
  );
}
