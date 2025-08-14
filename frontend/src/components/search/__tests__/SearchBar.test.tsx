import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchBar from '../SearchBar';
import { searchApi } from '../../../services';

// Mock the search API
jest.mock('../../../services', () => ({
  searchApi: {
    getSearchHistory: jest.fn(),
    getSearchSuggestions: jest.fn(),
  },
}));

// Mock the useDebounce hook
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value, // Return value immediately for testing
}));

const mockSearchApi = searchApi as jest.Mocked<typeof searchApi>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchApi.getSearchHistory.mockResolvedValue({
      history: [
        { id: 1, query: 'naruto', result_count: 10, created_at: '2023-01-01T00:00:00Z' },
        { id: 2, query: 'one piece', result_count: 5, created_at: '2023-01-02T00:00:00Z' },
      ],
      total: 2,
    });
    mockSearchApi.getSearchSuggestions.mockResolvedValue({
      suggestions: ['naruto shippuden', 'naruto boruto'],
    });
  });

  it('renders search input with placeholder', () => {
    renderWithTheme(
      <SearchBar onSearch={mockOnSearch} placeholder="Search anime..." />
    );

    expect(screen.getByPlaceholderText('Search anime...')).toBeInTheDocument();
  });

  it('calls onSearch when Enter key is pressed', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'naruto');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSearch).toHaveBeenCalledWith('naruto');
  });

  it('calls onSearch when search button is clicked', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'one piece');
    
    const searchButton = screen.getByLabelText('Search');
    await userEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('one piece');
  });

  it('clears input when clear button is clicked', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'test query');

    expect(input.value).toBe('test query');

    const clearButton = screen.getByLabelText('Clear search');
    await userEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('shows loading spinner when loading prop is true', () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('disables input and buttons when disabled prop is true', () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} disabled={true} />);

    const input = screen.getByRole('textbox');
    const searchButton = screen.getByLabelText('Search');

    expect(input).toBeDisabled();
    expect(searchButton).toBeDisabled();
  });

  it('loads search history on mount', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    await waitFor(() => {
      expect(mockSearchApi.getSearchHistory).toHaveBeenCalledWith(10);
    });
  });

  it('shows search history when input is focused', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    // Wait for search history to load
    await waitFor(() => {
      expect(mockSearchApi.getSearchHistory).toHaveBeenCalled();
    });

    const input = screen.getByRole('textbox');
    await userEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('RECENT SEARCHES')).toBeInTheDocument();
      expect(screen.getByText('naruto')).toBeInTheDocument();
      expect(screen.getByText('one piece')).toBeInTheDocument();
    });
  });

  it('loads suggestions when typing', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'nar');

    await waitFor(() => {
      expect(mockSearchApi.getSearchSuggestions).toHaveBeenCalledWith('nar', 5);
    });
  });

  it('shows suggestions when available', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, 'nar');

    await waitFor(() => {
      expect(screen.getByText('SUGGESTIONS')).toBeInTheDocument();
      expect(screen.getByText('naruto shippuden')).toBeInTheDocument();
      expect(screen.getByText('naruto boruto')).toBeInTheDocument();
    });
  });

  it('performs search when history item is clicked', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    // Wait for search history to load
    await waitFor(() => {
      expect(mockSearchApi.getSearchHistory).toHaveBeenCalled();
    });

    const input = screen.getByRole('textbox');
    await userEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('naruto')).toBeInTheDocument();
    });

    const historyItem = screen.getByText('naruto');
    await userEvent.click(historyItem);

    expect(mockOnSearch).toHaveBeenCalledWith('naruto');
  });

  it('performs search when suggestion is clicked', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, 'nar');

    await waitFor(() => {
      expect(screen.getByText('naruto shippuden')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('naruto shippuden');
    await userEvent.click(suggestion);

    expect(mockOnSearch).toHaveBeenCalledWith('naruto shippuden');
  });

  it('trims whitespace from search query', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '  naruto  ');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSearch).toHaveBeenCalledWith('naruto');
  });

  it('does not search with empty query', async () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '   ');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    mockSearchApi.getSearchHistory.mockRejectedValue(new Error('API Error'));
    mockSearchApi.getSearchSuggestions.mockRejectedValue(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderWithTheme(<SearchBar onSearch={mockOnSearch} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load search history:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('sets initial value correctly', () => {
    renderWithTheme(
      <SearchBar onSearch={mockOnSearch} initialValue="initial query" />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('initial query');
  });

  it('focuses input when autoFocus is true', () => {
    renderWithTheme(<SearchBar onSearch={mockOnSearch} autoFocus={true} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
  });
});