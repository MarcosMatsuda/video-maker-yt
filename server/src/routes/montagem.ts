import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db, DATA_DIR, VIDEOS_DIR } from '../database';

const router = Router();

interface ImageSlot {
  index: number;
  cena: string;
  tipo: string;
  prompt: string;
  asset_url: string | null;
  pulada: boolean;
}

// Track active jobs
const jobs = new Map<number, { status: 'processing' | 'done' | 'error'; progress: string; output?: string; error?: string }>();

function resolveFilePath(fileUrl: string): string {
  // /data/videos/abc.mp4 → /absolute/path/server/data/videos/abc.mp4
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
    return res.status(400).json({ error: `Arquivo do avatar nao encontrado: ${row.heygen_file}` });
  }

  const slots: ImageSlot[] = JSON.parse(row.imagens_lista || '[]');
  const images = slots.filter((s) => s.asset_url && !s.pulada);

  // Verify all image files exist
  const validImages = images.filter((img) => {
    const p = resolveFilePath(img.asset_url!);
    return fs.existsSync(p);
  });

  // Check for subtitle file
  const srtPath = path.join(VIDEOS_DIR, `${videoId}_legenda.srt`);
  const hasSubs = fs.existsSync(srtPath);

  const outputFile = path.join(VIDEOS_DIR, `${videoId}_final.mp4`);

  const args: string[] = ['-y'];

  // Input 0: avatar video
  args.push('-i', avatarPath);

  // Input 1..N: overlay images (as static images with loop)
  for (const img of validImages) {
    const imgPath = resolveFilePath(img.asset_url!);
    args.push('-loop', '1', '-t', '10', '-i', imgPath);
  }

  if (validImages.length > 0) {
    const durationSec = (row.duracao_min || 8) * 60;
    // Distribute images evenly across the video duration
    // Each image shows for 8 seconds with 1s fade in/out
    const showDuration = 8;
    const interval = Math.floor(durationSec / (validImages.length + 1));

    const filterParts: string[] = [];

    // Scale avatar to 1920x1080 keeping aspect ratio, pad with black
    filterParts.push('[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1[base]');

    // For each image: scale to full screen keeping aspect ratio, pad, add fade in/out
    validImages.forEach((_, i) => {
      const inputIdx = i + 1;
      const fadeOutStart = showDuration - 1;
      filterParts.push(
        `[${inputIdx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuva420p,fade=t=in:st=0:d=0.8:alpha=1,fade=t=out:st=${fadeOutStart}:d=0.8:alpha=1[img${i}]`
      );
    });

    // Chain overlays — each image goes full screen over the avatar
    let prev = 'base';
    validImages.forEach((_, i) => {
      const startTime = interval * (i + 1);
      const endTime = startTime + showDuration;
      const next = i === validImages.length - 1 ? 'out' : `tmp${i}`;
      filterParts.push(
        `[${prev}][img${i}]overlay=0:0:enable='between(t,${startTime},${endTime})'[${next}]`
      );
      prev = next;
    });

    // Add subtitles filter at the end of the chain
    if (hasSubs) {
      // Copy SRT to output dir with simple name to avoid path escaping issues
      const simpleSrt = path.join(path.dirname(outputFile), 'subs.srt');
      fs.copyFileSync(srtPath, simpleSrt);
      const subsStyle = 'FontSize=16,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=1,Shadow=1,MarginV=20';
      filterParts.push(
        `[out]subtitles=subs.srt:force_style='${subsStyle}'[final]`
      );
      args.push('-filter_complex', filterParts.join(';'));
      args.push('-map', '[final]', '-map', '0:a?');
    } else {
      args.push('-filter_complex', filterParts.join(';'));
      args.push('-map', '[out]', '-map', '0:a?');
    }

    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputFile,
    );
  } else if (hasSubs) {
    // No overlays but has subtitles
    const simpleSrt = path.join(path.dirname(outputFile), 'subs.srt');
    fs.copyFileSync(srtPath, simpleSrt);
    const subsStyle = 'FontSize=16,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=1,Shadow=1,MarginV=20';
    args.push(
      '-vf', `subtitles=subs.srt:force_style='${subsStyle}'`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputFile,
    );
  } else {
    // No overlays, no subs — just copy
    args.push('-c', 'copy', outputFile);
  }

  // Start job
  jobs.set(videoId, { status: 'processing', progress: 'Iniciando montagem...' });
  res.json({ status: 'processing', progress: 'Iniciando montagem...' });

  const ffmpegBin = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
  const proc = spawn(ffmpegBin, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: VIDEOS_DIR });
  let stderr = '';

  proc.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
    const timeMatch = data.toString().match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
    if (timeMatch) {
      jobs.set(videoId, { status: 'processing', progress: `Processando... ${timeMatch[1]}` });
    }
  });

  proc.on('close', (code: number) => {
    if (code === 0 && fs.existsSync(outputFile)) {
      const outputUrl = `/data/videos/${videoId}_final.mp4`;
      jobs.set(videoId, { status: 'done', progress: 'Concluido!', output: outputUrl });
      db.prepare('UPDATE videos SET notas=COALESCE(notas,\'\') || ?, atualizado=CURRENT_TIMESTAMP WHERE id=?')
        .run(`\n[video_final]: ${outputUrl}`, videoId);
    } else {
      const lastLines = stderr.split('\n').slice(-5).join('\n');
      jobs.set(videoId, { status: 'error', progress: 'Erro na montagem', error: lastLines });
    }
  });
});

router.get('/:id/status', (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const job = jobs.get(videoId);
  if (!job) return res.json({ status: 'idle' });
  res.json(job);
});

export default router;
