import express from 'express';
import cors from 'cors';
import { DATA_DIR } from './database';
import videosRouter from './routes/videos';
import uploadRouter from './routes/upload';
import configRouter from './routes/config';
import newsRouter from './routes/news';
import montagemRouter from './routes/montagem';
import legendaRouter from './routes/legenda';

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/data', express.static(DATA_DIR));

app.use('/api/videos', videosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/config', configRouter);
app.use('/api/news', newsRouter);
app.use('/api/montagem', montagemRouter);
app.use('/api/legenda', legendaRouter);

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
