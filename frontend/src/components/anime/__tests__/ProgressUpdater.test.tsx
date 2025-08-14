import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProgressUpdater from '../ProgressUpdater';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ProgressUpdater', () => {
  const mockOnProgressUpdate = jest.fn();

  beforeEach(() => {
    mockOnProgressUpdate.mockClear();
  });

  it('renders with current progress', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByText('/ 12')).toBeInTheDocument();
  });

  it('shows progress bar when showProgressBar is true', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={6}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        showProgressBar={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides progress bar when showProgressBar is false', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={6}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        showProgressBar={false}
      />
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows quick action buttons when allowQuickActions is true', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={true}
      />
    );

    expect(screen.getByTitle('Decrease episode count')).toBeInTheDocument();
    expect(screen.getByTitle('Increase episode count')).toBeInTheDocument();
  });

  it('hides quick action buttons when allowQuickActions is false', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={false}
      />
    );

    expect(screen.queryByTitle('Decrease episode count')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Increase episode count')).not.toBeInTheDocument();
  });

  it('calls onProgressUpdate when increment button is clicked', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={true}
      />
    );

    fireEvent.click(screen.getByTitle('Increase episode count'));
    expect(mockOnProgressUpdate).toHaveBeenCalledWith(6);
  });

  it('calls onProgressUpdate when decrement button is clicked', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={true}
      />
    );

    fireEvent.click(screen.getByTitle('Decrease episode count'));
    expect(mockOnProgressUpdate).toHaveBeenCalledWith(4);
  });

  it('disables decrement button when progress is 0', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={0}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={true}
      />
    );

    const decrementButton = screen.getByTitle('Decrease episode count');
    expect(decrementButton).toBeDisabled();
  });

  it('disables increment button when progress equals total episodes', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={12}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        allowQuickActions={true}
      />
    );

    const incrementButton = screen.getByTitle('Increase episode count');
    expect(incrementButton).toBeDisabled();
  });

  it('shows completed icon when progress equals total episodes', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={12}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    expect(screen.getByTitle('Completed!')).toBeInTheDocument();
  });

  it('calls onProgressUpdate when input value changes and loses focus', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.blur(input);

    expect(mockOnProgressUpdate).toHaveBeenCalledWith(8);
  });

  it('calls onProgressUpdate when Enter key is pressed', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnProgressUpdate).toHaveBeenCalledWith(7);
  });

  it('clamps input value to maximum episodes', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);

    expect(mockOnProgressUpdate).toHaveBeenCalledWith(12);
  });

  it('resets invalid input values', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(mockOnProgressUpdate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <ProgressUpdater
        currentProgress={5}
        totalEpisodes={12}
        onProgressUpdate={mockOnProgressUpdate}
        disabled={true}
        allowQuickActions={true}
      />
    );

    const input = screen.getByDisplayValue('5');
    const incrementButton = screen.getByTitle('Increase episode count');
    const decrementButton = screen.getByTitle('Decrease episode count');

    expect(input).toBeDisabled();
    expect(incrementButton).toBeDisabled();
    expect(decrementButton).toBeDisabled();
  });
});