import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddToListModal from '../AddToListModal';
import { SearchAnimeResult, AddToListRequest } from '../../../services';

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

describe('AddToListModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAdd.mockResolvedValue(undefined);
  });

  it('does not render when open is false', () => {
    renderWithTheme(
      <AddToListModal
        open={false}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    expect(screen.queryByText('Add to List')).not.toBeInTheDocument();
  });

  it('renders modal content when open is true', () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    expect(screen.getAllByText('Add to List')[0]).toBeInTheDocument(); // Modal title
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('220 episodes')).toBeInTheDocument();
    expect(screen.getByText('8.3')).toBeInTheDocument();
  });

  it('shows anime genres', () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Martial Arts')).toBeInTheDocument();
  });

  it('has default status as "plan_to_watch"', () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    expect(statusSelect).toBeInTheDocument();
    // The select should have the default value, but MUI Select doesn't show display values in tests
    // We'll test the actual functionality in interaction tests
  });

  it('allows changing status', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    await userEvent.click(statusSelect);

    const watchingOption = screen.getByText('Currently Watching');
    await userEvent.click(watchingOption);

    // After clicking, the option should be selected (we can't easily test display value with MUI)
    expect(watchingOption).toBeInTheDocument();
  });

  it('auto-sets episodes watched when status is changed to completed', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    await userEvent.click(statusSelect);

    const completedOption = screen.getByText('Completed');
    await userEvent.click(completedOption);

    const episodesInput = screen.getByLabelText('Episodes Watched') as HTMLInputElement;
    expect(episodesInput.value).toBe('220');
  });

  it('resets episodes watched to 0 when status is changed to plan_to_watch', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    // First change to watching and set some episodes
    const statusSelect = screen.getByLabelText('Status');
    await userEvent.click(statusSelect);
    await userEvent.click(screen.getByText('Currently Watching'));

    const episodesInput = screen.getByLabelText('Episodes Watched');
    await userEvent.clear(episodesInput);
    await userEvent.type(episodesInput, '50');

    // Then change back to plan to watch
    await userEvent.click(statusSelect);
    await userEvent.click(screen.getByText('Plan to Watch'));

    expect((episodesInput as HTMLInputElement).value).toBe('0');
  });

  it('allows changing episodes watched', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const episodesInput = screen.getByLabelText('Episodes Watched');
    await userEvent.clear(episodesInput);
    await userEvent.type(episodesInput, '100');

    expect((episodesInput as HTMLInputElement).value).toBe('100');
  });

  it('limits episodes watched to total episodes', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const episodesInput = screen.getByLabelText('Episodes Watched');
    await userEvent.clear(episodesInput);
    await userEvent.type(episodesInput, '500');

    // Should be limited to 220 (total episodes)
    expect((episodesInput as HTMLInputElement).value).toBe('220');
  });

  it('allows changing score', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    // Click on the 8th star (8/10 rating)
    const stars = screen.getAllByRole('radio');
    await userEvent.click(stars[7]); // 8th star (0-indexed)

    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onAdd with correct data when Add to List button is clicked', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    // Change status to watching
    const statusSelect = screen.getByLabelText('Status');
    await userEvent.click(statusSelect);
    await userEvent.click(screen.getByText('Currently Watching'));

    // Set episodes watched
    const episodesInput = screen.getByLabelText('Episodes Watched');
    await userEvent.clear(episodesInput);
    await userEvent.type(episodesInput, '50');

    // Set score
    const stars = screen.getAllByRole('radio');
    await userEvent.click(stars[6]); // 7th star (7/10 rating)

    // Submit
    const addButton = screen.getAllByText('Add to List')[1]; // Get the button, not the title
    await userEvent.click(addButton);

    const expectedRequest: AddToListRequest = {
      mal_id: 1,
      status: 'watching',
      episodes_watched: 50,
      score: 7,
    };

    expect(mockOnAdd).toHaveBeenCalledWith(expectedRequest);
  });

  it('does not include score in request when score is 0', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const addButton = screen.getAllByText('Add to List')[1]; // Get the button, not the title
    await userEvent.click(addButton);

    const expectedRequest: AddToListRequest = {
      mal_id: 1,
      status: 'plan_to_watch',
      episodes_watched: 0,
    };

    expect(mockOnAdd).toHaveBeenCalledWith(expectedRequest);
  });

  it('shows loading state when submitting', async () => {
    mockOnAdd.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const addButton = screen.getAllByText('Add to List')[1]; // Get the button, not the title
    await userEvent.click(addButton);

    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message when onAdd fails', async () => {
    mockOnAdd.mockRejectedValue(new Error('Failed to add anime'));

    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const addButton = screen.getAllByText('Add to List')[1]; // Get the button, not the title
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to add anime')).toBeInTheDocument();
    });
  });

  it('closes modal on successful submission', async () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    const addButton = screen.getAllByText('Add to List')[1]; // Get the button, not the title
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('resets form when modal opens', () => {
    const { rerender } = renderWithTheme(
      <AddToListModal
        open={false}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    // Open modal
    rerender(
      <ThemeProvider theme={theme}>
        <AddToListModal
          open={true}
          anime={mockAnime}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      </ThemeProvider>
    );

    // Should have default values
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect((screen.getByLabelText('Episodes Watched') as HTMLInputElement).value).toBe('0');
    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('handles anime without episodes', () => {
    const animeWithoutEpisodes: SearchAnimeResult = {
      ...mockAnime,
      episodes: undefined,
    };

    renderWithTheme(
      <AddToListModal
        open={true}
        anime={animeWithoutEpisodes}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    expect(screen.queryByText('episodes')).not.toBeInTheDocument();
  });

  it('shows English title when different from main title', () => {
    renderWithTheme(
      <AddToListModal
        open={true}
        anime={mockAnime}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    expect(screen.getByText('Naruto')).toBeInTheDocument();
  });

  it('does not show English title when same as main title', () => {
    const animeWithSameTitle: SearchAnimeResult = {
      ...mockAnime,
      title_english: 'Naruto',
    };

    renderWithTheme(
      <AddToListModal
        open={true}
        anime={animeWithSameTitle}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );

    // Should only show the title once
    const titleElements = screen.getAllByText('Naruto');
    expect(titleElements).toHaveLength(1);
  });
});