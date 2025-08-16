import { api, handleApiError } from './api';

// Types for sync API
export interface SyncTaskResponse {
  message: string;
  task_id: string;
  user_id: number;
  force_full_sync: boolean;
  started_at: string;
}

export interface SyncTaskStatus {
  task_id: string;
  status: string;
  result: any;
  info: any;
  ready: boolean;
  successful: boolean | null;
  failed: boolean | null;
}

export interface LastSyncInfo {
  user_id: number;
  last_mal_sync: string | null;
  has_mal_token: boolean;
  token_expires_at: string | null;
}

// Sync API service
export const syncApi = {
  /**
   * Trigger anime data synchronization for current user
   */
  syncCurrentUser: async (forceFullSync: boolean = false): Promise<SyncTaskResponse> => {
    try {
      const response = await api.post<SyncTaskResponse>(`/sync/user?force_full_sync=${forceFullSync}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get sync task status
   */
  getSyncTaskStatus: async (taskId: string): Promise<SyncTaskStatus> => {
    try {
      const response = await api.get<SyncTaskStatus>(`/sync/status/${taskId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get last sync information for current user
   */
  getLastSyncInfo: async (): Promise<LastSyncInfo> => {
    try {
      const response = await api.get<LastSyncInfo>('/sync/user/last-sync');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

export default syncApi;