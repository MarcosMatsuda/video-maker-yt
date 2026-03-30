import { Router, Request, Response } from 'express';
import { db } from '../database';

const router = Router();

const ALLOWED_FIELDS = [
  'titulo', 'gancho', 'status', 'roteiro', 'heygen_url', 'heygen_file',
  'thumb_file', 'assets', 'imagens_lista', 'titulo_yt', 'descricao',
  'tags', 'notas', 'tom', 'duracao_min', 'publicado',
];

function parseJsonFields(row: any) {
  if (!row) return row;
  return {
    ...row,
    assets: JSON.parse(row.assets || '[]'),
    imagens_lista: JSON.parse(row.imagens_lista || '[]'),
  };
}

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM videos ORDER BY criado_em DESC').all();
  res.json(rows.map(parseJsonFields));
});

router.post('/', (req: Request, res: Response) => {
  const { titulo, gancho, tom, duracao_min } = req.body;
  const r = db
    .prepare('INSERT INTO videos (titulo, gancho, tom, duracao_min) VALUES (?,?,?,?)')
    .run(titulo, gancho || '', tom || 'neutro', duracao_min || 5);
  res.json({ id: r.lastInsertRowid });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'não encontrado' });
  res.json(parseJsonFields(row));
});

router.patch('/:id', (req: Request, res: Response) => {
  const updates: Record<string, any> = {};
  ALLOWED_FIELDS.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  if (!Object.keys(updates).length) return res.json({ ok: true });

  if (updates.assets && typeof updates.assets !== 'string')
    updates.assets = JSON.stringify(updates.assets);
  if (updates.imagens_lista && typeof updates.imagens_lista !== 'string')
    updates.imagens_lista = JSON.stringify(updates.imagens_lista);

  const sets = Object.keys(updates).map((k) => `${k}=?`).join(', ');
  db.prepare(`UPDATE videos SET ${sets}, atualizado=CURRENT_TIMESTAMP WHERE id=?`)
    .run(...Object.values(updates), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM videos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
