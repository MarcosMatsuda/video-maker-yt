import { useState, useEffect } from 'react';
import type { Video, Tom } from '../../types';
import { newsApi } from '../../lib/api';
import type { NewsItem } from '../../lib/api';
import { useToast } from '../layout/Toast';

interface Props {
  video: Video;
  onSave: (data: Partial<Video>) => Promise<void>;
}

interface IdeiaVideo {
  titulo: string;
  gancho: string;
  tom: Tom;
  duracao: number;
}

function gerarPromptIdeias(news: NewsItem[]): string {
  const headlines = news.length
    ? news.map((n, i) => `${i + 1}. ${n.titulo} (${n.fonte})`).join('\n')
    : '(sem headlines no momento — use seu conhecimento atual)';

  return `Você é o diretor criativo de um canal de YouTube sobre Bitcoin.

O canal NÃO fala sobre preço subir ou descer. O foco é:
- Histórias fascinantes do Bitcoin (Satoshi, Mt.Gox, o cara do HD no lixão, etc.)
- Como funciona (mineração, halving, lightning network, etc.)
- Impacto no mundo (El Salvador, regulação, bancos centrais)
- Curiosidades e mitos
- Análises educativas que ensinam algo novo

O tom precisa ser HUMANIZADO — como se fosse um amigo explicando algo interessante no bar. Nada de "neste vídeo vamos abordar..." ou linguagem robótica.

Aqui estão as últimas notícias de Bitcoin para contexto:
${headlines}

Gere exatamente 5 ideias de vídeo. Para cada uma, use EXATAMENTE este formato:

---
TITULO: (título chamativo, curto, humano)
GANCHO: (2-3 frases — o drama, a curiosidade, o que vai prender a atenção nos primeiros 5 segundos)
TOM: (alta | queda | neutro | critico)
DURACAO: (3 | 4 | 5)
---

Regras:
- Misture: 2 ideias baseadas nas notícias recentes + 2 históricas/educativas + 1 curiosidade/mito
- Os ganchos devem começar com uma frase forte, pergunta retórica, ou dado surpreendente
- Pense como se estivesse escrevendo o script de um documentário da Netflix sobre Bitcoin
- Varie os tons — nem tudo é "alta" ou "neutro"`;
}

function parseIdeias(texto: string): IdeiaVideo[] {
  // Split by "TITULO:" — works with or without --- separators
  const blocos = texto.split(/(?=TITULO:)/i).filter((b) => b.trim());
  const ideias: IdeiaVideo[] = [];

  for (const bloco of blocos) {
    const titulo = bloco.match(/TITULO:\s*(.+)/i)?.[1]?.trim();
    const ganchoMatch = bloco.match(/GANCHO:\s*([\s\S]*?)(?=\nTOM:)/i);
    const gancho = ganchoMatch?.[1]?.trim();
    const tom = bloco.match(/TOM:\s*(\w+)/i)?.[1]?.trim().toLowerCase();
    const duracao = bloco.match(/DURACAO:\s*(\d+)/i)?.[1]?.trim();

    if (titulo && gancho) {
      ideias.push({
        titulo,
        gancho,
        tom: (['alta', 'queda', 'neutro', 'critico'].includes(tom || '') ? tom : 'neutro') as Tom,
        duracao: Number(duracao) || 8,
      });
    }
  }
  return ideias;
}

