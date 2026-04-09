# Cripto News Video Maker

Plataforma automatizada para criação de vídeos de notícias sobre criptomoedas para YouTube. Gera roteiros, voiceovers com avatar IA (HeyGen), legendas, thumbnails e montagem final de vídeo.

## Stack

- **Backend:** Express.js + TypeScript + SQLite (better-sqlite3)
- **Frontend:** React 19 + Vite + TailwindCSS + TypeScript
- **Vídeo:** FFmpeg para processamento e montagem
- **IA:** HeyGen (avatar/voiceover) + OpenAI (DALL-E para thumbnails)
- **Monorepo:** npm workspaces (`server/` + `web/`)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [FFmpeg](https://ffmpeg.org/) instalado (`brew install ffmpeg` no macOS)
- Chave de API do [HeyGen](https://heygen.com/)
- Chave de API da [OpenAI](https://platform.openai.com/) (para geração de thumbnails com DALL-E)

## Instalação

```bash
git clone https://github.com/MarcosMatsuda/video-maker-yt.git
cd video-maker-yt
npm install
```

## Configuração

As chaves de API são configuradas diretamente na interface web em **Configurações**. Não é necessário arquivo `.env`.

| Configuração | Onde obter |
|-------------|-----------|
| HeyGen API Key | [heygen.com](https://heygen.com/) |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com/) |
| HeyGen Avatar ID | Painel do HeyGen |
| Nome do Canal | Seu canal do YouTube |

## Uso

```bash
# Iniciar em modo desenvolvimento (server + web)
npm run dev

# Ou usar o start script
./start
```

- **Server:** http://localhost:3002
- **Web:** http://localhost:5174

### Fluxo de criação de vídeo

1. **Buscar notícias** — busca as últimas notícias de criptomoedas
2. **Criar roteiro** — edita e refina o script do vídeo
3. **Gerar voiceover** — cria narração com avatar IA via HeyGen
4. **Gerar legendas** — cria legendas sincronizadas automaticamente
5. **Montar vídeo** — combina áudio, vídeo do avatar, legendas e assets
6. **Publicar** — exporta o vídeo final pronto para upload no YouTube

## API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/videos` | Listar vídeos |
| `POST /api/videos` | Criar vídeo |
| `POST /api/upload` | Upload de arquivos |
| `POST /api/news` | Buscar notícias |
| `POST /api/montagem` | Montar vídeo final |
| `POST /api/legenda` | Gerar legendas |
| `GET /api/config` | Configurações |

## Estrutura

```
├── server/           # Express API + SQLite
│   ├── src/
│   │   ├── index.ts  # Entry point
│   │   ├── database.ts
│   │   └── routes/
│   └── data/         # DB + arquivos gerados (gitignored)
├── web/              # React frontend
│   ├── src/
│   │   ├── pages/
│   │   └── components/
│   └── vite.config.ts
├── start             # Script de inicialização
└── package.json      # Workspace root
```

## Licença

MIT
