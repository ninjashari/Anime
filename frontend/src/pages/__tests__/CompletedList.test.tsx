import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CompletedList from '../CompletedList';
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

describe('CompletedList', () => {
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
    renderWithTheme(<CompletedList />);

    expect(screen.getByText('Completed Anime')).toBeInTheDocument();
  });

  it('passes correct status to AnimeListPage', async () => {
    renderWithTheme(<CompletedList />);

    // The component should call the API with 'completed' status
    expect(mockedAnimeListApi.getAnimeList).toHaveBeenCalledWith('completed', expect.any(Object));
  });
});