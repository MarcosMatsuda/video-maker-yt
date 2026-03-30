import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const THUMBS_DIR = path.join(DATA_DIR, 'thumbnails');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');

[DATA_DIR, VIDEOS_DIR, THUMBS_DIR, ASSETS_DIR].forEach((d) =>
  fs.mkdirSync(d, { recursive: true }),
);

const db = new Database(path.join(DATA_DIR, 'crm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo          TEXT NOT NULL,
    gancho          TEXT,
    status          TEXT DEFAULT 'briefing',
    roteiro         TEXT,
    heygen_url      TEXT,
    heygen_file     TEXT,
    thumb_file      TEXT,
    assets          TEXT DEFAULT '[]',
    imagens_lista   TEXT DEFAULT '[]',
    titulo_yt       TEXT,
    descricao       TEXT,
    tags            TEXT,
    notas           TEXT,
    tom             TEXT DEFAULT 'neutro',
    duracao_min     INTEGER DEFAULT 5,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado      DATETIME DEFAULT CURRENT_TIMESTAMP,
    publicado       INTEGER DEFAULT 0
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

// Migration: add imagens_lista for existing databases
try {
  db.exec(`ALTER TABLE videos ADD COLUMN imagens_lista TEXT DEFAULT '[]'`);
} catch (_) {
  /* column already exists */
}

export { db, DATA_DIR, VIDEOS_DIR, THUMBS_DIR, ASSETS_DIR };
