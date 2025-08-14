/**
 * Dashboard page component tests
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from '../Dashboard';
import { dashboardApi } from '../../services/dashboardApi';
import { DashboardResponse } from '../../types/dashboard';

// Mock the dashboard API
jest.mock('../../services/dashboardApi');
const mockDashboardApi = dashboardApi as jest.Mocked<typeof dashboardApi>;

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Chart</div>
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

// Mock useMediaQuery
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(() => false)
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockDashboardData: DashboardResponse = {
  success: true,
  message: 'Dashboard statistics retrieved successfully',
  data: {
    total_anime_count: 150,
    total_episodes_watched: 1800,
    time_spent_watching: {
      minutes: 43200,
      hours: 720,
      days: 30
    },
    time_to_complete_planned: {
      minutes: 7200,
      hours: 120,
      days: 5
    },
    mean_score: 8.2,
    score_distribution: [
      { score: 1, count: 0 },
      { score: 2, count: 1 },
      { score: 3, count: 2 },
      { score: 4, count: 3 },
      { score: 5, count: 5 },
      { score: 6, count: 8 },
      { score: 7, count: 15 },
      { score: 8, count: 25 },
      { score: 9, count: 12 },
      { score: 10, count: 4 }
    ],
    status_breakdown: {
      watching: 5,
      completed: 120,
      on_hold: 3,
      dropped: 2,
      plan_to_watch: 20
    }
  }
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title and subtitle', async () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Your anime watching statistics and progress overview')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockDashboardApi.getStats.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(<Dashboard />);

    // Should show loading skeletons (we can't easily test MUI skeletons, but we can verify the API is called)
    expect(mockDashboardApi.getStats).toHaveBeenCalledTimes(1);
  });

  it('displays dashboard statistics when data loads successfully', async () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total anime
      expect(screen.getByText('1800')).toBeInTheDocument(); // Episodes watched
      expect(screen.getByText('30 days')).toBeInTheDocument(); // Time spent
      expect(screen.getByText('5 days')).toBeInTheDocument(); // Time to complete
      expect(screen.getByText('8.2')).toBeInTheDocument(); // Mean score
      expect(screen.getByText('120')).toBeInTheDocument(); // Completed anime
    });
  });

  it('displays status breakdown correctly', async () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Currently watching
      expect(screen.getByText('20')).toBeInTheDocument(); // Plan to watch
      expect(screen.getByText('3')).toBeInTheDocument(); // On hold
      expect(screen.getByText('2')).toBeInTheDocument(); // Dropped
    });
  });

  it('displays score distribution chart', async () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const errorMessage = 'Failed to load dashboard statistics';
    mockDashboardApi.getStats.mockRejectedValue(new Error(errorMessage));

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('formats time correctly for hours', async () => {
    const dataWithHours = {
      ...mockDashboardData,
      data: {
        ...mockDashboardData.data,
        time_spent_watching: {
          minutes: 300,
          hours: 5,
          days: 0
        }
      }
    };

    mockDashboardApi.getStats.mockResolvedValue(dataWithHours);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('5 hours')).toBeInTheDocument();
      expect(screen.getByText('300 minutes')).toBeInTheDocument();
    });
  });

  it('formats time correctly for minutes only', async () => {
    const dataWithMinutes = {
      ...mockDashboardData,
      data: {
        ...mockDashboardData.data,
        time_spent_watching: {
          minutes: 45,
          hours: 0,
          days: 0
        }
      }
    };

    mockDashboardApi.getStats.mockResolvedValue(dataWithMinutes);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('45 min')).toBeInTheDocument();
    });
  });

  it('handles null mean score correctly', async () => {
    const dataWithNullScore = {
      ...mockDashboardData,
      data: {
        ...mockDashboardData.data,
        mean_score: null
      }
    };

    mockDashboardApi.getStats.mockResolvedValue(dataWithNullScore);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });
  });

  it('displays correct stat card titles', async () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Anime')).toBeInTheDocument();
      expect(screen.getByText('Episodes Watched')).toBeInTheDocument();
      expect(screen.getByText('Time Spent')).toBeInTheDocument();
      expect(screen.getByText('Time to Complete')).toBeInTheDocument();
      expect(screen.getByText('Mean Score')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Currently Watching')).toBeInTheDocument();
      expect(screen.getByText('Plan to Watch')).toBeInTheDocument();
      expect(screen.getByText('On Hold')).toBeInTheDocument();
      expect(screen.getByText('Dropped')).toBeInTheDocument();
    });
  });

  it('calls dashboard API on component mount', () => {
    mockDashboardApi.getStats.mockResolvedValue(mockDashboardData);

    renderWithTheme(<Dashboard />);

    expect(mockDashboardApi.getStats).toHaveBeenCalledTimes(1);
  });
});