import { api, handleApiError } from './api';
import { 
  AnimeListResponse, 
  AnimeListItem, 
  AnimeListItemUpdate,
  AnimeStatus 
} from '../types/anime';

export interface AnimeListApiParams {
  page?: number;
  per_page?: number;
  // Note: sort_by and sort_order are handled client-side for now
  // sort_by?: string;
  // sort_order?: 'asc' | 'desc';
}

export const animeListApi = {
  /**
   * Get anime list by status
   */
  getAnimeList: async (
    status: AnimeStatus, 
    params: AnimeListApiParams = {}
  ): Promise<AnimeListResponse> => {
    try {
      // Add status to the query parameters, filtering out unsupported params
      const queryParams = {
        page: params.page,
        per_page: params.per_page,
        status: status
      };
      
      const response = await api.get<AnimeListResponse>(
        `/anime-lists`,
        queryParams
      );
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Update anime status
   */
  updateAnimeStatus: async (
    animeId: number, 
    status: AnimeStatus
  ): Promise<AnimeListItem> => {
    try {
      const response = await api.put<AnimeListItem>(
        `/anime-lists/${animeId}`,
        { status }
      );
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Update episode progress
   */
  updateEpisodeProgress: async (
    animeId: number, 
    episodes_watched: number
  ): Promise<AnimeListItem> => {
    try {
      const response = await api.put<AnimeListItem>(
        `/anime-lists/${animeId}/progress`,
        { episodes_watched }
      );
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Update anime list item
   */
  updateAnimeListItem: async (
    animeId: number, 
    updates: AnimeListItemUpdate
  ): Promise<AnimeListItem> => {
    try {
      const response = await api.put<AnimeListItem>(
        `/anime-lists/${animeId}`,
        updates
      );
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Remove anime from list
   */
  removeAnime: async (animeId: number): Promise<void> => {
    try {
      await api.delete(`/anime-lists/${animeId}`);
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Get single anime list item
   */
  getAnimeListItem: async (animeId: number): Promise<AnimeListItem> => {
    try {
      const response = await api.get<AnimeListItem>(
        `/anime-lists/${animeId}`
      );
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  }
};