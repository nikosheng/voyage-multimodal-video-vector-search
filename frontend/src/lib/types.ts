export interface Flavor {
  id: string;
  name_zh: string;
  taste: string;
  action_label: string;
  emoji: string;
  color_hex: string;
  image_url?: string | null;
  description?: string;
  is_fallback: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TopKMatch {
  flavor_id: string;
  score: number;
}

export interface WishResponse {
  flavor: {
    id: string;
    name_zh: string;
    taste: string;
    emoji: string;
    color_hex: string;
    image_url?: string | null;
    description?: string;
  };
  is_fallback: boolean;
  confidence: number;
  top_k: TopKMatch[];
  latency_ms: number;
}

export interface Prototype {
  id: string;
  flavor_id: string;
  modality: "text" | "video";
  text_content?: string | null;
  source_video_gridfs_id?: string | null;
  embedding_model: string;
  embedding_dim: number;
  is_active: boolean;
  created_at: string;
}

export interface AppSettings {
  embedding_model: string;
  vector_index_name: string;
  top_k: number;
  num_candidates: number;
  confidence_threshold: number;
  fallback_flavor_id: string | null;
}

export interface DashboardFlavorStat {
  flavor_id: string;
  name_zh: string;
  emoji: string;
  color_hex: string;
  count: number;
}
