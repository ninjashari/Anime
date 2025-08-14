/**
 * ScoreDistributionChart component tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreDistributionChart from '../ScoreDistributionChart';
import { ScoreDistributionItem } from '../../../types/dashboard';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
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

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ScoreDistributionChart', () => {
  const mockData: ScoreDistributionItem[] = [
    { score: 1, count: 0 },
    { score: 2, count: 1 },
    { score: 3, count: 2 },
    { score: 4, count: 0 },
    { score: 5, count: 3 },
    { score: 6, count: 5 },
    { score: 7, count: 8 },
    { score: 8, count: 12 },
    { score: 9, count: 6 },
    { score: 10, count: 3 }
  ];

  it('renders chart title', () => {
    renderWithTheme(
      <ScoreDistributionChart data={mockData} />
    );

    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
  });

  it('renders chart with data', () => {
    renderWithTheme(
      <ScoreDistributionChart data={mockData} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    const chartData = screen.getByTestId('chart-data');
    const parsedData = JSON.parse(chartData.textContent || '{}');
    
    expect(parsedData.labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(parsedData.datasets[0].data).toEqual([0, 1, 2, 0, 3, 5, 8, 12, 6, 3]);
    expect(parsedData.datasets[0].label).toBe('Number of Anime');
  });

  it('renders loading state with skeleton', () => {
    renderWithTheme(
      <ScoreDistributionChart data={[]} loading={true} />
    );

    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    const emptyData: ScoreDistributionItem[] = [
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 0 },
      { score: 5, count: 0 },
      { score: 6, count: 0 },
      { score: 7, count: 0 },
      { score: 8, count: 0 },
      { score: 9, count: 0 },
      { score: 10, count: 0 }
    ];

    renderWithTheme(
      <ScoreDistributionChart data={emptyData} />
    );

    expect(screen.getByText('No scored anime yet')).toBeInTheDocument();
    expect(screen.getByText('Start rating your anime to see the distribution!')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders chart when some scores have data', () => {
    const partialData: ScoreDistributionItem[] = [
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 0 },
      { score: 5, count: 0 },
      { score: 6, count: 0 },
      { score: 7, count: 0 },
      { score: 8, count: 5 },
      { score: 9, count: 0 },
      { score: 10, count: 0 }
    ];

    renderWithTheme(
      <ScoreDistributionChart data={partialData} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByText('No scored anime yet')).not.toBeInTheDocument();
  });

  it('applies correct chart configuration', () => {
    renderWithTheme(
      <ScoreDistributionChart data={mockData} />
    );

    const chartOptions = screen.getByTestId('chart-options');
    const parsedOptions = JSON.parse(chartOptions.textContent || '{}');
    
    expect(parsedOptions.responsive).toBe(true);
    expect(parsedOptions.maintainAspectRatio).toBe(false);
    expect(parsedOptions.plugins.legend.display).toBe(false);
    expect(parsedOptions.scales.x.title.text).toBe('Score');
    expect(parsedOptions.scales.y.title.text).toBe('Number of Anime');
    expect(parsedOptions.scales.y.beginAtZero).toBe(true);
  });

  it('handles empty array data', () => {
    renderWithTheme(
      <ScoreDistributionChart data={[]} />
    );

    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('No scored anime yet')).toBeInTheDocument();
  });
});