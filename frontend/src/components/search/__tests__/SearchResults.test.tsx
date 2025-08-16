import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchResults from '../SearchResults';
import { SearchAnimeResult } from '../../../services';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockAnime: SearchAnimeResult = {
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
  genres: ['Action', 'Adventure', 'Martial Arts'],
  studios: ['Pierrot'],
  in_user_list: false,
  user_list_status: undefined,
};

const mockAnimeInList: SearchAnimeResult = {
  ...mockAnime,
  mal_id: 2,
  title: 'One Piece',
  in_user_list: true,
  user_list_status: 'watching',
};

describe('SearchResults', () => {
  const mockOnAddToList = jest.fn();
  const mockOnViewDetails = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons when loading', () => {
    renderWithTheme(
      <SearchResults
        results={[]}
        loading={true}
        onAddToList={mockOnAddToList}
      />
    );

    // Should render multiple skeleton cards
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error message when error is provided', () => {
    renderWithTheme(
      <SearchResults
        results={[]}
        error="Failed to load results"
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Failed to load results')).toBeInTheDocument();
  });

  it('renders no results message when no results and not loading', () => {
    renderWithTheme(
      <SearchResults
        results={[]}
        loading={false}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('No anime found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms or browse popular anime')).toBeInTheDocument();
  });

  it('renders anime results correctly', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('A young ninja who seeks recognition from his peers.')).toBeInTheDocument();
    expect(screen.getByText('220 eps')).toBeInTheDocument();
    expect(screen.getByText('8.3')).toBeInTheDocument();
    expect(screen.getByText('Add to List')).toBeInTheDocument();
  });

  it('shows "In Your List" for anime already in user list', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnimeInList]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('In Your List')).toBeInTheDocument();
    expect(screen.getByText('WATCHING')).toBeInTheDocument();
  });

  it('calls onAddToList when Add to List button is clicked', async () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    const addButton = screen.getByText('Add to List');
    await userEvent.click(addButton);

    expect(mockOnAddToList).toHaveBeenCalledWith(mockAnime);
  });

  it('calls onAddToList when floating add button is clicked', async () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    const floatingAddButton = screen.getByLabelText('Add to list');
    await userEvent.click(floatingAddButton);

    expect(mockOnAddToList).toHaveBeenCalledWith(mockAnime);
  });

  it('calls onViewDetails when card is clicked', async () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
        onViewDetails={mockOnViewDetails}
      />
    );

    const card = screen.getByText('Naruto').closest('div');
    if (card) {
      await userEvent.click(card);
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockAnime);
    }
  });

  it('renders genres correctly', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Martial Arts')).toBeInTheDocument();
  });

  it('shows limited genres with "more" indicator', () => {
    const animeWithManyGenres: SearchAnimeResult = {
      ...mockAnime,
      genres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance'],
    };

    renderWithTheme(
      <SearchResults
        results={[animeWithManyGenres]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('handles missing image gracefully', () => {
    const animeWithoutImage: SearchAnimeResult = {
      ...mockAnime,
      image_url: undefined,
    };

    renderWithTheme(
      <SearchResults
        results={[animeWithoutImage]}
        onAddToList={mockOnAddToList}
      />
    );

    const image = screen.getByAltText('Naruto') as HTMLImageElement;
    expect(image.src).toContain('placeholder-anime.jpg');
  });

  it('shows load more button when hasMore is true', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', async () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onAddToList={mockOnAddToList}
      />
    );

    const loadMoreButton = screen.getByText('Load More');
    await userEvent.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('shows loading state on load more button when loadingMore is true', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onAddToList={mockOnAddToList}
        loadingMore={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles local pagination when onLoadMore is not provided', async () => {
    const manyResults = Array.from({ length: 50 }, (_, i) => ({
      ...mockAnime,
      mal_id: i + 1,
      title: `Anime ${i + 1}`,
    }));

    renderWithTheme(
      <SearchResults
        results={manyResults}
        onAddToList={mockOnAddToList}
      />
    );

    // Should initially show 20 results
    expect(screen.getByText('Anime 1')).toBeInTheDocument();
    expect(screen.getByText('Anime 20')).toBeInTheDocument();
    expect(screen.queryByText('Anime 21')).not.toBeInTheDocument();

    // Click load more
    const loadMoreButton = screen.getByText('Load More');
    await userEvent.click(loadMoreButton);

    // Should now show more results
    expect(screen.getByText('Anime 21')).toBeInTheDocument();
    expect(screen.getByText('Anime 40')).toBeInTheDocument();
  });

  it('formats year correctly from start_date', () => {
    renderWithTheme(
      <SearchResults
        results={[mockAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('2002')).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalAnime: SearchAnimeResult = {
      mal_id: 1,
      title: 'Minimal Anime',
      genres: [],
      studios: [],
      in_user_list: false,
    };

    renderWithTheme(
      <SearchResults
        results={[minimalAnime]}
        onAddToList={mockOnAddToList}
      />
    );

    expect(screen.getByText('Minimal Anime')).toBeInTheDocument();
    expect(screen.getByText('Add to List')).toBeInTheDocument();
  });
});