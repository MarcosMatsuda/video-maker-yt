import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { db, VIDEOS_DIR, THUMBS_DIR, ASSETS_DIR } from '../database';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tipo = (req.query.tipo as string) || 'asset';
    const dest = tipo === 'video' ? VIDEOS_DIR : tipo === 'thumb' ? THUMBS_DIR : ASSETS_DIR;
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

const router = Router();

router.post('/:id', upload.single('file'), (req: Request, res: Response) => {
  const tipo = (req.query.tipo as string) || 'asset';
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'sem arquivo' });

  const folder = tipo === 'video' ? 'videos' : tipo === 'thumb' ? 'thumbnails' : 'assets';
  const url = `/data/${folder}/${file.filename}`;
  const video = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id) as any;

  if (tipo === 'video') {
    db.prepare('UPDATE videos SET heygen_file=?, atualizado=CURRENT_TIMESTAMP WHERE id=?')
      .run(url, req.params.id);
  } else if (tipo === 'thumb') {
    db.prepare('UPDATE videos SET thumb_file=?, atualizado=CURRENT_TIMESTAMP WHERE id=?')
      .run(url, req.params.id);
  } else {
    const assets = JSON.parse(video?.assets || '[]');
    assets.push({ url, nome: file.originalname, tipo: file.mimetype, tamanho: file.size });
    db.prepare('UPDATE videos SET assets=?, atualizado=CURRENT_TIMESTAMP WHERE id=?')
      .run(JSON.stringify(assets), req.params.id);
  }

  res.json({ url, filename: file.filename });
});

export default router;
