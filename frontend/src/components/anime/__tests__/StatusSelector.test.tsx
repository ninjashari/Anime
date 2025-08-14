import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StatusSelector from '../StatusSelector';
import { AnimeStatus } from '../../../types/anime';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StatusSelector', () => {
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  it('renders with current status', () => {
    renderWithTheme(
      <StatusSelector
        currentStatus="watching"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByDisplayValue('watching')).toBeInTheDocument();
  });

  it('displays all status options when opened', () => {
    renderWithTheme(
      <StatusSelector
        currentStatus="watching"
        onStatusChange={mockOnStatusChange}
      />
    );

    // Open the select
    fireEvent.mouseDown(screen.getByRole('combobox'));

    // Check all options are present
    expect(screen.getAllByText('Currently Watching')).toHaveLength(2); // One in select, one in dropdown
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('On Hold')).toBeInTheDocument();
    expect(screen.getByText('Dropped')).toBeInTheDocument();
    expect(screen.getByText('Plan to Watch')).toBeInTheDocument();
  });

  it('calls onStatusChange when status is selected', () => {
    renderWithTheme(
      <StatusSelector
        currentStatus="watching"
        onStatusChange={mockOnStatusChange}
      />
    );

    // Open the select
    fireEvent.mouseDown(screen.getByRole('combobox'));
    
    // Select completed
    fireEvent.click(screen.getByText('Completed'));

    expect(mockOnStatusChange).toHaveBeenCalledWith('completed');
  });

  it('renders as chip when showChip is true', () => {
    renderWithTheme(
      <StatusSelector
        currentStatus="completed"
        onStatusChange={mockOnStatusChange}
        showChip={true}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <StatusSelector
        currentStatus="watching"
        onStatusChange={mockOnStatusChange}
        disabled={true}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders with different variants and sizes', () => {
    const { rerender } = renderWithTheme(
      <StatusSelector
        currentStatus="watching"
        onStatusChange={mockOnStatusChange}
        variant="filled"
        size="medium"
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <StatusSelector
          currentStatus="watching"
          onStatusChange={mockOnStatusChange}
          variant="standard"
          size="small"
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});