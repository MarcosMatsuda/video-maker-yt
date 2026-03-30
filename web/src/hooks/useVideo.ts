import { useState, useEffect, useCallback } from 'react';
import type { Video } from '../types';
import { videoApi } from '../lib/api';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await videoApi.list();
      setVideos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { videos, loading, reload };
}

export function useVideoDetail(id: number | null) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await videoApi.get(id);
      setVideo(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (data: Partial<Video>) => {
    if (!id) return;
    await videoApi.update(id, data);
    await reload();
  }, [id, reload]);

  return { video, loading, reload, save };
}
