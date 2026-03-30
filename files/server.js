/**
 * CRIPTO CRM — servidor local
 * 
 * Instalação:
 *   npm install
 *   node server.js
 *   Abra: http://localhost:3333
 */

const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3333;

// ── Pastas de dados ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const THUMBS_DIR = path.join(DATA_DIR, 'thumbnails');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');

[DATA_DIR, VIDEOS_DIR, THUMBS_DIR, ASSETS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── Banco de dados SQLite ────────────────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'crm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo      TEXT NOT NULL,
    gancho      TEXT,
    status      TEXT DEFAULT 'briefing',
    roteiro     TEXT,
    heygen_url  TEXT,
    heygen_file TEXT,
    thumb_file  TEXT,
    assets      TEXT DEFAULT '[]',
    imagens_lista TEXT DEFAULT '[]',
    titulo_yt   TEXT,
    descricao   TEXT,
    tags        TEXT,
    notas       TEXT,
    tom         TEXT DEFAULT 'neutro',
    duracao_min INTEGER DEFAULT 5,
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado  DATETIME DEFAULT CURRENT_TIMESTAMP,
    publicado   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT
  );

  INSERT OR IGNORE INTO config VALUES ('heygen_api_key', '');
  INSERT OR IGNORE INTO config VALUES ('openai_api_key', '');
  INSERT OR IGNORE INTO config VALUES ('heygen_avatar_id', '');
  INSERT OR IGNORE INTO config VALUES ('canal_nome', 'Cripto Análise');
  INSERT OR IGNORE INTO config VALUES ('canal_cta', 'Se inscreva no canal e ative o sininho para não perder nenhuma análise!');
