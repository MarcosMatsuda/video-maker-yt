const GUIDE_STEPS = [
  { title: 'Briefing', desc: 'Defina o título, gancho dramático, tom do mercado e duração. Pense no que vai prender a atenção logo nos primeiros segundos.' },
  { title: 'Roteiro', desc: 'Copie o prompt gerado e cole no Claude Pro Max. Ele vai criar o roteiro completo com a estrutura ideal para o vídeo. Cole o resultado de volta no CRM.' },
  { title: 'Avatar (HeyGen)', desc: 'Acesse heygen.com, cole o roteiro, gere o vídeo com o avatar e baixe o MP4. Faça upload aqui.' },
  { title: 'Gráficos', desc: 'O sistema diz quantas imagens o vídeo precisa. Tire screenshots do TradingView, gere imagens no DALL-E ou Midjourney. Upload cada uma no slot correspondente.' },
  { title: 'Thumbnail', desc: 'Gere automaticamente uma thumbnail baseada no título e tom, ou envie uma personalizada.' },
  { title: 'Montagem', desc: 'Copie o comando FFmpeg gerado e rode no terminal para montar o vídeo final com overlay de gráficos e música de fundo.' },
  { title: 'YouTube', desc: 'Preencha título, descrição e tags. Depois faça o upload manual no YouTube Studio.' },
];

export function GuidePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text mb-2">Guia de uso</h1>
      <p className="text-sm text-soft mb-8">
        Passo a passo para produzir um vídeo de análise cripto.
      </p>

      <div className="space-y-4">
        {GUIDE_STEPS.map((step, i) => (
          <div key={i} className="bg-surface-2 border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-text">{step.title}</h3>
                <p className="text-sm text-soft mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
