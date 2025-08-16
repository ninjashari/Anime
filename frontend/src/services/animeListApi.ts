import { api, handleApiError, ApiResponse } from './api';
import { 
  AnimeListResponse, 
  AnimeListItem, 
  AnimeListItemUpdate, 
  EpisodeProgressUpdate,
  AnimeStatus 
} from '../types/anime';

export interface AnimeListApiParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
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
      const response = await api.get<ApiResponse<AnimeListResponse>>(
        `/anime/lists/${status}`,
        params
      );
      return response.data.data;
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
      const response = await api.put<ApiResponse<AnimeListItem>>(
        `/anime/${animeId}/status`,
        { status }
      );
      return response.data.data;
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
      const response = await api.put<ApiResponse<AnimeListItem>>(
        `/anime/${animeId}/progress`,
        { episodes_watched }
      );
      return response.data.data;
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
      const response = await api.put<ApiResponse<AnimeListItem>>(
        `/anime/${animeId}`,
        updates
      );
      return response.data.data;
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
      await api.delete(`/anime/${animeId}`);
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
      const response = await api.get<ApiResponse<AnimeListItem>>(
        `/anime/${animeId}`
      );
      return response.data.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  }
};