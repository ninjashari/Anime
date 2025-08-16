import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AnimeModal from '../AnimeModal';
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
    synopsis: 'A test anime for testing purposes with a longer synopsis to test text display',
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

describe('AnimeModal', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onStatusChange: jest.fn(),
    onProgressUpdate: jest.fn(),
    onScoreUpdate: jest.fn(),
    onRemove: jest.fn()
  };

  beforeEach(() => {
    mockProps.onClose.mockClear();
    mockProps.onStatusChange.mockClear();
    mockProps.onProgressUpdate.mockClear();
    mockProps.onScoreUpdate.mockClear();
    mockProps.onRemove.mockClear();
  });

  it('renders anime information correctly when open', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('Test Anime')).toBeInTheDocument();
    expect(screen.getByText('Test Anime English')).toBeInTheDocument();
    expect(screen.getByText(/A test anime for testing purposes/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // Episodes
    expect(screen.getByText('8.5')).toBeInTheDocument(); // MAL Score
    expect(screen.getByText('#100')).toBeInTheDocument(); // Rank
  });

  it('does not render when anime is null', () => {
    renderWithTheme(
      <AnimeModal
        anime={null}
        {...mockProps}
      />
    );

    expect(screen.queryByText('Test Anime')).not.toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
        open={false}
      />
    );

    expect(screen.queryByText('Test Anime')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onStatusChange when status is changed', async () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    // Find and click the status selector
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);

    await waitFor(() => {
      const completedOption = screen.getByText('Completed');
      fireEvent.click(completedOption);
    });

    expect(mockProps.onStatusChange).toHaveBeenCalledWith(mockAnime.anime_id, 'completed');
  });

  it('calls onScoreUpdate when rating is changed', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    // Find the rating component and simulate a change
    const ratingStars = screen.getAllByRole('radio');
    fireEvent.click(ratingStars[8]); // Click on 9th star (9 rating)

    expect(mockProps.onScoreUpdate).toHaveBeenCalledWith(mockAnime.anime_id, 9);
  });

  it('calls onRemove when remove button is clicked', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove from list/i });
    fireEvent.click(removeButton);

    expect(mockProps.onRemove).toHaveBeenCalledWith(mockAnime.anime_id);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays formatted dates correctly', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText(/Started: January 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Finished: Not set/)).toBeInTheDocument();
  });

  it('displays "Not set" for missing dates', () => {
    const animeWithoutDates: AnimeListItem = {
      ...mockAnime,
      start_date: undefined,
      finish_date: undefined
    };

    renderWithTheme(
      <AnimeModal
        anime={animeWithoutDates}
        {...mockProps}
      />
    );

    expect(screen.getAllByText(/Not set/)).toHaveLength(2);
  });

  it('shows notes in text field', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const notesField = screen.getByDisplayValue('Great anime!');
    expect(notesField).toBeInTheDocument();
  });

  it('updates notes when text field is changed', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const notesField = screen.getByDisplayValue('Great anime!');
    fireEvent.change(notesField, { target: { value: 'Updated notes' } });

    expect(screen.getByDisplayValue('Updated notes')).toBeInTheDocument();
  });

  it('enables save button when changes are made', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    // Make a change
    const notesField = screen.getByDisplayValue('Great anime!');
    fireEvent.change(notesField, { target: { value: 'Updated notes' } });

    expect(saveButton).not.toBeDisabled();
  });

  it('displays progress updater with correct values', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByRole('spinbutton')).toHaveValue(5);
    expect(screen.getByText('/ 12')).toBeInTheDocument();
  });

  it('handles anime without synopsis', () => {
    const animeWithoutSynopsis = {
      ...mockAnime,
      anime: {
        ...mockAnime.anime,
        synopsis: undefined
      }
    };

    renderWithTheme(
      <AnimeModal
        anime={animeWithoutSynopsis}
        {...mockProps}
      />
    );

    expect(screen.queryByText('Synopsis')).not.toBeInTheDocument();
  });

  it('displays N/A for missing score and rank', () => {
    const animeWithoutScoreRank = {
      ...mockAnime,
      anime: {
        ...mockAnime.anime,
        score: undefined,
        rank: undefined
      }
    };

    renderWithTheme(
      <AnimeModal
        anime={animeWithoutScoreRank}
        {...mockProps}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument(); // MAL Score
    expect(screen.getByText('#N/A')).toBeInTheDocument(); // Rank
  });

  it('shows current user score correctly', () => {
    renderWithTheme(
      <AnimeModal
        anime={mockAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('shows 0/10 for unrated anime', () => {
    const unratedAnime: AnimeListItem = {
      ...mockAnime,
      score: undefined
    };

    renderWithTheme(
      <AnimeModal
        anime={unratedAnime}
        {...mockProps}
      />
    );

    expect(screen.getByText('0/10')).toBeInTheDocument();
  });
});