export function BriefingStep({ video, onSave }: Props) {
  const toast = useToast();
  const [titulo, setTitulo] = useState(video.titulo);
  const [gancho, setGancho] = useState(video.gancho || '');
  const [tom, setTom] = useState<Tom>(video.tom);
  const [duracao, setDuracao] = useState(video.duracao_min);

  const [modo, setModo] = useState<'form' | 'prompt' | 'parse'>('form');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [respostaClaude, setRespostaClaude] = useState('');
  const [ideias, setIdeias] = useState<IdeiaVideo[]>([]);

  useEffect(() => {
    setTitulo(video.titulo);
    setGancho(video.gancho || '');
    setTom(video.tom);
    setDuracao(video.duracao_min);
  }, [video]);

  const handleGerarIdeias = async () => {
    setLoadingNews(true);
    try {
      const data = await newsApi.list();
      setNews(data);
    } catch {
      setNews([]);
    }
    setLoadingNews(false);
    setModo('prompt');
  };

  const prompt = gerarPromptIdeias(news);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast('Prompt copiado!');
  };

  const handleParseIdeias = () => {
    const parsed = parseIdeias(respostaClaude);
    if (parsed.length === 0) {
      toast('Nenhuma ideia encontrada. Verifique o formato.', 'error');
      return;
    }
    setIdeias(parsed);
    setModo('parse');
  };

  const handleSelectIdeia = (ideia: IdeiaVideo) => {
    setTitulo(ideia.titulo);
    setGancho(ideia.gancho);
    setTom(ideia.tom);
    setDuracao(ideia.duracao);
    setModo('form');
    toast('Ideia selecionada!');
  };

  const handleSave = async () => {
    await onSave({ titulo, gancho, tom, duracao_min: duracao });
    toast('Briefing salvo!');
  };

  // Modo: Escolher ideia
  if (modo === 'parse' && ideias.length > 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-text mb-1">Escolha uma ideia</h2>
          <p className="text-sm text-soft">Clique na ideia que mais te agrada. Você pode editar depois.</p>
        </div>

        <div className="space-y-3">
          {ideias.map((ideia, i) => (
            <button
              key={i}
              onClick={() => handleSelectIdeia(ideia)}
              className="w-full text-left bg-surface-3 border border-border-2 rounded-xl p-4 hover:border-accent/50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text">{ideia.titulo}</h3>
                  <p className="text-sm text-soft mt-1 leading-relaxed">{ideia.gancho}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-muted">
                    {ideia.tom}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-muted">
                    {ideia.duracao}min
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setModo('prompt')}
          className="text-xs text-muted hover:text-soft transition"
        >
          Voltar ao prompt
        </button>
      </div>
    );
  }

  // Modo: Prompt + colar resposta
  if (modo === 'prompt') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-text mb-1">Gerar ideias de video</h2>
          <p className="text-sm text-soft">
            Copie o prompt abaixo, cole no Claude Pro Max, e depois cole a resposta aqui.
          </p>
        </div>

        <div className="bg-surface-3 border border-border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-muted uppercase tracking-wider">Prompt para o Claude</span>
            <button onClick={handleCopyPrompt} className="text-xs text-accent hover:text-accent/80 transition">
              Copiar
            </button>
          </div>
          <pre className="text-xs text-soft leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {prompt}
          </pre>
        </div>

        {news.length > 0 && (
          <div className="bg-surface-3/50 border border-border rounded-lg p-3">
            <span className="text-[11px] text-muted uppercase tracking-wider">
              {news.length} headlines carregadas
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-1">Resposta do Claude</label>
          <textarea
            value={respostaClaude}
            onChange={(e) => setRespostaClaude(e.target.value)}
            rows={12}
            placeholder="Cole aqui a resposta do Claude com as 5 ideias..."
            className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-y font-mono leading-relaxed"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleParseIdeias}
            disabled={!respostaClaude.trim()}
            className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition disabled:opacity-40"
          >
            Ver ideias
          </button>
          <button
            onClick={() => setModo('form')}
            className="px-5 py-2 bg-surface-3 text-soft rounded-lg text-sm hover:bg-surface-3/80 transition"
          >
            Preencher manualmente
          </button>
        </div>
      </div>
    );
  }

  // Modo: Formulário (edição manual)
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Briefing</h2>
        <p className="text-sm text-soft">Defina o angulo e tom do video.</p>
      </div>

      <button
        onClick={handleGerarIdeias}
        disabled={loadingNews}
        className="w-full py-3 border border-dashed border-accent/40 rounded-xl text-sm text-accent hover:bg-accent/5 transition disabled:opacity-40"
      >
        {loadingNews ? 'Buscando noticias...' : 'Gerar ideias com IA'}
      </button>

      <div>
        <label className="block text-xs text-muted mb-1">Titulo interno</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent/50"
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Gancho / angulo dramatico</label>
        <textarea
          value={gancho}
          onChange={(e) => setGancho(e.target.value)}
          rows={4}
          placeholder="Qual e o drama? O que vai prender a atencao do espectador?"
          className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Tom do mercado</label>
          <select
            value={tom}
            onChange={(e) => setTom(e.target.value as Tom)}
            className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent/50"
          >
            <option value="alta">Alta</option>
            <option value="queda">Queda</option>
            <option value="neutro">Neutro</option>
            <option value="critico">Critico</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Duracao estimada</label>
          <select
            value={duracao}
            onChange={(e) => setDuracao(Number(e.target.value))}
            className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent/50"
          >
            <option value={5}>5 minutos</option>
            <option value={8}>8 minutos</option>
            <option value={10}>10 minutos</option>
            <option value={12}>12 minutos</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition"
      >
        Salvar briefing
      </button>
    </div>
  );
}
