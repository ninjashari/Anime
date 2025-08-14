import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AnimeCard from '../AnimeCard';
import { AnimeListItem } from '../../../types/anime';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockAnime: AnimeListItem = {
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
    synopsis: 'A test anime for testing purposes',
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

describe('AnimeCard', () => {
  const mockProps = {
    onStatusChange: jest.fn(),
    onProgressUpdate: jest.fn(),
    onScoreUpdate: jest.fn(),
    onRemove: jest.fn(),
    onViewDetails: jest.fn()
  };

  beforeEach(() => {
    Object.values(mockProps).forEach(mock => mock.mockClear());
  });

  it('renders anime information correctly', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('Test Anime')).toBeInTheDocument();
    expect(screen.getByText('WATCHING')).toBeInTheDocument();
    const progressInput = screen.getByRole('spinbutton');
    expect(progressInput).toHaveValue(5);
    expect(screen.getByText('/ 12')).toBeInTheDocument();
  });

  it('displays loading skeleton when loading is true', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
        loading={true}
      />
    );

    // Should show skeleton instead of content
    expect(screen.queryByText('Test Anime')).not.toBeInTheDocument();
  });

  it('calls onViewDetails when card is clicked', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    fireEvent.click(screen.getByText('Test Anime').closest('.MuiCard-root')!);
    expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockAnime);
  });

  it('opens context menu when menu button is clicked', async () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Quick Edit')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });
  });

  it('calls onViewDetails when "View Details" menu item is clicked', async () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const viewDetailsItem = screen.getByText('View Details');
      fireEvent.click(viewDetailsItem);
    });

    expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockAnime);
  });

  it('calls onRemove when "Remove" menu item is clicked', async () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const removeItem = screen.getByText('Remove');
      fireEvent.click(removeItem);
    });

    expect(mockProps.onRemove).toHaveBeenCalledWith(mockAnime.anime_id);
  });

  it('calls onScoreUpdate when rating is changed', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    // Find the rating component and simulate a change
    const ratingStars = screen.getAllByRole('radio');
    fireEvent.click(ratingStars[6]); // Click on 7th star (7 rating)

    expect(mockProps.onScoreUpdate).toHaveBeenCalledWith(mockAnime.anime_id, 7);
  });

  it('displays formatted dates when available', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
  });

  it('handles missing image with placeholder', () => {
    const animeWithoutImage = {
      ...mockAnime,
      anime: {
        ...mockAnime.anime,
        image_url: undefined
      }
    };

    renderWithTheme(
      <AnimeCard
        anime={animeWithoutImage}
        {...mockProps}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', '/placeholder-anime.jpg');
  });

  it('shows completed status correctly', () => {
    const completedAnime = {
      ...mockAnime,
      status: 'completed' as const,
      episodes_watched: 12,
      finish_date: '2024-03-31'
    };

    renderWithTheme(
      <AnimeCard
        anime={completedAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByTitle('Completed!')).toBeInTheDocument();
  });

  it('shows "Not rated" when score is null', () => {
    const unratedAnime = {
      ...mockAnime,
      score: null
    };

    renderWithTheme(
      <AnimeCard
        anime={unratedAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('is draggable when draggable prop is true', () => {
    renderWithTheme(
      <AnimeCard
        anime={mockAnime}
        {...mockProps}
        draggable={true}
      />
    );

    const card = screen.getByText('Test Anime').closest('.MuiCard-root')!;
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('truncates long titles properly', () => {
    const longTitleAnime = {
      ...mockAnime,
      anime: {
        ...mockAnime.anime,
        title: 'This is a very long anime title that should be truncated when displayed in the card component'
      }
    };

    renderWithTheme(
      <AnimeCard
        anime={longTitleAnime}
        {...mockProps}
      />
    );

    const titleElement = screen.getByText(longTitleAnime.anime.title);
    expect(titleElement).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
  });
});