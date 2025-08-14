import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchPage from '../SearchPage';
import { searchApi } from '../../../services';

// Mock the search API
jest.mock('../../../services', () => ({
  searchApi: {
    searchAnime: jest.fn(),
    addToList: jest.fn(),
    getSearchHistory: jest.fn(),
    getSearchSuggestions: jest.fn(),
  },
}));

// Mock the useDebounce hook
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

const mockSearchApi = searchApi as jest.Mocked<typeof searchApi>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockSearchResponse = {
  results: [
    {
      mal_id: 1,
      title: 'Naruto',
      title_english: 'Naruto',
      synopsis: 'A young ninja who seeks recognition from his peers.',
      episodes: 220,
      status: 'Finished Airing',
      score: 8.3,
      rank: 100,
      popularity: 50,
      image_url: 'https://example.com/naruto.jpg',
      media_type: 'TV',
      source: 'Manga',
      rating: 'PG-13',
      start_date: '2002-10-03',
      end_date: '2007-02-08',
      genres: ['Action', 'Adventure'],
      studios: ['Pierrot'],
      in_user_list: false,
      user_list_status: undefined,
    },
  ],
  total: 1,
  query: 'naruto',
  limit: 20,
  offset: 0,
  has_next: false,
  cached: false,
};

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchApi.getSearchHistory.mockResolvedValue({
      history: [],
      total: 0,
    });
    mockSearchApi.getSearchSuggestions.mockResolvedValue({
      suggestions: [],
    });
    mockSearchApi.searchAnime.mockResolvedValue(mockSearchResponse);
    mockSearchApi.addToList.mockResolvedValue({
      success: true,
      message: 'Anime added successfully',
      anime_id: 1,
      list_item_id: 1,
    });
  });

  it('renders search page with header and search bar', () => {
    renderWithTheme(<SearchPage />);

    expect(screen.getByText('Search Anime')).toBeInTheDocument();
    expect(screen.getByText('Discover new anime and add them to your lists')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for anime by title...')).toBeInTheDocument();
  });

  it('performs search when search bar is used', async () => {
    renderWithTheme(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockSearchApi.searchAnime).toHaveBeenCalledWith('naruto', 20, 0);
    });
  });

  it('displays search results after successful search', async () => {
    renderWithTheme(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Search Results for "naruto"')).toBeInTheDocument();
      expect(screen.getByText('Found 1 anime')).toBeInTheDocument();
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });
  });

  it('shows loading state during search', async () => {
    mockSearchApi.searchAnime.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockSearchResponse), 1000))
    );

    renderWithTheme(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should show loading spinner in search bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when search fails', async () => {
    mockSearchApi.searchAnime.mockRejectedValue(new Error('Search failed'));

    renderWithTheme(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('opens add to list modal when add button is clicked', async () => {
    renderWithTheme(<SearchPage />);

    // Perform search first
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });

    // Click add to list button
    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByText('Add to List')).toHaveLength(2); // Modal title and button
    });
  });

  it('adds anime to list successfully', async () => {
    renderWithTheme(<SearchPage />);

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });

    // Open modal
    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByText('Add to List')).toHaveLength(2);
    });

    // Submit modal
    const modalAddButton = screen.getAllByText('Add to List')[1]; // Second one is in modal
    await userEvent.click(modalAddButton);

    await waitFor(() => {
      expect(mockSearchApi.addToList).toHaveBeenCalledWith({
        mal_id: 1,
        status: 'plan_to_watch',
        episodes_watched: 0,
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Anime added successfully')).toBeInTheDocument();
    });
  });

  it('updates anime status in results after successful addition', async () => {
    renderWithTheme(<SearchPage />);

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Add to List')).toBeInTheDocument();
    });

    // Add to list
    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    const modalAddButton = screen.getAllByText('Add to List')[1];
    await userEvent.click(modalAddButton);

    await waitFor(() => {
      expect(screen.getByText('In Your List')).toBeInTheDocument();
    });
  });

  it('handles add to list failure', async () => {
    mockSearchApi.addToList.mockRejectedValue(new Error('Failed to add anime'));

    renderWithTheme(<SearchPage />);

    // Perform search and open modal
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    const modalAddButton = screen.getAllByText('Add to List')[1];
    await userEvent.click(modalAddButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to add anime')).toBeInTheDocument();
    });
  });

  it('loads more results when load more button is clicked', async () => {
    const searchResponseWithMore = {
      ...mockSearchResponse,
      has_next: true,
    };
    mockSearchApi.searchAnime.mockResolvedValueOnce(searchResponseWithMore);

    renderWithTheme(<SearchPage />);

    // Perform initial search
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    // Mock second page response
    const secondPageResponse = {
      ...mockSearchResponse,
      results: [
        {
          ...mockSearchResponse.results[0],
          mal_id: 2,
          title: 'Naruto Shippuden',
        },
      ],
      offset: 20,
      has_next: false,
    };
    mockSearchApi.searchAnime.mockResolvedValueOnce(secondPageResponse);

    // Click load more
    const loadMoreButton = screen.getByText('Load More');
    await userEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(mockSearchApi.searchAnime).toHaveBeenCalledWith('naruto', 20, 20);
      expect(screen.getByText('Naruto Shippuden')).toBeInTheDocument();
    });
  });

  it('shows cached results notification', async () => {
    const cachedResponse = {
      ...mockSearchResponse,
      cached: true,
    };
    mockSearchApi.searchAnime.mockResolvedValue(cachedResponse);

    renderWithTheme(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Results loaded from cache')).toBeInTheDocument();
    });
  });

  it('handles view details action', async () => {
    renderWithTheme(<SearchPage />);

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });

    // Click on the anime card (assuming it's clickable)
    const animeCard = screen.getByText('Naruto').closest('div');
    if (animeCard) {
      await userEvent.click(animeCard);

      await waitFor(() => {
        expect(screen.getByText('Viewing details for Naruto')).toBeInTheDocument();
      });
    }
  });

  it('closes snackbar when close button is clicked', async () => {
    renderWithTheme(<SearchPage />);

    // Trigger a snackbar by performing a search
    const searchInput = screen.getByPlaceholderText('Search for anime by title...');
    await userEvent.type(searchInput, 'naruto');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Add to list to trigger success snackbar
    await waitFor(() => {
      expect(screen.getByText('Naruto')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    const modalAddButton = screen.getAllByText('Add to List')[1];
    await userEvent.click(modalAddButton);

    await waitFor(() => {
      expect(screen.getByText('Anime added successfully')).toBeInTheDocument();
    });

    // Close snackbar
    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Anime added successfully')).not.toBeInTheDocument();
    });
  });

  it('clears results when component unmounts', () => {
    const { unmount } = renderWithTheme(<SearchPage />);
    
    // This test mainly ensures no errors occur during unmount
    expect(() => unmount()).not.toThrow();
  });
});