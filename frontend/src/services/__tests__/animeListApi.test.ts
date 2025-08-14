import { animeListApi } from '../animeListApi';
import { api } from '../api';
import { AnimeListResponse, AnimeListItem } from '../../types/anime';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockAnimeListItem: AnimeListItem = {
  id: 1,
  user_id: 1,
  anime_id: 123,
  status: 'watching',
  score: 8,
  episodes_watched: 5,
  start_date: '2024-01-01',
  finish_date: null,
  notes: 'Great anime!',
  anime: {
    id: 123,
    mal_id: 123,
    title: 'Test Anime',
    title_english: 'Test Anime English',
    synopsis: 'A test anime',
    episodes: 12,
    status: 'finished_airing',
    aired_from: '2024-01-01',
    aired_to: '2024-03-31',
    score: 8.5,
    rank: 100,
    popularity: 50,
    image_url: 'https://example.com/image.jpg'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockAnimeListResponse: AnimeListResponse = {
  items: [mockAnimeListItem],
  total: 1,
  page: 1,
  per_page: 20,
  has_next: false,
  has_prev: false
};

describe('animeListApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnimeList', () => {
    it('fetches anime list successfully', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          data: mockAnimeListResponse,
          success: true
        }
      } as any);

      const result = await animeListApi.getAnimeList('watching');

      expect(mockedApi.get).toHaveBeenCalledWith('/anime/lists/watching', {});
      expect(result).toEqual(mockAnimeListResponse);
    });

    it('fetches anime list with parameters', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          data: mockAnimeListResponse,
          success: true
        }
      } as any);

      const params = {
        page: 2,
        per_page: 10,
        sort_by: 'title' as const,
        sort_order: 'asc' as const
      };

      await animeListApi.getAnimeList('completed', params);

      expect(mockedApi.get).toHaveBeenCalledWith('/anime/lists/completed', params);
    });

    it('throws error when API call fails', async () => {
      const errorMessage = 'Network error';
      mockedApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.getAnimeList('watching')).rejects.toThrow(errorMessage);
    });
  });

  describe('updateAnimeStatus', () => {
    it('updates anime status successfully', async () => {
      mockedApi.put.mockResolvedValue({
        data: {
          data: mockAnimeListItem,
          success: true
        }
      } as any);

      const result = await animeListApi.updateAnimeStatus(123, 'completed');

      expect(mockedApi.put).toHaveBeenCalledWith('/anime/123/status', { status: 'completed' });
      expect(result).toEqual(mockAnimeListItem);
    });

    it('throws error when status update fails', async () => {
      const errorMessage = 'Update failed';
      mockedApi.put.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.updateAnimeStatus(123, 'completed')).rejects.toThrow(errorMessage);
    });
  });

  describe('updateEpisodeProgress', () => {
    it('updates episode progress successfully', async () => {
      mockedApi.put.mockResolvedValue({
        data: {
          data: mockAnimeListItem,
          success: true
        }
      } as any);

      const result = await animeListApi.updateEpisodeProgress(123, 10);

      expect(mockedApi.put).toHaveBeenCalledWith('/anime/123/progress', { episodes_watched: 10 });
      expect(result).toEqual(mockAnimeListItem);
    });

    it('throws error when progress update fails', async () => {
      const errorMessage = 'Progress update failed';
      mockedApi.put.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.updateEpisodeProgress(123, 10)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateAnimeListItem', () => {
    it('updates anime list item successfully', async () => {
      mockedApi.put.mockResolvedValue({
        data: {
          data: mockAnimeListItem,
          success: true
        }
      } as any);

      const updates = {
        score: 9,
        notes: 'Updated notes'
      };

      const result = await animeListApi.updateAnimeListItem(123, updates);

      expect(mockedApi.put).toHaveBeenCalledWith('/anime/123', updates);
      expect(result).toEqual(mockAnimeListItem);
    });

    it('throws error when item update fails', async () => {
      const errorMessage = 'Item update failed';
      mockedApi.put.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.updateAnimeListItem(123, { score: 9 })).rejects.toThrow(errorMessage);
    });
  });

  describe('removeAnime', () => {
    it('removes anime successfully', async () => {
      mockedApi.delete.mockResolvedValue({} as any);

      await animeListApi.removeAnime(123);

      expect(mockedApi.delete).toHaveBeenCalledWith('/anime/123');
    });

    it('throws error when removal fails', async () => {
      const errorMessage = 'Removal failed';
      mockedApi.delete.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.removeAnime(123)).rejects.toThrow(errorMessage);
    });
  });

  describe('getAnimeListItem', () => {
    it('fetches single anime list item successfully', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          data: mockAnimeListItem,
          success: true
        }
      } as any);

      const result = await animeListApi.getAnimeListItem(123);

      expect(mockedApi.get).toHaveBeenCalledWith('/anime/123');
      expect(result).toEqual(mockAnimeListItem);
    });

    it('throws error when fetching item fails', async () => {
      const errorMessage = 'Fetch failed';
      mockedApi.get.mockRejectedValue(new Error(errorMessage));

      await expect(animeListApi.getAnimeListItem(123)).rejects.toThrow(errorMessage);
    });
  });
});