/**
 * StatCard component tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Tv as TvIcon } from '@mui/icons-material';
import StatCard from '../StatCard';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StatCard', () => {
  it('renders basic stat card with title and value', () => {
    renderWithTheme(
      <StatCard
        title="Total Anime"
        value={42}
      />
    );

    expect(screen.getByText('Total Anime')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders stat card with subtitle', () => {
    renderWithTheme(
      <StatCard
        title="Mean Score"
        value="8.5"
        subtitle="out of 10"
      />
    );

    expect(screen.getByText('Mean Score')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('out of 10')).toBeInTheDocument();
  });

  it('renders stat card with icon', () => {
    renderWithTheme(
      <StatCard
        title="Total Anime"
        value={42}
        icon={<TvIcon data-testid="tv-icon" />}
      />
    );

    expect(screen.getByTestId('tv-icon')).toBeInTheDocument();
    expect(screen.getByText('Total Anime')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders loading state with skeletons', () => {
    renderWithTheme(
      <StatCard
        title="Total Anime"
        value={42}
        loading={true}
      />
    );

    // Should not show actual content when loading
    expect(screen.queryByText('Total Anime')).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('renders string values correctly', () => {
    renderWithTheme(
      <StatCard
        title="Time Spent"
        value="5 days"
        subtitle="120 hours"
      />
    );

    expect(screen.getByText('Time Spent')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('120 hours')).toBeInTheDocument();
  });

  it('renders zero values correctly', () => {
    renderWithTheme(
      <StatCard
        title="Episodes Watched"
        value={0}
      />
    );

    expect(screen.getByText('Episodes Watched')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders N/A values correctly', () => {
    renderWithTheme(
      <StatCard
        title="Mean Score"
        value="N/A"
        subtitle="No ratings yet"
      />
    );

    expect(screen.getByText('Mean Score')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = renderWithTheme(
      <StatCard
        title="Test Card"
        value={123}
      />
    );

    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
    expect(card).toHaveStyle({ minHeight: '120px' });
  });
});