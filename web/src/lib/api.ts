import type { Video, Config } from '../types';

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const videoApi = {
  list: () => apiFetch<Video[]>('/videos'),
  get: (id: number) => apiFetch<Video>(`/videos/${id}`),
  create: (data: Partial<Video>) =>
    apiFetch<{ id: number }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Video>) =>
    apiFetch<{ ok: boolean }>(`/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/videos/${id}`, { method: 'DELETE' }),
};

export interface NewsItem {
  titulo: string;
  link: string;
  fonte: string;
  data: string;
}

export const newsApi = {
  list: () => apiFetch<NewsItem[]>('/news'),
};

export interface MontagemStatus {
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: string;
  output?: string;
  error?: string;
}

export interface LegendaStatus {
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: string;
  srt?: string;
  error?: string;
}

export const legendaApi = {
  start: (videoId: number) =>
    apiFetch<LegendaStatus>(`/legenda/${videoId}`, { method: 'POST' }),
  status: (videoId: number) =>
    apiFetch<LegendaStatus>(`/legenda/${videoId}/status`),
  getSrt: async (videoId: number): Promise<string> => {
    const res = await fetch(`/api/legenda/${videoId}/srt`);
    if (!res.ok) throw new Error('SRT not found');
    return res.text();
  },
};

export const montagemApi = {
  start: (videoId: number) =>
    apiFetch<MontagemStatus>(`/montagem/${videoId}`, { method: 'POST' }),
  status: (videoId: number) =>
    apiFetch<MontagemStatus>(`/montagem/${videoId}/status`),
};

export const configApi = {
  get: () => apiFetch<Config>('/config'),
  save: (config: Partial<Config>) =>
    apiFetch<{ ok: boolean }>('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};

export async function uploadFile(
  videoId: number,
  file: File | Blob,
  tipo: 'video' | 'thumb' | 'asset',
): Promise<{ url: string; filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload/${videoId}?tipo=${tipo}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return res.json();
}
