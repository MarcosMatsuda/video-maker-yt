import { Router, Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';

const router = Router();

interface NewsItem {
  titulo: string;
  link: string;
  fonte: string;
  data: string;
}

const FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', fonte: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss', fonte: 'CoinTelegraph' },
  { url: 'https://bitcoinmagazine.com/feed', fonte: 'Bitcoin Magazine' },
];

async function fetchFeed(url: string, fonte: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CriptoNewsBot/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser();
    const parsed = parser.parse(xml);

    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const list = Array.isArray(items) ? items : [items];

    return list.slice(0, 10).map((item: any) => ({
      titulo: item.title || '',
      link: item.link || item.guid || '',
      fonte,
      data: item.pubDate || item.published || '',
    }));
  } catch {
    return [];
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const results = await Promise.allSettled(
    FEEDS.map((f) => fetchFeed(f.url, f.fonte)),
  );

  const news: NewsItem[] = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((n) => n.titulo)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 15);

  res.json(news);
});

export default router;
