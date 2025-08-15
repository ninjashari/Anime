/**
 * Types for AniDB mapping management
 */

export interface AniDBMapping {
  id: number;
  anidb_id: number;
  mal_id?: number;
  title?: string;
  confidence_score?: number;
  source: 'manual' | 'auto' | 'github_file' | 'jellyfin_webhook';
  created_at: string;
  updated_at: string;
}

export interface MappingListResponse {
  mappings: AniDBMapping[];
  total: number;
  limit: number;
  offset: number;
}

export interface MappingStatistics {
  total_mappings: number;
  mapped_count: number;
  unmapped_count: number;
  manual_count: number;
  auto_count: number;
  github_count: number;
  average_confidence?: number;
}

export interface MappingSearchRequest {
  query: string;
  limit?: number;
}

export interface MappingCreateRequest {
  anidb_id: number;
  mal_id?: number;
  title?: string;
  confidence_score?: number;
  source?: string;
}

export interface MappingUpdateRequest {
  mal_id?: number;
  title?: string;
  confidence_score?: number;
  source?: string;
}

export interface MappingRefreshRequest {
  source_url?: string;
}

export interface MappingRefreshResponse {
  loaded: number;
  updated: number;
  errors: number;
  message: string;
}

export interface BulkMappingOperation {
  operation: 'delete' | 'update_source' | 'refresh_confidence';
  mapping_ids: number[];
  data?: any;
}

export type MappingSortField = 'anidb_id' | 'mal_id' | 'title' | 'confidence_score' | 'source' | 'created_at' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface MappingFilters {
  source?: string;
  has_mal_id?: boolean;
  min_confidence?: number;
  max_confidence?: number;
}

export const MAPPING_SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  auto: 'Automatic',
  github_file: 'GitHub File',
  jellyfin_webhook: 'Jellyfin Webhook'
};

export const MAPPING_SOURCE_COLORS: Record<string, string> = {
  manual: '#4caf50',
  auto: '#2196f3',
  github_file: '#ff9800',
  jellyfin_webhook: '#9c27b0'
};