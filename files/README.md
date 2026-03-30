# Cripto CRM

Sistema local para produzir vídeos de cripto para YouTube, passo a passo.

## Instalação (1 vez)

```bash
# Precisa ter Node.js 18+ instalado
# Download: https://nodejs.org

cd cripto-crm
npm install
node server.js
```

Abra o browser em: **http://localhost:3333**

---

## Como usar

### 1 — Criar um novo vídeo
Clique em **+ Novo vídeo** e defina:
- Título interno (provisório, para você se organizar)
- Gancho: o ângulo dramático do vídeo
- Tom do mercado: alta / queda / neutro
- Duração alvo: 3, 4 ou 5 minutos

### 2 — Gerar o roteiro
O CRM gera automaticamente um **prompt otimizado** para você colar no Claude Pro Max.
O roteiro tem estrutura de drama + análise + especulação, com CTA no final.
Cole o resultado de volta no campo "Roteiro gerado".

### 3 — Gerar o avatar no HeyGen
- Acesse heygen.com
- Cole o roteiro, gere o vídeo
- Baixe o MP4 e faça upload no CRM

### 4 — Gráficos e imagens
- Screenshots do TradingView (tema escuro)
- Imagens do DALL-E ou Midjourney
- Upload direto no CRM

### 5 — Thumbnail
Gerada automaticamente com título + tom + cor do dia.
Você pode substituir por uma versão customizada.

### 6 — Montar com FFmpeg
O CRM gera o comando FFmpeg pronto. Copie e rode no terminal.

```bash
# Instalar FFmpeg (se não tiver):
# Mac:   brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: https://ffmpeg.org/download.html
```

### 7 — Upload manual no YouTube
Com o vídeo final e a thumbnail prontos, faça o upload no YouTube Studio.
O CRM tem todos os metadados prontos (título, descrição, tags).

---

## Estrutura de pastas

```
cripto-crm/
├── server.js          # servidor principal
├── package.json
├── data/
│   ├── crm.db         # banco SQLite (criado automaticamente)
│   ├── videos/        # arquivos MP4 do HeyGen
│   ├── thumbnails/    # thumbnails geradas
│   └── assets/        # gráficos e imagens
└── output/            # vídeos montados pelo FFmpeg
```

---

## Custo estimado por vídeo (5 min)

| Item              | Custo aprox. |
|-------------------|-------------|
| Claude (roteiro)  | R$ 0 (Pro Max) |
| HeyGen (avatar)   | ~R$ 2–5       |
| TradingView       | R$ 0 (grátis) |
| DALL-E (2 imgs)   | ~R$ 0,40      |
| FFmpeg (montagem) | R$ 0 (grátis) |
| **Total**         | **~R$ 5/vídeo** |
