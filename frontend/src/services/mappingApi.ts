/**
 * API service for AniDB mapping management
 */
import { api, handleApiError } from './api';
import {
  AniDBMapping,
  MappingListResponse,
  MappingStatistics,
  MappingSearchRequest,
  MappingCreateRequest,
  MappingUpdateRequest,
  MappingRefreshRequest,
  MappingRefreshResponse,
  MappingFilters,
  MappingSortField,
  SortOrder
} from '../types/mapping';

export interface MappingListParams {
  limit?: number;
  offset?: number;
  source_filter?: string;
  sort_by?: MappingSortField;
  sort_order?: SortOrder;
}

class MappingApiService {
  private baseUrl = '/anidb-mappings';

  /**
   * Get paginated list of mappings with optional filtering
   */
  async getMappings(params: MappingListParams = {}): Promise<MappingListResponse> {
    try {
      const response = await api.get<MappingListResponse>(this.baseUrl, params);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get unmapped entries (AniDB IDs without MAL mappings)
   */
  async getUnmappedEntries(limit: number = 100): Promise<AniDBMapping[]> {
    try {
      const response = await api.get<AniDBMapping[]>(`${this.baseUrl}/unmapped`, { limit });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get mapping statistics
   */
  async getStatistics(): Promise<MappingStatistics> {
    try {
      const response = await api.get<MappingStatistics>(`${this.baseUrl}/statistics`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get specific mapping by AniDB ID
   */
  async getMapping(anidbId: number): Promise<AniDBMapping> {
    try {
      const response = await api.get<AniDBMapping>(`${this.baseUrl}/${anidbId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Create new mapping
   */
  async createMapping(data: MappingCreateRequest): Promise<AniDBMapping> {
    try {
      const response = await api.post<AniDBMapping>(this.baseUrl, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update existing mapping
   */
  async updateMapping(anidbId: number, data: MappingUpdateRequest): Promise<AniDBMapping> {
    try {
      const response = await api.put<AniDBMapping>(`${this.baseUrl}/${anidbId}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete mapping
   */
  async deleteMapping(anidbId: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${anidbId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Search mappings by title or ID
   */
  async searchMappings(searchData: MappingSearchRequest): Promise<AniDBMapping[]> {
    try {
      const response = await api.post<AniDBMapping[]>(`${this.baseUrl}/search`, searchData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Refresh mapping data from external sources
   */
  async refreshMappingData(request?: MappingRefreshRequest): Promise<MappingRefreshResponse> {
    try {
      const response = await api.post<MappingRefreshResponse>(`${this.baseUrl}/refresh`, request);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Lookup MAL ID for AniDB ID
   */
  async lookupMalId(anidbId: number): Promise<{ anidb_id: number; mal_id: number }> {
    try {
      const response = await api.get<{ anidb_id: number; mal_id: number }>(`${this.baseUrl}/lookup/${anidbId}/mal-id`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Calculate confidence score for potential mapping
   */
  async calculateConfidenceScore(
    anidbTitle: string, 
    malTitle: string, 
    additionalFactors?: any
  ): Promise<{ confidence_score: number; anidb_title: string; mal_title: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/confidence-score`, {
        anidb_title: anidbTitle,
        mal_title: malTitle,
        additional_factors: additionalFactors
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Bulk delete mappings
   */
  async bulkDeleteMappings(anidbIds: number[]): Promise<void> {
    try {
      await Promise.all(anidbIds.map(id => this.deleteMapping(id)));
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Bulk update mapping source
   */
  async bulkUpdateSource(anidbIds: number[], source: string): Promise<void> {
    try {
      await Promise.all(anidbIds.map(id => this.updateMapping(id, { source })));
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const mappingApi = new MappingApiService();
export default mappingApi;