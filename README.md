# Video Maker YT

Automated platform for creating cryptocurrency news videos for YouTube. Generates scripts, AI avatar voiceovers (HeyGen), subtitles, thumbnails, and final video composition.

## Stack

- **Backend:** Express.js + TypeScript + SQLite (better-sqlite3)
- **Frontend:** React 19 + Vite + TailwindCSS + TypeScript
- **Video:** FFmpeg for processing and composition
- **AI:** HeyGen (avatar/voiceover) + OpenAI (DALL-E for thumbnails)
- **Monorepo:** npm workspaces (`server/` + `web/`)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [FFmpeg](https://ffmpeg.org/) installed (`brew install ffmpeg` on macOS)
- [HeyGen](https://heygen.com/) API key
- [OpenAI](https://platform.openai.com/) API key (for DALL-E thumbnail generation)

## Installation

```bash
git clone https://github.com/MarcosMatsuda/video-maker-yt.git
cd video-maker-yt
npm install
```

## Configuration

API keys are configured directly in the web interface under **Settings**. No `.env` file required.

| Setting | Where to get |
|---------|-------------|
| HeyGen API Key | [heygen.com](https://heygen.com/) |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com/) |
| HeyGen Avatar ID | HeyGen dashboard |
| Channel Name | Your YouTube channel |

## Usage

```bash
# Start in development mode (server + web)
npm run dev

# Or use the start script
./start
```

- **Server:** http://localhost:3002
- **Web:** http://localhost:5174

### Video Creation Workflow

1. **Fetch news** — pull the latest cryptocurrency news
2. **Create script** — edit and refine the video script
3. **Generate voiceover** — create narration with AI avatar via HeyGen
4. **Generate subtitles** — auto-generate synced captions
5. **Compose video** — combine audio, avatar video, subtitles, and assets
6. **Publish** — export the final video ready for YouTube upload

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/videos` | List videos |
| `POST /api/videos` | Create video |
| `POST /api/upload` | Upload files |
| `POST /api/news` | Fetch news |
| `POST /api/montagem` | Compose final video |
| `POST /api/legenda` | Generate subtitles |
| `GET /api/config` | Settings |

## Project Structure

```
├── server/           # Express API + SQLite
│   ├── src/
│   │   ├── index.ts  # Entry point
│   │   ├── database.ts
│   │   └── routes/
│   └── data/         # DB + generated files (gitignored)
├── web/              # React frontend
│   ├── src/
│   │   ├── pages/
│   │   └── components/
│   └── vite.config.ts
├── start             # Startup script
└── package.json      # Workspace root
```

## License

MIT
