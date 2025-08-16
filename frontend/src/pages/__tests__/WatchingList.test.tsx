import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WatchingList from '../WatchingList';
import { animeListApi } from '../../services/animeListApi';

// Mock the API
jest.mock('../../services/animeListApi');
const mockedAnimeListApi = animeListApi as jest.Mocked<typeof animeListApi>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('WatchingList', () => {
  beforeEach(() => {
    mockedAnimeListApi.getAnimeList.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: 20,
      has_next: false,
      has_prev: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title and status', async () => {
    renderWithTheme(<WatchingList />);

    expect(screen.getByText('Currently Watching')).toBeInTheDocument();
  });

  it('passes correct status to AnimeListPage', async () => {
    renderWithTheme(<WatchingList />);

    // The component should call the API with 'watching' status
    expect(mockedAnimeListApi.getAnimeList).toHaveBeenCalledWith('watching', expect.any(Object));
  });
});