import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db, DATA_DIR, VIDEOS_DIR } from '../database';

const router = Router();

const jobs = new Map<number, { status: 'processing' | 'done' | 'error'; progress: string; srt?: string; error?: string }>();

function resolveFilePath(fileUrl: string): string {
  const relative = fileUrl.replace(/^\//, '');
  return path.join(DATA_DIR, '..', relative);
}

router.post('/:id', async (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const row: any = db.prepare('SELECT * FROM videos WHERE id=?').get(videoId);
  if (!row) return res.status(404).json({ error: 'video not found' });

  if (jobs.get(videoId)?.status === 'processing') {
    return res.json({ status: 'processing', progress: jobs.get(videoId)!.progress });
  }

  if (!row.heygen_file) {
    return res.status(400).json({ error: 'Upload do video do avatar primeiro (step 3)' });
  }

  const avatarPath = resolveFilePath(row.heygen_file);
  if (!fs.existsSync(avatarPath)) {
    return res.status(400).json({ error: 'Arquivo do avatar nao encontrado' });
  }

  const outputDir = VIDEOS_DIR;
  const outputBase = path.join(outputDir, `${videoId}_legenda`);

  jobs.set(videoId, { status: 'processing', progress: 'Gerando legenda com Whisper...' });
  res.json({ status: 'processing', progress: 'Gerando legenda com Whisper...' });

  // Run whisper CLI: generates .srt file
  const proc = spawn('whisper', [
    avatarPath,
    '--model', 'base',
    '--language', 'pt',
    '--output_format', 'srt',
    '--output_dir', outputDir,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  let stderr = '';

  proc.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
    // Update progress
    const line = data.toString().trim();
    if (line) {
      jobs.set(videoId, { status: 'processing', progress: line.slice(0, 80) });
    }
  });

  proc.on('close', (code: number) => {
    // Whisper names output based on input filename
    const inputBasename = path.basename(avatarPath, path.extname(avatarPath));
    const srtFile = path.join(outputDir, `${inputBasename}.srt`);

    // Rename to our convention
    const finalSrt = `${outputBase}.srt`;

    if (code === 0 && fs.existsSync(srtFile)) {
      // Read original, re-segment into shorter lines, save
      const rawSrt = fs.readFileSync(srtFile, 'utf-8');
      const segmented = resegmentSrt(rawSrt);
      fs.writeFileSync(finalSrt, segmented, 'utf-8');
      const srtUrl = `/data/videos/${videoId}_legenda.srt`;
      jobs.set(videoId, { status: 'done', progress: 'Legenda gerada!', srt: srtUrl });

      // Save SRT path in database (in notas field)
      db.prepare('UPDATE videos SET notas=COALESCE(notas,\'\') || ?, atualizado=CURRENT_TIMESTAMP WHERE id=?')
        .run(`\n[legenda_srt]: ${srtUrl}`, videoId);
    } else {
      const lastLines = stderr.split('\n').slice(-5).join('\n');
      jobs.set(videoId, { status: 'error', progress: 'Erro ao gerar legenda', error: lastLines });
    }
  });
});

router.get('/:id/status', (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const job = jobs.get(videoId);
  if (!job) return res.json({ status: 'idle' });
  res.json(job);
});

// Get SRT content for preview
router.get('/:id/srt', (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const srtPath = path.join(VIDEOS_DIR, `${videoId}_legenda.srt`);
  if (!fs.existsSync(srtPath)) return res.status(404).json({ error: 'SRT not found' });
  const content = fs.readFileSync(srtPath, 'utf-8');
  res.type('text/plain').send(content);
});

// Re-segment SRT into shorter lines (max ~60 chars per block)
function resegmentSrt(srtContent: string): string {
  const MAX_CHARS = 60;
  const blocks = srtContent.trim().split(/\n\n+/);
  const newBlocks: { start: string; end: string; text: string }[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;

    const startMs = timeToMs(timeMatch[1]);
    const endMs = timeToMs(timeMatch[2]);
    const text = lines.slice(2).join(' ').trim();

    if (text.length <= MAX_CHARS) {
      newBlocks.push({ start: timeMatch[1], end: timeMatch[2], text });
      continue;
    }

    // Split text into chunks by words
    const words = text.split(' ');
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      if (current && (current + ' ' + word).length > MAX_CHARS) {
        chunks.push(current);
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) chunks.push(current);

    // Distribute time evenly across chunks
    const totalDuration = endMs - startMs;
    const chunkDuration = Math.floor(totalDuration / chunks.length);
    for (let i = 0; i < chunks.length; i++) {
      const cStart = startMs + i * chunkDuration;
      const cEnd = i === chunks.length - 1 ? endMs : cStart + chunkDuration;
      newBlocks.push({ start: msToTime(cStart), end: msToTime(cEnd), text: chunks[i] });
    }
  }

  return newBlocks.map((b, i) => `${i + 1}\n${b.start} --> ${b.end}\n${b.text}`).join('\n\n') + '\n';
}

function timeToMs(t: string): number {
  const [h, m, rest] = t.split(':');
  const [s, ms] = rest.split(',');
  return (+h * 3600 + +m * 60 + +s) * 1000 + +ms;
}

function msToTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`;
}

export default router;
