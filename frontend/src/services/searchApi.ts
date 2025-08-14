import { api, handleApiError } from './api';

// Types for search functionality
export interface SearchAnimeResult {
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  episodes?: number;
  status?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  image_url?: string;
  media_type?: string;
  source?: string;
  rating?: string;
  start_date?: string;
  end_date?: string;
  genres: string[];
  studios: string[];
  in_user_list: boolean;
  user_list_status?: string;
}

export interface SearchResponse {
  results: SearchAnimeResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
  has_next: boolean;
  cached: boolean;
}

export interface AddToListRequest {
  mal_id: number;
  status: string;
  score?: number;
  episodes_watched?: number;
}

export interface AddToListResponse {
  success: boolean;
  message: string;
  anime_id?: number;
  list_item_id?: number;
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  result_count: number;
  created_at: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  total: number;
}

export interface SearchSuggestionResponse {
  suggestions: string[];
}

export const searchApi = {
  // Search for anime
  searchAnime: async (
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<SearchResponse> => {
    try {
      const response = await api.get<SearchResponse>('/search/anime', {
        query,
        limit,
        offset
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Add anime to user's list
  addToList: async (request: AddToListRequest): Promise<AddToListResponse> => {
    try {
      const response = await api.post<AddToListResponse>('/search/anime/add', request);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get search history
  getSearchHistory: async (limit: number = 20): Promise<SearchHistoryResponse> => {
    try {
      const response = await api.get<SearchHistoryResponse>('/search/history', {
        limit
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get search suggestions
  getSearchSuggestions: async (
    query: string = '',
    limit: number = 10
  ): Promise<SearchSuggestionResponse> => {
    try {
      const response = await api.get<SearchSuggestionResponse>('/search/suggestions', {
        query,
        limit
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Clear search history
  clearSearchHistory: async (): Promise<{ message: string; deleted_count: number }> => {
    try {
      const response = await api.delete('/search/history');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete specific search history item
  deleteSearchHistoryItem: async (historyId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/search/history/${historyId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};