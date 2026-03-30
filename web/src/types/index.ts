export interface Video {
  id: number;
  titulo: string;
  gancho: string;
  status: VideoStatus;
  roteiro: string;
  heygen_url: string;
  heygen_file: string;
  thumb_file: string;
  assets: Asset[];
  imagens_lista: ImageSlot[];
  titulo_yt: string;
  descricao: string;
  tags: string;
  notas: string;
  tom: Tom;
  duracao_min: number;
  criado_em: string;
  atualizado: string;
  publicado: number;
}

export type VideoStatus =
  | 'briefing'
  | 'roteiro'
  | 'avatar'
  | 'legenda'
  | 'graficos'
  | 'thumb'
  | 'montagem'
  | 'pronto'
  | 'publicado';

export type Tom = 'alta' | 'queda' | 'neutro' | 'critico';

export interface Asset {
  url: string;
  nome: string;
  tipo: string;
  tamanho: number;
}

export interface ImageSlot {
  index: number;
  cena: string;
  tipo: 'grafico' | 'conceitual' | 'screenshot' | 'outro';
  prompt: string;
  asset_url: string | null;
  pulada: boolean;
}

export interface Config {
  heygen_api_key: string;
  openai_api_key: string;
  heygen_avatar_id: string;
  canal_nome: string;
  canal_cta: string;
}

export interface Step {
  key: VideoStatus;
  label: string;
}

export const STEPS: Step[] = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'roteiro', label: 'Roteiro' },
  { key: 'avatar', label: 'Avatar' },
  { key: 'legenda', label: 'Legenda' },
  { key: 'graficos', label: 'Gráficos' },
  { key: 'thumb', label: 'Thumbnail' },
  { key: 'montagem', label: 'Montagem' },
  { key: 'pronto', label: 'YouTube' },
];

export const STATUS_ORDER: VideoStatus[] = [
  'briefing', 'roteiro', 'avatar', 'legenda', 'graficos', 'thumb', 'montagem', 'pronto', 'publicado',
];

export const TOM_CONFIG: Record<Tom, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'text-green' },
  queda: { label: 'Queda', color: 'text-red' },
  neutro: { label: 'Neutro', color: 'text-soft' },
  critico: { label: 'Crítico', color: 'text-red' },
};
