import { Router, Request, Response } from 'express';
import { db } from '../database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM config').all() as { chave: string; valor: string }[];
  const cfg: Record<string, string> = {};
  rows.forEach((r) => { cfg[r.chave] = r.valor; });
  res.json(cfg);
});

router.post('/', (req: Request, res: Response) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)');
  Object.entries(req.body).forEach(([k, v]) => stmt.run(k, v));
  res.json({ ok: true });
});

export default router;
