import { useState, useEffect } from 'react';
import type { Video } from '../../types';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
}

const HEYGEN_LIMIT = 5000;

function gerarPrompt(v: Video): string {
  return `Voce e roteirista de um canal de cripto no YouTube chamado "Cripto Analise".

TITULO: ${v.titulo}
GANCHO: ${v.gancho || '(nao definido)'}
TOM: ${v.tom}
DURACAO: ${v.duracao_min} minutos

LIMITE OBRIGATORIO: O roteiro de narracao deve ter no MAXIMO 4800 caracteres (incluindo espacos). Isso e critico porque o HeyGen tem limite de 5000 caracteres. Conte os caracteres antes de finalizar.

Escreva o roteiro completo para narracao (sem marcacoes de camera/cena). Estrutura:
- Gancho (15s): frase dramatica que prende atencao
- Contexto (90s): o que esta acontecendo, background da historia
- Desenvolvimento (${v.duracao_min > 5 ? '180s' : '120s'}): aprofundamento, dados, analise
- Especulacao (60s): cenarios possiveis, "e se..."
- Conclusao (15s): resumo + CTA ("se inscreve no canal")

Regras:
- Tom conversacional, direto, com personalidade — como um amigo explicando algo no bar
- Use expressoes como "olha so", "repara nisso", "e aqui e onde fica interessante"
- Intercale dados com opiniao e especulacao
- Nunca diga "neste video vamos falar sobre"
- Comece com uma afirmacao forte ou pergunta retorica
- NAO use emojis no roteiro

IMPORTANTE: Separe claramente o roteiro dos metadados do YouTube.

Apos o roteiro, adicione uma linha "---" e depois:
TITULO_YT: (ate 100 caracteres, clickbait com substancia)
DESCRICAO_YT: (2-3 linhas para descricao do YouTube)
TAGS: (10 tags separadas por virgula)`;
}

function separarRoteiro(texto: string): { roteiro: string; tituloYt: string; descricao: string; tags: string } {
  const parts = texto.split(/^---$/m);
  const roteiro = (parts[0] || texto).trim();
  const meta = parts[1] || '';

  const tituloYt = meta.match(/TITULO_YT:\s*(.+)/i)?.[1]?.trim() || '';
  const descricao = meta.match(/DESCRICAO_YT:\s*([\s\S]*?)(?=\nTAGS:|$)/i)?.[1]?.trim() || '';
  const tags = meta.match(/TAGS:\s*(.+)/i)?.[1]?.trim() || '';

  return { roteiro, tituloYt, descricao, tags };
}

export function RoteiroStep({ video, onSave }: Props) {
  const toast = useToast();
  const [textoCompleto, setTextoCompleto] = useState(video.roteiro || '');
  const prompt = gerarPrompt(video);

  useEffect(() => { setTextoCompleto(video.roteiro || ''); }, [video]);

  const { roteiro } = separarRoteiro(textoCompleto);
  const charCount = roteiro.length;
  const overLimit = charCount > HEYGEN_LIMIT;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    toast('Prompt copiado!');
  };

  const handleCopyRoteiro = () => {
    navigator.clipboard.writeText(roteiro);
    toast('Roteiro copiado! Cole no HeyGen.');
  };

  const handleSave = async () => {
    const { tituloYt, descricao, tags } = separarRoteiro(textoCompleto);
    await onSave({
      roteiro: textoCompleto,
      ...(tituloYt && { titulo_yt: tituloYt }),
      ...(descricao && { descricao }),
      ...(tags && { tags }),
    });
    toast('Roteiro salvo!' + (tituloYt ? ' Metadados do YouTube extraidos.' : ''));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Roteiro</h2>
        <p className="text-sm text-soft">
          Copie o prompt abaixo, cole no Claude Pro Max, e depois cole o resultado completo aqui.
        </p>
      </div>

      <div className="bg-surface-3 border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] text-muted uppercase tracking-wider">Prompt para o Claude</span>
          <button onClick={handleCopy} className="text-xs text-accent hover:text-accent/80 transition">
            Copiar
          </button>
        </div>
        <pre className="text-xs text-soft leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {prompt}
        </pre>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-muted">Resultado do Claude</label>
          <div className="flex items-center gap-3">
            {textoCompleto.trim() && (
              <button onClick={handleCopyRoteiro} className="text-xs text-accent hover:text-accent/80 transition">
                Copiar roteiro para HeyGen
              </button>
            )}
            <span className={`text-xs ${overLimit ? 'text-red font-semibold' : 'text-muted'}`}>
              {charCount.toLocaleString()} / {HEYGEN_LIMIT.toLocaleString()}
            </span>
          </div>
        </div>
        <textarea
          value={textoCompleto}
          onChange={(e) => setTextoCompleto(e.target.value)}
          rows={16}
          placeholder="Cole aqui o resultado completo do Claude (roteiro + metadados YouTube)..."
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-y font-mono leading-relaxed"
        />
        {overLimit && (
          <p className="text-xs text-red mt-1">
            Roteiro excede o limite do HeyGen em {(charCount - HEYGEN_LIMIT).toLocaleString()} caracteres. Peca ao Claude para encurtar.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
          Salvar roteiro
        </button>
      </div>
    </div>
  );
}
