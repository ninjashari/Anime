/**
 * Dashboard API service for fetching statistics
 */
import { api, handleApiError } from './api';
import { DashboardResponse } from '../types/dashboard';

export const dashboardApi = {
  /**
   * Get comprehensive dashboard statistics
   */
  getStats: async (): Promise<DashboardResponse> => {
    try {
      const response = await api.get<DashboardResponse>('/dashboard/stats');
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Get total anime count
   */
  getAnimeCount: async (): Promise<{ total_anime_count: number }> => {
    try {
      const response = await api.get('/dashboard/stats/anime-count');
      return response.data.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Get total episodes watched
   */
  getEpisodesWatched: async (): Promise<{ total_episodes_watched: number }> => {
    try {
      const response = await api.get('/dashboard/stats/episodes-watched');
      return response.data.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Get mean score
   */
  getMeanScore: async (): Promise<{ mean_score: number | null }> => {
    try {
      const response = await api.get('/dashboard/stats/mean-score');
      return response.data.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Get score distribution
   */
  getScoreDistribution: async (): Promise<{ score_distribution: Array<{ score: number; count: number }> }> => {
    try {
      const response = await api.get('/dashboard/stats/score-distribution');
      return response.data.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  }
};