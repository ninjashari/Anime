/**
 * Dashboard API service tests
 */
import { dashboardApi } from '../dashboardApi';
import { api, handleApiError } from '../api';
import { DashboardResponse } from '../../types/dashboard';

// Mock the api module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  },
  handleApiError: jest.fn()
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>;

describe('dashboardApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleApiError.mockImplementation((error) => ({
      message: error.message || 'API Error',
      status: 500
    }));
  });

  describe('getStats', () => {
    it('fetches dashboard statistics successfully', async () => {
      const mockResponse: DashboardResponse = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          total_anime_count: 100,
          total_episodes_watched: 1200,
          time_spent_watching: {
            minutes: 28800,
            hours: 480,
            days: 20
          },
          time_to_complete_planned: {
            minutes: 7200,
            hours: 120,
            days: 5
          },
          mean_score: 7.8,
          score_distribution: [
            { score: 1, count: 0 },
            { score: 2, count: 1 },
            { score: 3, count: 2 },
            { score: 4, count: 3 },
            { score: 5, count: 5 },
            { score: 6, count: 8 },
            { score: 7, count: 12 },
            { score: 8, count: 15 },
            { score: 9, count: 8 },
            { score: 10, count: 3 }
          ],
          status_breakdown: {
            watching: 5,
            completed: 80,
            on_hold: 2,
            dropped: 3,
            plan_to_watch: 10
          }
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getStats();

      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
      expect(result).toEqual(mockResponse);
    });

    it('handles API error correctly', async () => {
      const errorMessage = 'Network error';
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(dashboardApi.getStats()).rejects.toThrow(errorMessage);
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
    });
  });

  describe('getAnimeCount', () => {
    it('fetches anime count successfully', async () => {
      const mockResponse = {
        success: true,
        data: { total_anime_count: 150 },
        message: 'Anime count retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getAnimeCount();

      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats/anime-count');
      expect(result).toEqual({ total_anime_count: 150 });
    });

    it('handles API error correctly', async () => {
      const errorMessage = 'Failed to fetch anime count';
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(dashboardApi.getAnimeCount()).rejects.toThrow(errorMessage);
    });
  });

  describe('getEpisodesWatched', () => {
    it('fetches episodes watched successfully', async () => {
      const mockResponse = {
        success: true,
        data: { total_episodes_watched: 2000 },
        message: 'Episodes watched count retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getEpisodesWatched();

      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats/episodes-watched');
      expect(result).toEqual({ total_episodes_watched: 2000 });
    });

    it('handles API error correctly', async () => {
      const errorMessage = 'Failed to fetch episodes watched';
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(dashboardApi.getEpisodesWatched()).rejects.toThrow(errorMessage);
    });
  });

  describe('getMeanScore', () => {
    it('fetches mean score successfully', async () => {
      const mockResponse = {
        success: true,
        data: { mean_score: 8.5 },
        message: 'Mean score retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getMeanScore();

      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats/mean-score');
      expect(result).toEqual({ mean_score: 8.5 });
    });

    it('handles null mean score correctly', async () => {
      const mockResponse = {
        success: true,
        data: { mean_score: null },
        message: 'Mean score retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getMeanScore();

      expect(result).toEqual({ mean_score: null });
    });

    it('handles API error correctly', async () => {
      const errorMessage = 'Failed to fetch mean score';
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(dashboardApi.getMeanScore()).rejects.toThrow(errorMessage);
    });
  });

  describe('getScoreDistribution', () => {
    it('fetches score distribution successfully', async () => {
      const mockScoreDistribution = [
        { score: 1, count: 0 },
        { score: 2, count: 1 },
        { score: 3, count: 2 },
        { score: 4, count: 3 },
        { score: 5, count: 5 },
        { score: 6, count: 8 },
        { score: 7, count: 12 },
        { score: 8, count: 15 },
        { score: 9, count: 8 },
        { score: 10, count: 3 }
      ];

      const mockResponse = {
        success: true,
        data: { score_distribution: mockScoreDistribution },
        message: 'Score distribution retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getScoreDistribution();

      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats/score-distribution');
      expect(result).toEqual({ score_distribution: mockScoreDistribution });
    });

    it('handles empty score distribution correctly', async () => {
      const mockResponse = {
        success: true,
        data: { score_distribution: [] },
        message: 'Score distribution retrieved successfully'
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await dashboardApi.getScoreDistribution();

      expect(result).toEqual({ score_distribution: [] });
    });

    it('handles API error correctly', async () => {
      const errorMessage = 'Failed to fetch score distribution';
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(dashboardApi.getScoreDistribution()).rejects.toThrow(errorMessage);
    });
  });
});