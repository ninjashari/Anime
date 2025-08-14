/**
 * Anime types for API responses and component props
 */

export interface AnimeInfo {
  id: number;
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  episodes?: number;
  status?: string;
  aired_from?: string;
  aired_to?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  image_url?: string;
}

export interface AnimeListItem {
  id: number;
  user_id: number;
  anime_id: number;
  status: AnimeStatus;
  score?: number;
  episodes_watched: number;
  start_date?: string;
  finish_date?: string;
  notes?: string;
  anime: AnimeInfo;
  created_at: string;
  updated_at: string;
}

export type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface AnimeListResponse {
  items: AnimeListItem[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface AnimeListItemUpdate {
  status?: AnimeStatus;
  score?: number;
  episodes_watched?: number;
  start_date?: string;
  finish_date?: string;
  notes?: string;
}

export interface EpisodeProgressUpdate {
  episodes_watched: number;
}

// Component prop types
export interface AnimeCardProps {
  anime: AnimeListItem;
  onStatusChange: (animeId: number, status: AnimeStatus) => void;
  onProgressUpdate: (animeId: number, episodes: number) => void;
  onScoreUpdate: (animeId: number, score: number) => void;
  onRemove: (animeId: number) => void;
  onViewDetails: (anime: AnimeListItem) => void;
  loading?: boolean;
}

export interface StatusSelectorProps {
  currentStatus: AnimeStatus;
  onStatusChange: (status: AnimeStatus) => void;
  disabled?: boolean;
}

export interface ProgressUpdaterProps {
  currentProgress: number;
  totalEpisodes?: number;
  onProgressUpdate: (episodes: number) => void;
  disabled?: boolean;
}

export interface AnimeModalProps {
  anime: AnimeListItem | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (animeId: number, status: AnimeStatus) => void;
  onProgressUpdate: (animeId: number, episodes: number) => void;
  onScoreUpdate: (animeId: number, score: number) => void;
  onRemove: (animeId: number) => void;
}

export interface AnimeListPageProps {
  status: AnimeStatus;
  title: string;
}

export const ANIME_STATUS_LABELS: Record<AnimeStatus, string> = {
  watching: 'Currently Watching',
  completed: 'Completed',
  on_hold: 'On Hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to Watch'
};

export const ANIME_STATUS_COLORS: Record<AnimeStatus, string> = {
  watching: '#4caf50',
  completed: '#2196f3',
  on_hold: '#ff9800',
  dropped: '#f44336',
  plan_to_watch: '#9c27b0'
};