`);

// Migração: adiciona coluna imagens_lista se não existir (banco já criado antes)
try {
  db.exec(`ALTER TABLE videos ADD COLUMN imagens_lista TEXT DEFAULT '[]'`);
} catch (_) { /* coluna já existe */ }

// ── Upload de arquivos ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipo = req.query.tipo || 'assets';
    const dest = tipo === 'video' ? VIDEOS_DIR : tipo === 'thumb' ? THUMBS_DIR : ASSETS_DIR;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

app.use(express.json({ limit: '10mb' }));
app.use('/data', express.static(DATA_DIR));

// ── API: Videos ──────────────────────────────────────────────────────────────
app.get('/api/videos', (req, res) => {
  const rows = db.prepare('SELECT * FROM videos ORDER BY criado_em DESC').all();
  res.json(rows.map(r => ({ ...r, assets: JSON.parse(r.assets || '[]'), imagens_lista: JSON.parse(r.imagens_lista || '[]') })));
});

app.post('/api/videos', (req, res) => {
  const { titulo, gancho, tom, duracao_min } = req.body;
  const r = db.prepare(
    'INSERT INTO videos (titulo, gancho, tom, duracao_min) VALUES (?,?,?,?)'
  ).run(titulo, gancho || '', tom || 'neutro', duracao_min || 5);
  res.json({ id: r.lastInsertRowid });
});

app.get('/api/videos/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'não encontrado' });
  res.json({ ...row, assets: JSON.parse(row.assets || '[]'), imagens_lista: JSON.parse(row.imagens_lista || '[]') });
});

app.patch('/api/videos/:id', (req, res) => {
  const allowed = ['titulo','gancho','status','roteiro','heygen_url','heygen_file',
                   'thumb_file','assets','imagens_lista','titulo_yt','descricao','tags','notas',
                   'tom','duracao_min','publicado'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (!Object.keys(updates).length) return res.json({ ok: true });

  if (updates.assets && typeof updates.assets !== 'string')
    updates.assets = JSON.stringify(updates.assets);
  if (updates.imagens_lista && typeof updates.imagens_lista !== 'string')
    updates.imagens_lista = JSON.stringify(updates.imagens_lista);

  const sets = Object.keys(updates).map(k => `${k}=?`).join(', ');
  db.prepare(`UPDATE videos SET ${sets}, atualizado=CURRENT_TIMESTAMP WHERE id=?`)
    .run(...Object.values(updates), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/videos/:id', (req, res) => {
  db.prepare('DELETE FROM videos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── API: Upload de arquivo ───────────────────────────────────────────────────
app.post('/api/upload/:id', upload.single('file'), (req, res) => {
  const tipo = req.query.tipo || 'assets';
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'sem arquivo' });

  const url = `/data/${tipo === 'video' ? 'videos' : tipo === 'thumb' ? 'thumbnails' : 'assets'}/${file.filename}`;
  const video = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id);

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

// ── API: Config ──────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const rows = db.prepare('SELECT * FROM config').all();
  const cfg = {};
  rows.forEach(r => { cfg[r.chave] = r.valor; });
  res.json(cfg);
});

app.post('/api/config', (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)');
  Object.entries(req.body).forEach(([k, v]) => stmt.run(k, v));
  res.json({ ok: true });
});

// ── Frontend (HTML único) ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cripto CRM</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #08090c;
  --surface: #0f1117;
  --surface2: #161820;
  --surface3: #1e2029;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.1);
  --text: #e8e6e0;
  --muted: #6b6a66;
  --soft: #a8a6a0;
  --accent: #f0b429;
  --accent2: #3b82f6;
  --green: #22c55e;
  --red: #ef4444;
  --radius: 10px;
}
* { box-sizing:border-box; margin:0; padding:0; }
body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; min-height:100vh; }
.mono { font-family:'JetBrains Mono',monospace; }

/* Layout */
.app { display:grid; grid-template-columns:260px 1fr; min-height:100vh; }
.sidebar { background:var(--surface); border-right:1px solid var(--border); padding:24px 0; display:flex; flex-direction:column; }
.main { padding:32px; overflow-y:auto; }

/* Sidebar */
.brand { padding:0 20px 24px; border-bottom:1px solid var(--border); }
.brand-name { font-size:18px; font-weight:700; color:var(--accent); letter-spacing:-0.02em; }
.brand-sub { font-size:11px; color:var(--muted); margin-top:2px; }
.nav { padding:16px 12px; flex:1; }
.nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; cursor:pointer; font-size:13px; color:var(--soft); transition:all 0.15s; margin-bottom:2px; }
.nav-item:hover { background:var(--surface2); color:var(--text); }
.nav-item.active { background:rgba(240,180,41,0.1); color:var(--accent); }
.nav-icon { width:16px; height:16px; flex-shrink:0; }
.sidebar-footer { padding:16px 20px; border-top:1px solid var(--border); }
.btn-new { width:100%; padding:10px; background:var(--accent); color:#08090c; border:none; border-radius:8px; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:opacity 0.15s; }
.btn-new:hover { opacity:0.85; }

/* Cards de vídeo */
.page { display:none; }
.page.active { display:block; }
.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:22px; font-weight:600; }
.videos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
.video-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:18px; cursor:pointer; transition:border-color 0.15s,transform 0.15s; }
.video-card:hover { border-color:var(--border2); transform:translateY(-2px); }
.video-card-thumb { width:100%; height:120px; background:var(--surface2); border-radius:6px; margin-bottom:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.video-card-thumb img { width:100%; height:100%; object-fit:cover; }
.video-card-thumb .no-thumb { font-size:11px; color:var(--muted); }
.video-card-title { font-size:14px; font-weight:600; margin-bottom:6px; line-height:1.3; }
.video-card-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.badge { font-size:10px; padding:3px 8px; border-radius:20px; font-weight:500; }
.badge-briefing  { background:rgba(107,106,102,0.2); color:var(--muted); }
.badge-roteiro   { background:rgba(59,130,246,0.15); color:var(--accent2); }
.badge-avatar    { background:rgba(168,106,255,0.15); color:#a86aff; }
.badge-graficos  { background:rgba(240,180,41,0.15); color:var(--accent); }
.badge-thumb     { background:rgba(255,140,60,0.15); color:#ff8c3c; }
.badge-montagem  { background:rgba(34,197,94,0.15); color:var(--green); }
.badge-pronto    { background:rgba(34,197,94,0.25); color:var(--green); }
.badge-publicado { background:rgba(240,180,41,0.25); color:var(--accent); }
.tom-badge { font-size:10px; padding:2px 7px; border-radius:10px; }
.tom-alta   { background:rgba(34,197,94,0.15); color:var(--green); }
.tom-queda  { background:rgba(239,68,68,0.15); color:var(--red); }
.tom-neutro { background:rgba(107,106,102,0.15); color:var(--muted); }
.card-date { font-size:10px; color:var(--muted); margin-left:auto; }

/* Detalhe do vídeo */
.detail { display:none; }
.detail.open { display:grid; grid-template-columns:1fr 340px; gap:24px; }
.detail-back { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); cursor:pointer; margin-bottom:20px; transition:color 0.15s; }
.detail-back:hover { color:var(--text); }

/* Steps */
.steps { display:flex; gap:0; margin-bottom:28px; overflow-x:auto; padding-bottom:4px; }
.step { display:flex; align-items:center; gap:0; flex-shrink:0; }
.step-dot { width:28px; height:28px; border-radius:50%; border:2px solid var(--border2); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:var(--muted); transition:all 0.2s; cursor:pointer; }
.step-dot.done { background:var(--green); border-color:var(--green); color:#fff; }
.step-dot.active { background:var(--accent); border-color:var(--accent); color:#08090c; }
.step-line { width:40px; height:2px; background:var(--border2); }
.step-line.done { background:var(--green); }
.step-label { font-size:10px; color:var(--muted); text-align:center; margin-top:4px; white-space:nowrap; }
.steps-row { display:flex; gap:0; margin-bottom:28px; }
.step-wrap { display:flex; flex-direction:column; align-items:center; }
.step-connector { width:40px; height:28px; display:flex; align-items:center; }

/* Painéis de etapa */
.panel { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:16px; }
.panel-title { font-size:13px; font-weight:600; color:var(--accent); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
.panel-title .step-num { width:20px; height:20px; border-radius:50%; background:rgba(240,180,41,0.15); color:var(--accent); font-size:10px; display:flex; align-items:center; justify-content:center; font-weight:700; }

/* Formulários */
label { display:block; font-size:11px; color:var(--muted); margin-bottom:5px; letter-spacing:0.04em; text-transform:uppercase; }
input[type=text], textarea, select {
  width:100%; background:var(--surface2); border:1px solid var(--border2); border-radius:8px;
  padding:10px 12px; color:var(--text); font-family:'Syne',sans-serif; font-size:13px;
  outline:none; transition:border-color 0.15s; resize:vertical;
}
input[type=text]:focus, textarea:focus, select:focus { border-color:rgba(240,180,41,0.4); }
textarea { min-height:120px; line-height:1.6; }
.form-row { margin-bottom:14px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

/* Botões */
.btn { padding:9px 16px; border-radius:8px; font-family:'Syne',sans-serif; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--border2); background:transparent; color:var(--soft); transition:all 0.15s; }
.btn:hover { border-color:var(--border2); background:var(--surface2); color:var(--text); }
.btn-primary { background:var(--accent); color:#08090c; border-color:var(--accent); }
.btn-primary:hover { opacity:0.85; }
.btn-danger { border-color:rgba(239,68,68,0.3); color:var(--red); }
.btn-danger:hover { background:rgba(239,68,68,0.1); }
.btn-green { border-color:rgba(34,197,94,0.3); color:var(--green); }
.btn-green:hover { background:rgba(34,197,94,0.1); }
.btn-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }

/* Upload */
.upload-zone { border:1px dashed var(--border2); border-radius:8px; padding:20px; text-align:center; cursor:pointer; transition:all 0.15s; }
.upload-zone:hover { border-color:rgba(240,180,41,0.4); background:rgba(240,180,41,0.04); }
.upload-zone input { display:none; }
.upload-zone p { font-size:12px; color:var(--muted); }
.file-list { margin-top:10px; display:flex; flex-direction:column; gap:6px; }
.file-item { display:flex; align-items:center; gap:8px; background:var(--surface2); border-radius:6px; padding:6px 10px; font-size:11px; color:var(--soft); }
.file-item a { color:var(--accent2); text-decoration:none; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-item a:hover { text-decoration:underline; }

/* Sidebar do detalhe */
.detail-sidebar { display:flex; flex-direction:column; gap:16px; }
.info-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; }
.info-card h4 { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px; }
.info-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--border); font-size:12px; }
.info-row:last-child { border-bottom:none; }
.info-row span:first-child { color:var(--muted); }
.info-row span:last-child { color:var(--text); font-weight:500; }
.checklist { display:flex; flex-direction:column; gap:6px; }
.check-item { display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; padding:4px 0; }
.check-item .check-icon { width:16px; height:16px; border-radius:4px; border:1.5px solid var(--border2); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.check-item.done .check-icon { background:var(--green); border-color:var(--green); }
.check-item.done span { color:var(--muted); text-decoration:line-through; }

/* Config */
.config-section { margin-bottom:24px; }
.config-section h3 { font-size:13px; font-weight:600; color:var(--soft); margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.api-key-row { display:flex; gap:8px; align-items:flex-end; }
.api-key-row input { flex:1; font-family:'JetBrains Mono',monospace; font-size:12px; }
.key-status { width:8px; height:8px; border-radius:50%; background:var(--muted); }
.key-status.ok { background:var(--green); }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:none; align-items:center; justify-content:center; }
.modal-overlay.open { display:flex; }
.modal { background:var(--surface); border:1px solid var(--border2); border-radius:14px; padding:24px; width:480px; max-width:95vw; }
.modal h3 { font-size:16px; font-weight:600; margin-bottom:20px; }
.modal-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:20px; }

/* Toast */
.toast { position:fixed; bottom:24px; right:24px; background:var(--surface3); border:1px solid var(--border2); border-radius:8px; padding:10px 16px; font-size:12px; z-index:200; opacity:0; transform:translateY(8px); transition:all 0.2s; pointer-events:none; }
.toast.show { opacity:1; transform:translateY(0); }
.toast.success { border-color:rgba(34,197,94,0.4); color:var(--green); }
.toast.error { border-color:rgba(239,68,68,0.4); color:var(--red); }

/* Vazio */
.empty { text-align:center; padding:60px 20px; color:var(--muted); }
.empty h3 { font-size:16px; color:var(--soft); margin-bottom:8px; }
.empty p { font-size:13px; line-height:1.6; }

/* Roteiro preview */
.roteiro-box { background:var(--surface2); border-radius:8px; padding:16px; font-size:12px; line-height:1.7; color:var(--soft); white-space:pre-wrap; max-height:400px; overflow-y:auto; font-family:'JetBrains Mono',monospace; }

/* Thumbnail preview */
.thumb-preview { width:100%; aspect-ratio:16/9; background:var(--surface2); border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
.thumb-preview img { width:100%; height:100%; object-fit:cover; }

/* Prompt helper */
.prompt-box { background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:8px; padding:14px; margin-bottom:14px; }
.prompt-box p { font-size:12px; color:var(--accent2); line-height:1.6; }
.prompt-box code { font-family:'JetBrains Mono',monospace; font-size:11px; background:rgba(59,130,246,0.15); padding:1px 5px; border-radius:3px; }

/* Responsivo */
@media (max-width:900px) {
  .app { grid-template-columns:1fr; }
  .sidebar { display:none; }
  .detail.open { grid-template-columns:1fr; }
}
</style>
</head>
<body>

<div class="app">
  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-name">₿ CRIPTO CRM</div>
      <div class="brand-sub">Pipeline de vídeos</div>
    </div>
    <nav class="nav">
      <div class="nav-item active" onclick="showPage('videos')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        Vídeos
      </div>
      <div class="nav-item" onclick="showPage('config')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        Configurações
      </div>
      <div class="nav-item" onclick="showPage('ajuda')">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
        Guia de uso
      </div>
    </nav>
    <div class="sidebar-footer">
      <button class="btn-new" onclick="abrirModalNovo()">+ Novo vídeo</button>
    </div>
  </aside>

  <!-- ── MAIN ── -->
  <main class="main">

    <!-- ── LISTA DE VÍDEOS ── -->
    <div id="page-videos" class="page active">
      <div class="page-header">
        <div class="page-title">Vídeos</div>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="filtro-status" onchange="carregarVideos()" style="width:160px;font-size:12px">
            <option value="">Todos</option>
            <option value="briefing">Briefing</option>
            <option value="roteiro">Roteiro</option>
            <option value="avatar">Avatar</option>
            <option value="graficos">Gráficos</option>
            <option value="thumb">Thumbnail</option>
            <option value="montagem">Montagem</option>
            <option value="pronto">Pronto</option>
            <option value="publicado">Publicado</option>
          </select>
        </div>
      </div>
      <div id="videos-grid" class="videos-grid"></div>
    </div>

    <!-- ── DETALHE DO VÍDEO ── -->
    <div id="page-detail" class="page">
      <div class="detail-back" onclick="voltarLista()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Voltar para lista
      </div>
      <div id="detail-content"></div>
    </div>

    <!-- ── CONFIGURAÇÕES ── -->
    <div id="page-config" class="page">
      <div class="page-header"><div class="page-title">Configurações</div></div>
      <div class="config-section">
        <h3>APIs e Serviços</h3>
        <div class="form-row">
          <label>HeyGen API Key</label>
          <div class="api-key-row">
            <input type="text" id="cfg-heygen" placeholder="xxxxxxxxxxxxxxxx" />
            <div class="key-status" id="st-heygen"></div>
          </div>
        </div>
        <div class="form-row">
          <label>HeyGen Avatar ID</label>
          <input type="text" id="cfg-avatar-id" placeholder="ID do seu avatar no HeyGen" />
        </div>
        <div class="form-row">
          <label>OpenAI API Key (DALL-E para imagens)</label>
          <div class="api-key-row">
            <input type="text" id="cfg-openai" placeholder="sk-..." />
            <div class="key-status" id="st-openai"></div>
          </div>
        </div>
      </div>
      <div class="config-section">
        <h3>Canal</h3>
        <div class="form-row">
          <label>Nome do canal</label>
          <input type="text" id="cfg-canal" placeholder="Ex: Cripto Análise BR" />
        </div>
        <div class="form-row">
          <label>Chamada para ação (CTA) padrão</label>
          <textarea id="cfg-cta" rows="2" placeholder="Se inscreva no canal..."></textarea>
        </div>
      </div>
      <button class="btn btn-primary" onclick="salvarConfig()">Salvar configurações</button>
    </div>

    <!-- ── AJUDA ── -->
    <div id="page-ajuda" class="page">
      <div class="page-header"><div class="page-title">Guia de uso</div></div>
      <div style="max-width:640px;display:flex;flex-direction:column;gap:16px">
        <div class="panel">
          <div class="panel-title"><span class="step-num">1</span> Briefing</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">Defina o <strong style="color:var(--text)">gancho dramático</strong> do vídeo. Não precisa ser o preço atual — pode ser uma narrativa: <em>"Baleias estão acumulando em silêncio. O que sabem que o mercado não sabe?"</em></p>
        </div>
        <div class="panel">
          <div class="panel-title"><span class="step-num">2</span> Roteiro com Claude</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">Cole o prompt gerado na aba de roteiro <strong style="color:var(--text)">neste mesmo chat do Claude Pro Max</strong>. O roteiro gerado tem estrutura de 3–5 min com drama, análise e especulação. Cole o resultado de volta no CRM.</p>
        </div>
        <div class="panel">
          <div class="panel-title"><span class="step-num">3</span> Avatar no HeyGen</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">Acesse <a href="https://heygen.com" target="_blank" style="color:var(--accent2)">heygen.com</a>, cole o roteiro, gere o vídeo e baixe o MP4. Faça upload aqui no CRM.</p>
        </div>
        <div class="panel">
          <div class="panel-title"><span class="step-num">4</span> Gráficos</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">Tire screenshots do <a href="https://tradingview.com" target="_blank" style="color:var(--accent2)">TradingView</a> com os gráficos relevantes. Faça upload aqui. Use o <strong style="color:var(--text)">tema escuro</strong> para combinar com o estilo do canal.</p>
        </div>
        <div class="panel">
          <div class="panel-title"><span class="step-num">5</span> Thumbnail</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">A thumbnail é gerada automaticamente pelo CRM com o título e tom do dia. Você pode substituir por uma customizada.</p>
        </div>
        <div class="panel">
          <div class="panel-title"><span class="step-num">6</span> Montagem + Upload</div>
          <p style="font-size:13px;color:var(--soft);line-height:1.7">Com todos os arquivos prontos, use o FFmpeg localmente para montar (instruções na tela). Depois faça o upload manual no <a href="https://studio.youtube.com" target="_blank" style="color:var(--accent2)">YouTube Studio</a>.</p>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- ── MODAL NOVO VÍDEO ── -->
<div class="modal-overlay" id="modal-novo">
  <div class="modal">
    <h3>Novo vídeo</h3>
    <div class="form-row">
      <label>Título interno (provisório)</label>
      <input type="text" id="novo-titulo" placeholder="Ex: BTC — análise 30/03/2025" />
    </div>
    <div class="form-row">
      <label>Gancho / ângulo dramático</label>
      <textarea id="novo-gancho" rows="3" placeholder="Ex: Baleias acumulando em silêncio enquanto o mercado dorme..."></textarea>
    </div>
    <div class="form-grid">
      <div>
        <label>Tom do mercado</label>
        <select id="novo-tom">
          <option value="alta">Alta 📈</option>
          <option value="queda">Queda 📉</option>
          <option value="neutro" selected>Neutro ↔</option>
          <option value="critico">Crítico ⚠️</option>
        </select>
      </div>
      <div>
        <label>Duração alvo</label>
        <select id="novo-duracao">
          <option value="3">3 min</option>
          <option value="4">4 min</option>
          <option value="5" selected>5 min</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="criarVideo()">Criar vídeo</button>
    </div>
  </div>
</div>

<!-- ── TOAST ── -->
<div class="toast" id="toast"></div>

<script>
// ── Estado ────────────────────────────────────────────────────────────────────
let currentVideoId = null;
let currentVideo = null;

const STEPS = [
  { key:'briefing',  label:'Briefing' },
  { key:'roteiro',   label:'Roteiro' },
  { key:'avatar',    label:'Avatar' },
  { key:'graficos',  label:'Gráficos' },
  { key:'thumb',     label:'Thumb' },
  { key:'montagem',  label:'Montagem' },
  { key:'pronto',    label:'Pronto' },
];

const STATUS_ORDER = STEPS.map(s => s.key).concat(['publicado']);

// ── Navegação ─────────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const navs = document.querySelectorAll('.nav-item');
  if (name === 'videos') navs[0].classList.add('active');
  if (name === 'config') { navs[1].classList.add('active'); carregarConfig(); }
  if (name === 'ajuda')  navs[2].classList.add('active');
}

function voltarLista() {
  currentVideoId = null;
  showPage('videos');
  carregarVideos();
}

// ── Vídeos ────────────────────────────────────────────────────────────────────
async function carregarVideos() {
  const filtro = document.getElementById('filtro-status').value;
  const res = await fetch('/api/videos');
  let videos = await res.json();
  if (filtro) videos = videos.filter(v => v.status === filtro);

  const grid = document.getElementById('videos-grid');
  if (!videos.length) {
    grid.innerHTML = '<div class="empty"><h3>Nenhum vídeo ainda</h3><p>Clique em "+ Novo vídeo" para começar.</p></div>';
    return;
  }

  grid.innerHTML = videos.map(v => {
    const data = new Date(v.criado_em).toLocaleDateString('pt-BR');
    return \`
    <div class="video-card" onclick="abrirVideo(\${v.id})">
      <div class="video-card-thumb">
        \${v.thumb_file
          ? \`<img src="\${v.thumb_file}" alt="thumb">\`
          : '<span class="no-thumb">sem thumbnail</span>'}
      </div>
      <div class="video-card-title">\${esc(v.titulo)}</div>
      <div class="video-card-meta">
        <span class="badge badge-\${v.status}">\${v.status}</span>
        <span class="tom-badge tom-\${v.tom}">\${v.tom}</span>
        <span class="card-date">\${data}</span>
      </div>
    </div>\`;
  }).join('');
}

async function abrirVideo(id) {
  currentVideoId = id;
  const res = await fetch('/api/videos/' + id);
  currentVideo = await res.json();
  renderDetalhe(currentVideo);
  showPage('detail');
}

function renderDetalhe(v) {
  const stepIdx = STATUS_ORDER.indexOf(v.status);

  // Steps bar
  const stepsHtml = STEPS.map((s, i) => {
    const done   = i < stepIdx;
    const active = STATUS_ORDER[stepIdx] === s.key;
    return \`
    <div class="step-wrap">
      <div style="display:flex;align-items:center">
        <div class="step-dot \${done?'done':active?'active':''}" onclick="irParaStep('\${s.key}')">\${done?'✓':i+1}</div>
        \${i < STEPS.length-1 ? \`<div class="step-line \${done?'done':''}"></div>\` : ''}
      </div>
      <div class="step-label" style="color:\${active?'var(--accent)':done?'var(--green)':'var(--muted)'}">\${s.label}</div>
    </div>\`;
  }).join('');

  // Checklist automático
  const checks = [
    { label: 'Briefing definido',   done: !!v.gancho },
    { label: 'Roteiro gerado',      done: !!v.roteiro },
    { label: 'Avatar baixado',      done: !!v.heygen_file },
    { label: 'Gráficos enviados',   done: v.assets.some(a => a.nome?.match(/chart|graf/i)||a.tipo?.includes('image')) },
    { label: 'Thumbnail gerada',    done: !!v.thumb_file },
    { label: 'Vídeo montado',       done: v.status === 'pronto' || v.status === 'publicado' },
  ];

  const sidebarHtml = \`
  <div class="detail-sidebar">
    <div class="info-card">
      <h4>Status do vídeo</h4>
      <div class="info-row"><span>Etapa atual</span><span class="badge badge-\${v.status}">\${v.status}</span></div>
      <div class="info-row"><span>Tom</span><span class="tom-badge tom-\${v.tom}">\${v.tom}</span></div>
      <div class="info-row"><span>Duração alvo</span><span>\${v.duracao_min} min</span></div>
      <div class="info-row"><span>Criado em</span><span>\${new Date(v.criado_em).toLocaleDateString('pt-BR')}</span></div>
    </div>
    <div class="info-card">
      <h4>Checklist</h4>
      <div class="checklist">
        \${checks.map(c => \`
          <div class="check-item \${c.done?'done':''}">
            <div class="check-icon">\${c.done?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
            <span>\${c.label}</span>
          </div>\`).join('')}
      </div>
    </div>
    <div class="info-card">
      <h4>Ações</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        \${v.status !== 'publicado' ? \`
          <button class="btn btn-green" onclick="avancarStatus()">Avançar etapa →</button>
        \` : ''}
        \${v.heygen_file ? \`<a href="\${v.heygen_file}" target="_blank" class="btn" style="text-align:center;text-decoration:none">▶ Ver avatar MP4</a>\` : ''}
        \${v.thumb_file ? \`<a href="\${v.thumb_file}" target="_blank" class="btn" style="text-align:center;text-decoration:none">🖼 Ver thumbnail</a>\` : ''}
        <button class="btn btn-danger" onclick="deletarVideo()">Excluir vídeo</button>
      </div>
    </div>
  </div>\`;

  document.getElementById('detail-content').innerHTML = \`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div>
        <div style="font-size:22px;font-weight:700;margin-bottom:4px">\${esc(v.titulo)}</div>
        <div style="font-size:13px;color:var(--muted)">\${v.titulo_yt ? esc(v.titulo_yt) : 'Título do YouTube não definido ainda'}</div>
      </div>
      <button class="btn btn-primary" onclick="salvarVideo()">Salvar</button>
    </div>
    <div class="steps-row">\${stepsHtml}</div>
    <div class="detail open">
      <div>
        \${painelBriefing(v)}
        \${painelRoteiro(v)}
        \${painelAvatar(v)}
        \${painelGraficos(v)}
        \${painelThumb(v)}
        \${painelMontagem(v)}
        \${painelYoutube(v)}
      </div>
      \${sidebarHtml}
    </div>\`;

  // Gera thumb automática se não tiver
  if (!v.thumb_file) gerarThumbAutomatica(v);
}

// ── Painéis de cada etapa ─────────────────────────────────────────────────────

function painelBriefing(v) {
  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">1</span> Briefing</div>
    <div class="form-row">
      <label>Título interno</label>
      <input type="text" id="f-titulo" value="\${esc(v.titulo)}" />
    </div>
    <div class="form-row">
      <label>Gancho / ângulo dramático</label>
      <textarea id="f-gancho" rows="3">\${esc(v.gancho||'')}</textarea>
    </div>
    <div class="form-grid">
      <div>
        <label>Tom do mercado</label>
        <select id="f-tom">
          \${['alta','queda','neutro','critico'].map(t =>
            \`<option value="\${t}" \${v.tom===t?'selected':''}>\${t}</option>\`).join('')}
        </select>
      </div>
      <div>
        <label>Duração alvo (min)</label>
        <select id="f-duracao">
          \${[3,4,5].map(d => \`<option value="\${d}" \${v.duracao_min===d?'selected':''}>\${d} min</option>\`).join('')}
        </select>
      </div>
    </div>
  </div>\`;
}

function painelRoteiro(v) {
  const prompt = gerarPromptClaude(v);
  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">2</span> Roteiro</div>
    <div class="prompt-box">
      <p>Copie o prompt abaixo e cole no Claude Pro Max (este chat). Depois cole o roteiro gerado no campo abaixo.</p>
    </div>
    <div class="form-row">
      <label>Prompt para o Claude</label>
      <div class="roteiro-box" id="prompt-claude" style="cursor:pointer;max-height:180px" onclick="copiarPrompt()">\${esc(prompt)}</div>
      <button class="btn" style="margin-top:8px" onclick="copiarPrompt()">📋 Copiar prompt</button>
    </div>
    <div class="form-row" style="margin-top:14px">
      <label>Roteiro gerado (cole aqui)</label>
      <textarea id="f-roteiro" rows="10" placeholder="Cole aqui o roteiro gerado pelo Claude...">\${esc(v.roteiro||'')}</textarea>
    </div>
  </div>\`;
}

function painelAvatar(v) {
  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">3</span> Avatar (HeyGen)</div>
    <div class="prompt-box">
      <p>1. Acesse <strong>heygen.com</strong> → Crie vídeo → Cole o roteiro<br>
         2. Gere e baixe o MP4<br>
         3. Faça upload abaixo</p>
    </div>
    <div class="form-row">
      <label>URL do vídeo no HeyGen (opcional)</label>
      <input type="text" id="f-heygen-url" value="\${esc(v.heygen_url||'')}" placeholder="https://..." />
    </div>
    <div class="form-row">
      <label>Upload do arquivo MP4 do avatar</label>
      <div class="upload-zone" onclick="document.getElementById('up-avatar').click()">
        <input type="file" id="up-avatar" accept="video/*" onchange="uploadArquivo(this,'video')">
        <p>\${v.heygen_file ? '✅ Avatar enviado — clique para substituir' : '📁 Clique para enviar o MP4 do HeyGen'}</p>
      </div>
      \${v.heygen_file ? \`<div class="file-list"><div class="file-item"><a href="\${v.heygen_file}" target="_blank">▶ \${v.heygen_file.split('/').pop()}</a></div></div>\` : ''}
    </div>
  </div>\`;
}

function painelGraficos(v) {
  const lista = v.imagens_lista || [];
  const temRoteiro = !!v.roteiro;

  if (!temRoteiro) {
    return \`<div class="panel">
      <div class="panel-title"><span class="step-num">4</span> Gráficos e imagens</div>
      <div class="prompt-box">
        <p style="color:var(--soft)">⚠️ Complete o roteiro na etapa anterior antes de definir as imagens.</p>
      </div>
    </div>\`;
  }

  if (lista.length === 0) {
    return \`<div class="panel">
      <div class="panel-title"><span class="step-num">4</span> Gráficos e imagens</div>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">Cole o roteiro no Claude Pro Max com o prompt abaixo para descobrir quantas imagens o vídeo precisa e de que tipo.</p>

      <div class="prompt-box" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Prompt para o Claude</span>
          <button class="btn btn-sm" onclick="copiarPromptImagens()">📋 Copiar</button>
        </div>
        <pre id="prompt-imagens" style="white-space:pre-wrap;font-size:12px;line-height:1.6;color:var(--soft)">Analise o roteiro abaixo de um vídeo de análise de criptomoedas e me diga exatamente quais imagens são necessárias para ilustrá-lo.

ROTEIRO:
\${esc(v.roteiro)}

Responda SOMENTE com um array JSON, sem texto adicional, sem markdown, sem explicações. Use este formato:
[
  {
    "index": 1,
    "cena": "Descrição curta da cena ou momento do vídeo onde a imagem aparece",
    "tipo": "grafico",
    "prompt": "Descrição do que deve ser a imagem ou como obtê-la"
  }
]

Tipos permitidos: "grafico" (TradingView/chart), "conceitual" (imagem artística/metafórica), "screenshot" (print de notícia ou site), "outro".
Seja específico no campo "prompt" — descreva o que mostrar na imagem.</pre>
      </div>

      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">Cole aqui a resposta do Claude (JSON):</label>
        <textarea id="json-imagens" rows="8" style="width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:8px;padding:10px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;resize:vertical" placeholder='[{"index":1,"cena":"...","tipo":"grafico","prompt":"..."}]'></textarea>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="aplicarListaImagens()">✅ Aplicar lista</button>
        <button class="btn" onclick="pularEtapaImagens()">⏭ Pular etapa</button>
      </div>
    </div>\`;
  }

  const slots = lista.map((img, i) => {
    const pulada = img.pulada;
    const uploaded = img.asset_url;
    const tipoLabel = { grafico: '📊 Gráfico', conceitual: '🎨 Conceitual', screenshot: '🖥 Screenshot', outro: '📁 Outro' }[img.tipo] || '📁';

    return \`<div style="background:var(--surface3);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;opacity:\${pulada ? 0.45 : 1}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:2px 8px;font-size:11px;color:var(--muted)">#\${img.index}</span>
            <span style="font-size:11px;color:var(--accent2)">\${tipoLabel}</span>
            \${pulada ? '<span style="font-size:11px;color:var(--muted);font-style:italic">pulada</span>' : ''}
            \${uploaded && !pulada ? '<span style="font-size:11px;color:var(--green)">✓ enviada</span>' : ''}
          </div>
          <p style="font-size:13px;color:var(--text);margin-bottom:4px"><strong>\${esc(img.cena)}</strong></p>
          <p style="font-size:12px;color:var(--soft);font-style:italic">\${esc(img.prompt)}</p>
        </div>
        \${uploaded && !pulada
          ? \`<img src="\${uploaded}" style="width:80px;height:55px;object-fit:cover;border-radius:6px;border:1px solid var(--border2);flex-shrink:0">\`
          : ''}
      </div>
      \${!pulada ? \`<div style="margin-top:10px;display:flex;align-items:center;gap:8px">
        <label style="flex:1;border:1px dashed var(--border2);border-radius:6px;padding:8px 12px;text-align:center;cursor:pointer;font-size:12px;color:var(--muted);transition:all 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border2)'">
          \${uploaded ? '🔄 Substituir imagem' : '📤 Enviar imagem'}
          <input type="file" accept="image/*" style="display:none" onchange="uploadImagemSlot(this,\${i})">
        </label>
        <button class="btn btn-sm" onclick="pularSlot(\${i})" style="white-space:nowrap">Pular</button>
      </div>\` : \`<button class="btn btn-sm" style="margin-top:8px" onclick="despularSlot(\${i})">↩ Incluir</button>\`}
    </div>\`;
  });

  const total = lista.length;
  const prontas = lista.filter(i => i.asset_url || i.pulada).length;

  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">4</span> Gráficos e imagens
      <span style="font-size:12px;font-weight:400;color:var(--muted);margin-left:8px">\${prontas}/\${total} concluídas</span>
    </div>
    <div style="margin-bottom:14px">
      \${slots.join('')}
    </div>
    <div class="btn-row">
      <button class="btn" onclick="resetarListaImagens()" style="font-size:12px">🔄 Refazer lista</button>
    </div>
  </div>\`;
}

function painelThumb(v) {
  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">5</span> Thumbnail</div>
    <div id="thumb-container">
      \${v.thumb_file
        ? \`<div class="thumb-preview"><img src="\${v.thumb_file}?t=\${Date.now()}"></div>\`
        : \`<div class="thumb-preview" id="thumb-canvas-wrap"></div>\`}
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="gerarThumbAutomatica(currentVideo, true)">🎨 Gerar thumbnail</button>
      <div>
        <input type="file" id="up-thumb" accept="image/*" style="display:none" onchange="uploadArquivo(this,'thumb')">
        <button class="btn" onclick="document.getElementById('up-thumb').click()">📁 Upload customizado</button>
      </div>
    </div>
  </div>\`;
}

function painelMontagem(v) {
  const hasAvatar  = !!v.heygen_file;
  const hasAssets  = v.assets.length > 0;
  const inputs = [
    hasAvatar ? \`-i "\${v.heygen_file.replace('/data/','data/')}"\` : '-i "data/videos/SEU_AVATAR.mp4"',
    ...v.assets.filter(a=>a.tipo?.startsWith('image')).slice(0,3)
      .map(a => \`-i "\${a.url.replace('/data/','data/')}"\`),
  ].join(' \\\\\n  ');

  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">6</span> Montagem com FFmpeg</div>
    <div class="prompt-box">
      <p>Rode o comando abaixo no terminal, na pasta do projeto. Substitua os arquivos de música e legenda.</p>
    </div>
    <div class="roteiro-box"># Comando FFmpeg para montar o vídeo final
ffmpeg \\
  \${inputs} \\
  -i "data/assets/background_music.mp3" \\
  -filter_complex "
    [0:v]scale=1920:1080[base];
    [1:v]scale=iw*0.4:-1,fade=in:st=15:d=0.4,fade=out:st=74:d=0.4[g1];
    [base][g1]overlay=W-w-40:40:enable='between(t,15,75)'[vout]
  " \\
  -map [vout] -map 0:a \\
  -c:v libx264 -crf 18 -preset fast \\
  -c:a aac -b:a 192k \\
  -movflags +faststart \\
  "output/\${v.titulo.replace(/\\s+/g,'_').slice(0,40)}.mp4"</div>
    <div class="btn-row">
      <button class="btn" onclick="copiarFFmpeg()">📋 Copiar comando</button>
    </div>
    <div class="form-row" style="margin-top:16px">
      <label>Notas de montagem</label>
      <textarea id="f-notas" rows="3" placeholder="Observações, ajustes feitos...">\${esc(v.notas||'')}</textarea>
    </div>
  </div>\`;
}

function painelYoutube(v) {
  return \`<div class="panel">
    <div class="panel-title"><span class="step-num">7</span> Dados para o YouTube</div>
    <div class="form-row">
      <label>Título do YouTube (máx 100 chars)</label>
      <input type="text" id="f-titulo-yt" value="\${esc(v.titulo_yt||'')}" placeholder="Título otimizado para SEO..." maxlength="100" />
      <div style="font-size:10px;color:var(--muted);margin-top:3px" id="titulo-yt-count">\${(v.titulo_yt||'').length}/100</div>
    </div>
    <div class="form-row">
      <label>Descrição</label>
      <textarea id="f-descricao" rows="4" placeholder="Descrição com keywords...">\${esc(v.descricao||'')}</textarea>
    </div>
    <div class="form-row">
      <label>Tags (separadas por vírgula)</label>
      <input type="text" id="f-tags" value="\${esc(v.tags||'')}" placeholder="bitcoin, cripto, análise, BTC..." />
    </div>
  </div>\`;
}

// ── Geração de prompt para o Claude ──────────────────────────────────────────
function gerarPromptClaude(v) {
  const durMin = v.duracao_min || 5;
  const palavrasPorMin = 140;
  const totalPalavras = durMin * palavrasPorMin;

  return \`Você é o roteirista de um canal de YouTube chamado "Cripto Análise" sobre Bitcoin e criptomoedas.

TEMA / GANCHO DO VÍDEO:
"\${v.gancho || 'Análise atual do Bitcoin'}"

TOM DO MERCADO: \${v.tom || 'neutro'}
DURAÇÃO ALVO: \${durMin} minutos (~\${totalPalavras} palavras)

INSTRUÇÕES DO ROTEIRO:
- Escreva como alguém falando ao vivo — natural, direto, com personalidade
- Use drama e especulação: o vídeo deve parecer que vai revelar algo que poucos sabem
- Estrutura obrigatória:
  [GANCHO - 20s] Começa com uma afirmação impactante ou pergunta que prende. Não fale o preço logo de cara.
  [CONTEXTO - 60s] Explica o cenário atual de forma clara mas com tensão
  [ANÁLISE - 120s] A carne do vídeo: dados, padrões, o que os gráficos mostram. Fale sobre suporte/resistência, dominância, sentimento do mercado
  [ESPECULAÇÃO - 60s] "E se..." — os cenários possíveis. Alta ou queda? Por quê? Sem prometer nada, mas criando expectativa
  [CONCLUSÃO + CTA - 20s] Fecha com força. Termine SEMPRE com: "Se inscreva no canal e ative o sininho para não perder a próxima análise!"

ESTILO:
- Evite clichês óbvios como "hoje o bitcoin subiu X%"
- Crie narrativa: o mercado é um personagem, as baleias têm intenções, os pequenos investidores são pegos de surpresa
- Use comparações e metáforas quando ajudar a explicar conceitos técnicos
- Tom: confiante, analítico, com pitadas de suspense

Após o roteiro, gere também (em linhas separadas):
TÍTULO_YT: (título para YouTube, máx 80 chars, com número ou emoção)
DESCRICAO_YT: (2-3 frases com keywords para SEO)
TAGS: (10 tags separadas por vírgula)
TOM_COR: (VERDE se cenário de alta, VERMELHO se queda, AMARELO se neutro)\`;
}

// ── Thumbnail automática ─────────────────────────────────────────────────────
async function gerarThumbAutomatica(v, forcar=false) {
  if (v.thumb_file && !forcar) return;

  const titulo = v.titulo_yt || v.titulo || 'ANÁLISE BITCOIN';
  const tom = v.tom || 'neutro';
  const cor = tom === 'alta' ? '#22c55e' : tom === 'queda' ? '#ef4444' : '#f0b429';
  const emoji = tom === 'alta' ? '📈' : tom === 'queda' ? '📉' : '🔍';

  // Canvas 1280x720
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d');

  // Fundo escuro
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0, 0, 1280, 720);

  // Grade sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x=0; x<1280; x+=80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,720); ctx.stroke(); }
  for (let y=0; y<720; y+=80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1280,y); ctx.stroke(); }

  // Linha de candle simulada (decorativa)
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.15;
  const pts = [0,80,60,200,120,140,180,280,240,180,300,320,360,200,420,260,
               480,160,540,240,600,140,660,200,720,120,780,180,840,80,900,160];
  ctx.beginPath();
  for (let i=0; i<pts.length; i+=2) ctx.lineTo(pts[i]+190, pts[i+1]+200);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Faixa lateral colorida
  const grad = ctx.createLinearGradient(0,0,180,0);
  grad.addColorStop(0, cor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 0, 180, 720);
  ctx.globalAlpha = 1;

  // Logo/canal
  ctx.fillStyle = cor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('₿', 40, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px sans-serif';
  ctx.fillText('CRIPTO ANÁLISE', 75, 78);

  // Badge tom
  const badgeW = 160; const badgeH = 44;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.roundRect(64, 100, badgeW, badgeH, 8);
  ctx.fill();
  ctx.fillStyle = '#08090c';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji + ' ' + tom.toUpperCase(), 64 + badgeW/2, 128);
  ctx.textAlign = 'left';

  // Título principal
  const linhas = quebrarTexto(ctx, titulo.toUpperCase(), 900, 'bold 72px sans-serif');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  linhas.forEach((linha, i) => {
    ctx.fillText(linha, 64, 280 + i * 85);
  });

  // Linha decorativa
  ctx.fillStyle = cor;
  ctx.fillRect(64, 300 + linhas.length * 85, 120, 5);

  // Texto inferior
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '24px sans-serif';
  ctx.fillText('ANÁLISE TÉCNICA E ESPECULAÇÃO', 64, 640);

  // Salva como blob e faz upload
  canvas.toBlob(async blob => {
    const formData = new FormData();
    formData.append('file', blob, 'thumbnail.png');
    const res = await fetch(\`/api/upload/\${v.id}?tipo=thumb\`, { method:'POST', body:formData });
    const data = await res.json();
    await patch(v.id, { thumb_file: data.url, status: etapaAvancada(v.status,'thumb') });

    // Atualiza preview
    const wrap = document.getElementById('thumb-container');
    if (wrap) wrap.innerHTML = \`<div class="thumb-preview"><img src="\${data.url}?t=\${Date.now()}"></div>\`;
    currentVideo.thumb_file = data.url;
    toast('Thumbnail gerada!', 'success');
  }, 'image/png');
}

function quebrarTexto(ctx, texto, maxWidth, fonte) {
  ctx.font = fonte;
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p;
    if (ctx.measureText(teste).width > maxWidth) { linhas.push(atual); atual = p; }
    else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas.slice(0,3);
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function uploadArquivo(input, tipo) {
  const files = Array.from(input.files);
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    toast('Enviando ' + file.name + '...', '');
    const res = await fetch(\`/api/upload/\${currentVideoId}?tipo=\${tipo}\`, { method:'POST', body:formData });
    const data = await res.json();
    if (data.url) {
      toast('✅ ' + file.name + ' enviado!', 'success');
      const nextStatus = tipo === 'video' ? 'graficos' : tipo === 'thumb' ? 'thumb' : null;
      const video = await (await fetch('/api/videos/' + currentVideoId)).json();
      currentVideo = video;
      renderDetalhe(video);
    }
  }
}

// ── Salvar ────────────────────────────────────────────────────────────────────
async function salvarVideo() {
  const dados = {
    titulo:    document.getElementById('f-titulo')?.value,
    gancho:    document.getElementById('f-gancho')?.value,
    tom:       document.getElementById('f-tom')?.value,
    duracao_min: parseInt(document.getElementById('f-duracao')?.value),
    roteiro:   document.getElementById('f-roteiro')?.value,
    heygen_url:document.getElementById('f-heygen-url')?.value,
    notas:     document.getElementById('f-notas')?.value,
    titulo_yt: document.getElementById('f-titulo-yt')?.value,
    descricao: document.getElementById('f-descricao')?.value,
    tags:      document.getElementById('f-tags')?.value,
  };
  // Remove undefined
  Object.keys(dados).forEach(k => dados[k] === undefined && delete dados[k]);

  // Avança status se roteiro preenchido
  if (dados.roteiro && currentVideo.status === 'briefing') dados.status = 'roteiro';

  await patch(currentVideoId, dados);
  const res = await fetch('/api/videos/' + currentVideoId);
  currentVideo = await res.json();
  toast('Salvo!', 'success');
}

async function avancarStatus() {
  const idx = STATUS_ORDER.indexOf(currentVideo.status);
  if (idx < STATUS_ORDER.length - 1) {
    const novoStatus = STATUS_ORDER[idx + 1];
    await patch(currentVideoId, { status: novoStatus });
    const res = await fetch('/api/videos/' + currentVideoId);
    currentVideo = await res.json();
    renderDetalhe(currentVideo);
    toast('Etapa avançada: ' + novoStatus, 'success');
  }
}

function etapaAvancada(atual, etapa) {
  const idxAtual = STATUS_ORDER.indexOf(atual);
  const idxNova  = STATUS_ORDER.indexOf(etapa);
  return idxNova > idxAtual ? etapa : atual;
}

async function deletarVideo() {
  if (!confirm('Excluir este vídeo?')) return;
  await fetch('/api/videos/' + currentVideoId, { method:'DELETE' });
  voltarLista();
  toast('Vídeo excluído', '');
}

// ── Copiar ────────────────────────────────────────────────────────────────────
function copiarPrompt() {
  const texto = document.getElementById('prompt-claude')?.textContent;
  if (texto) { navigator.clipboard.writeText(texto); toast('Prompt copiado!', 'success'); }
}

// ── Imagens guiadas ───────────────────────────────────────────────────────────
function gerarPromptImagens(roteiro) {
  return \`Analise o roteiro abaixo de um vídeo de análise de criptomoedas e me diga exatamente quais imagens são necessárias para ilustrá-lo.

ROTEIRO:
\${roteiro}

Responda SOMENTE com um array JSON, sem texto adicional, sem markdown, sem explicações. Use este formato:
[
  {
    "index": 1,
    "cena": "Descrição curta da cena ou momento do vídeo onde a imagem aparece",
    "tipo": "grafico",
    "prompt": "Descrição do que deve ser a imagem ou como obtê-la"
  }
]

Tipos permitidos: "grafico" (TradingView/chart), "conceitual" (imagem artística/metafórica), "screenshot" (print de notícia ou site), "outro".
Seja específico no campo "prompt" — descreva o que mostrar na imagem.\`;
}

function copiarPromptImagens() {
  const texto = document.getElementById('prompt-imagens')?.textContent;
  if (texto) { navigator.clipboard.writeText(texto); toast('Prompt copiado!', 'success'); }
}

async function aplicarListaImagens() {
  const raw = document.getElementById('json-imagens')?.value.trim();
  if (!raw) { toast('Cole a resposta do Claude primeiro', 'error'); return; }
  let lista;
  try {
    lista = JSON.parse(raw);
    if (!Array.isArray(lista)) throw new Error();
  } catch (_) {
    toast('JSON inválido — verifique a resposta do Claude', 'error');
    return;
  }
  lista = lista.map(item => ({ ...item, pulada: false, asset_url: null }));
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: lista })
  });
  toast(\`\${lista.length} imagens identificadas!\`, 'success');
  await abrirVideo(currentVideoId);
}

async function pularEtapaImagens() {
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: [{ index: 0, cena: 'Etapa pulada', tipo: 'outro', prompt: '', pulada: true, asset_url: null }] })
  });
  await abrirVideo(currentVideoId);
}

async function resetarListaImagens() {
  if (!confirm('Resetar a lista de imagens e começar do zero?')) return;
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: [] })
  });
  await abrirVideo(currentVideoId);
}

async function uploadImagemSlot(input, slotIndex) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(\`/api/upload/\${currentVideoId}?tipo=asset\`, { method: 'POST', body: form });
  if (!res.ok) { toast('Erro no upload', 'error'); return; }
  const { url } = await res.json();
  const lista = [...currentVideo.imagens_lista];
  lista[slotIndex] = { ...lista[slotIndex], asset_url: url, pulada: false };
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: lista })
  });
  toast('Imagem enviada!', 'success');
  await abrirVideo(currentVideoId);
}

async function pularSlot(slotIndex) {
  const lista = [...currentVideo.imagens_lista];
  lista[slotIndex] = { ...lista[slotIndex], pulada: true };
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: lista })
  });
  await abrirVideo(currentVideoId);
}

async function despularSlot(slotIndex) {
  const lista = [...currentVideo.imagens_lista];
  lista[slotIndex] = { ...lista[slotIndex], pulada: false };
  await fetch(\`/api/videos/\${currentVideoId}\`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagens_lista: lista })
  });
  await abrirVideo(currentVideoId);
}

function copiarFFmpeg() {
  const texto = document.querySelector('.roteiro-box')?.textContent;
  if (texto) { navigator.clipboard.writeText(texto); toast('Comando copiado!', 'success'); }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function abrirModalNovo() { document.getElementById('modal-novo').classList.add('open'); }
function fecharModal() { document.getElementById('modal-novo').classList.remove('open'); }

async function criarVideo() {
  const titulo = document.getElementById('novo-titulo').value.trim();
  if (!titulo) { toast('Digite um título', 'error'); return; }
  const res = await fetch('/api/videos', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      titulo,
      gancho: document.getElementById('novo-gancho').value,
      tom: document.getElementById('novo-tom').value,
      duracao_min: parseInt(document.getElementById('novo-duracao').value),
    })
  });
  const { id } = await res.json();
  fecharModal();
  abrirVideo(id);
}

// ── Config ────────────────────────────────────────────────────────────────────
async function carregarConfig() {
  const cfg = await (await fetch('/api/config')).json();
  document.getElementById('cfg-heygen').value  = cfg.heygen_api_key || '';
  document.getElementById('cfg-openai').value  = cfg.openai_api_key || '';
  document.getElementById('cfg-avatar-id').value = cfg.heygen_avatar_id || '';
  document.getElementById('cfg-canal').value   = cfg.canal_nome || '';
  document.getElementById('cfg-cta').value     = cfg.canal_cta || '';
  document.getElementById('st-heygen').className = 'key-status' + (cfg.heygen_api_key ? ' ok' : '');
  document.getElementById('st-openai').className  = 'key-status' + (cfg.openai_api_key  ? ' ok' : '');
}

async function salvarConfig() {
  await fetch('/api/config', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      heygen_api_key:  document.getElementById('cfg-heygen').value,
      openai_api_key:  document.getElementById('cfg-openai').value,
      heygen_avatar_id:document.getElementById('cfg-avatar-id').value,
      canal_nome:      document.getElementById('cfg-canal').value,
      canal_cta:       document.getElementById('cfg-cta').value,
    })
  });
  toast('Configurações salvas!', 'success');
  carregarConfig();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function patch(id, data) {
  await fetch('/api/videos/' + id, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg, tipo) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (tipo ? ' '+tipo : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function irParaStep(key) {
  // Scroll até o painel correspondente
  const panelMap = { briefing:0, roteiro:1, avatar:2, graficos:3, thumb:4, montagem:5, pronto:6 };
  const panels = document.querySelectorAll('.panel');
  if (panels[panelMap[key]]) panels[panelMap[key]].scrollIntoView({ behavior:'smooth', block:'start' });
}

// Contador de chars no título YT
document.addEventListener('input', e => {
  if (e.target.id === 'f-titulo-yt') {
    const count = document.getElementById('titulo-yt-count');
    if (count) count.textContent = e.target.value.length + '/100';
  }
});

// Fecha modal ao clicar fora
document.getElementById('modal-novo').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

// ── Init ──────────────────────────────────────────────────────────────────────
carregarVideos();
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║      CRIPTO CRM — rodando!            ║
║  Abra: http://localhost:${PORT}          ║
╚═══════════════════════════════════════╝
  `);
});
