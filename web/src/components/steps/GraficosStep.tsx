import { useState } from 'react';
import type { Video, ImageSlot } from '../../types';
import { uploadFile } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
  onReload: () => Promise<void>;
}

function gerarPromptImagens(roteiro: string): string {
  return `Analise o roteiro abaixo de um vídeo de análise de criptomoedas e me diga exatamente quais imagens são necessárias para ilustrá-lo.

ROTEIRO:
${roteiro}

Responda SOMENTE com um array JSON, sem texto adicional, sem markdown, sem explicações. Use este formato:
[
  {
    "index": 1,
    "cena": "Descrição curta da cena ou momento do vídeo onde a imagem aparece",
    "tipo": "grafico",
    "prompt": "Descrição do que deve ser a imagem ou como obtê-la"
  }
]

Tipos permitidos: "grafico" (TradingView/chart), "conceitual" (imagem artística/metafórica), "screenshot" (print de notícia ou site), "outro".
Seja específico no campo "prompt" — descreva o que mostrar na imagem.`;
}

export function GraficosStep({ video, onSave, onReload }: Props) {
  const toast = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const lista = video.imagens_lista || [];

  if (!video.roteiro) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Gráficos e imagens</h2>
        <div className="bg-surface-3 border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-soft">Complete o roteiro na etapa anterior antes de definir as imagens.</p>
        </div>
      </div>
    );
  }

  if (lista.length === 0) {
    const prompt = gerarPromptImagens(video.roteiro);

    const handleCopy = () => {
      navigator.clipboard.writeText(prompt);
      toast('Prompt copiado!');
    };

    const handleApply = async () => {
      if (!jsonInput.trim()) { toast('Cole a resposta do Claude', 'error'); return; }
      try {
        // Remove markdown code blocks if present (```json ... ```)
        let cleaned = jsonInput.trim();
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        // Find the first [ and last ] to extract the array
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error();
        cleaned = cleaned.slice(start, end + 1);
        // Fix line breaks inside string values (invalid JSON from copy/paste)
        cleaned = cleaned.replace(/"([^"]*?)"/gs, (match) =>
          match.replace(/\n\s*/g, ' ')
        );

        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error();
        const slots: ImageSlot[] = parsed.map((item: any) => ({
          ...item,
          pulada: false,
          asset_url: null,
        }));
        await onSave({ imagens_lista: slots });
        toast(`${slots.length} imagens identificadas!`);
      } catch {
        toast('JSON inválido — verifique a resposta', 'error');
      }
    };

    const handleSkip = async () => {
      await onSave({
        imagens_lista: [{ index: 0, cena: 'Etapa pulada', tipo: 'outro', prompt: '', pulada: true, asset_url: null }],
      });
    };

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-text mb-1">Gráficos e imagens</h2>
          <p className="text-sm text-soft">
            Cole o prompt no Claude Pro Max para descobrir quantas imagens o vídeo precisa.
          </p>
        </div>

        <div className="bg-surface-3 border border-border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-muted uppercase tracking-wider">Prompt para o Claude</span>
            <button onClick={handleCopy} className="text-xs text-accent hover:text-accent/80 transition">Copiar</button>
          </div>
          <pre className="text-xs text-soft leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
            {prompt}
          </pre>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Cole aqui a resposta do Claude (JSON)</label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={6}
            placeholder='[{"index":1,"cena":"...","tipo":"grafico","prompt":"..."}]'
            className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-xs text-text font-mono placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-y"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={handleApply} className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
            Aplicar lista
          </button>
          <button onClick={handleSkip} className="px-5 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition">
            Pular etapa
          </button>
        </div>
      </div>
    );
  }

  // List with slots
  const handleUploadSlot = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(video.id, file, 'asset');
      const updated = [...lista];
      updated[slotIndex] = { ...updated[slotIndex], asset_url: url, pulada: false };
      await onSave({ imagens_lista: updated });
      toast('Imagem enviada!');
    } catch {
      toast('Erro no upload', 'error');
    }
  };

  const toggleSkip = async (slotIndex: number) => {
    const updated = [...lista];
    updated[slotIndex] = { ...updated[slotIndex], pulada: !updated[slotIndex].pulada };
    await onSave({ imagens_lista: updated });
  };

  const handleReset = async () => {
    if (!confirm('Resetar a lista de imagens?')) return;
    await onSave({ imagens_lista: [] });
  };

  const total = lista.length;
  const done = lista.filter((i) => i.asset_url || i.pulada).length;
  const TIPO_LABEL: Record<string, string> = { grafico: 'Gráfico', conceitual: 'Conceitual', screenshot: 'Screenshot', outro: 'Outro' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text mb-1">Gráficos e imagens</h2>
          <p className="text-sm text-soft">{done}/{total} concluídas</p>
        </div>
        <button onClick={handleReset} className="text-xs text-muted hover:text-soft transition">
          Refazer lista
        </button>
      </div>

      <div className="space-y-3">
        {lista.map((slot, i) => (
          <div
            key={i}
            className={`bg-surface-3 border border-border rounded-lg p-4 transition ${slot.pulada ? 'opacity-40' : ''}`}
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] px-1.5 py-0.5 bg-surface-2 border border-border-2 rounded text-muted">
                    #{slot.index}
                  </span>
                  <span className="text-[11px] text-accent-2">{TIPO_LABEL[slot.tipo] || slot.tipo}</span>
                  {slot.pulada && <span className="text-[11px] text-muted italic">pulada</span>}
                  {slot.asset_url && !slot.pulada && <span className="text-[11px] text-green">enviada</span>}
                </div>
                <p className="text-sm text-text font-medium">{slot.cena}</p>
                <p className="text-xs text-soft italic mt-1">{slot.prompt}</p>
              </div>
              {slot.asset_url && !slot.pulada && (
                <img src={slot.asset_url} alt="" className="w-20 h-14 object-cover rounded-md border border-border-2 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              {!slot.pulada && (
                <label className="flex-1 border border-dashed border-border-2 rounded-md py-2 text-center cursor-pointer text-xs text-muted hover:border-accent/40 transition">
                  {slot.asset_url ? 'Substituir' : 'Enviar imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadSlot(i, e)} />
                </label>
              )}
              <button
                onClick={() => toggleSkip(i)}
                className="px-3 py-1.5 text-xs text-muted border border-border-2 rounded-md hover:bg-surface-2 transition"
              >
                {slot.pulada ? 'Incluir' : 'Pular'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
