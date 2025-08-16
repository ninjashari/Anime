import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MappingPage from '../MappingPage';
import { mappingApi } from '../../../services/mappingApi';
import { AniDBMapping, MappingStatistics } from '../../../types/mapping';

// Mock the mapping API
jest.mock('../../../services/mappingApi', () => ({
  mappingApi: {
    getMappings: jest.fn(),
    getStatistics: jest.fn(),
    searchMappings: jest.fn(),
    deleteMapping: jest.fn(),
    refreshMappingData: jest.fn(),
    bulkDeleteMappings: jest.fn()
  }
}));

const theme = createTheme();

const mockMappings: AniDBMapping[] = [
  {
    id: 1,
    anidb_id: 12345,
    mal_id: 54321,
    title: 'Test Anime 1',
    confidence_score: 0.95,
    source: 'manual',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    anidb_id: 67890,
    mal_id: undefined,
    title: 'Test Anime 2',
    confidence_score: 0.5,
    source: 'auto',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
];

const mockStatistics: MappingStatistics = {
  total_mappings: 100,
  mapped_count: 80,
  unmapped_count: 20,
  manual_count: 30,
  auto_count: 50,
  github_count: 20,
  average_confidence: 0.75
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MappingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    (mappingApi.getMappings as jest.Mock).mockResolvedValue({
      mappings: mockMappings,
      total: 100,
      limit: 50,
      offset: 0
    });
    
    (mappingApi.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);
  });

  it('renders page header correctly', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('AniDB Mappings')).toBeInTheDocument();
      expect(screen.getByText(/manage anidb to myanimelist id mappings/i)).toBeInTheDocument();
    });
  });

  it('displays statistics cards', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // Total mappings
      expect(screen.getByText('80')).toBeInTheDocument(); // Mapped count
      expect(screen.getByText('20')).toBeInTheDocument(); // Unmapped count
      expect(screen.getByText('30')).toBeInTheDocument(); // Manual count
      expect(screen.getByText('50')).toBeInTheDocument(); // Auto count
      expect(screen.getByText('75%')).toBeInTheDocument(); // Average confidence
    });
  });

  it('loads and displays mappings', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
      expect(screen.getByText('Test Anime 2')).toBeInTheDocument();
      expect(screen.getByText('12345')).toBeInTheDocument();
      expect(screen.getByText('67890')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    (mappingApi.searchMappings as jest.Mock).mockResolvedValue([mockMappings[0]]);
    
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText(/search by title, anidb id, or mal id/i);
    fireEvent.change(searchInput, { target: { value: 'Test Anime 1' } });
    
    // Click search button or press enter
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mappingApi.searchMappings).toHaveBeenCalledWith({
        query: 'Test Anime 1',
        limit: 50
      });
    });
  });

  it('handles source filter', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Open source filter dropdown
    const sourceFilter = screen.getByLabelText(/source/i);
    fireEvent.mouseDown(sourceFilter);
    
    // Select manual source
    const manualOption = screen.getByText('Manual');
    fireEvent.click(manualOption);
    
    await waitFor(() => {
      expect(mappingApi.getMappings).toHaveBeenCalledWith(
        expect.objectContaining({
          source_filter: 'manual'
        })
      );
    });
  });

  it('opens create mapping dialog', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Click floating action button
    const fab = screen.getByLabelText(/add mapping/i);
    fireEvent.click(fab);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Mapping')).toBeInTheDocument();
    });
  });

  it('handles edit mapping', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Click edit button for first mapping
    const editButtons = screen.getAllByLabelText(/edit mapping/i);
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Mapping')).toBeInTheDocument();
    });
  });

  it('handles delete mapping', async () => {
    (mappingApi.deleteMapping as jest.Mock).mockResolvedValue(undefined);
    
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Click delete button for first mapping
    const deleteButtons = screen.getAllByLabelText(/delete mapping/i);
    fireEvent.click(deleteButtons[0]);
    
    // Confirm delete in dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mappingApi.deleteMapping).toHaveBeenCalledWith(12345);
    });
  });

  it('handles bulk selection and delete', async () => {
    (mappingApi.bulkDeleteMappings as jest.Mock).mockResolvedValue(undefined);
    
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Select all mappings
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    // Open bulk actions menu
    const bulkActionsButton = screen.getByText(/bulk actions/i);
    fireEvent.click(bulkActionsButton);
    
    // Click delete selected
    const deleteSelectedOption = screen.getByText('Delete Selected');
    fireEvent.click(deleteSelectedOption);
    
    await waitFor(() => {
      expect(mappingApi.bulkDeleteMappings).toHaveBeenCalledWith([12345, 67890]);
    });
  });

  it('handles refresh data', async () => {
    (mappingApi.refreshMappingData as jest.Mock).mockResolvedValue({
      loaded: 10,
      updated: 5,
      errors: 0,
      message: 'Refresh completed: 10 loaded, 5 updated'
    });
    
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Click refresh button
    const refreshButton = screen.getByText(/refresh data/i);
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mappingApi.refreshMappingData).toHaveBeenCalled();
    });
  });

  it('handles pagination', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Mock pagination response
    (mappingApi.getMappings as jest.Mock).mockResolvedValue({
      mappings: [mockMappings[1]],
      total: 100,
      limit: 50,
      offset: 50
    });
    
    // Click page 2 (if pagination is visible)
    const pagination = screen.queryByRole('navigation');
    if (pagination) {
      const page2Button = screen.getByText('2');
      fireEvent.click(page2Button);
      
      await waitFor(() => {
        expect(mappingApi.getMappings).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 50
          })
        );
      });
    }
  });

  it('handles sorting', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Click on AniDB ID column header to sort
    const anidbHeader = screen.getByText('AniDB ID');
    fireEvent.click(anidbHeader);
    
    await waitFor(() => {
      expect(mappingApi.getMappings).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: 'anidb_id',
          sort_order: 'asc'
        })
      );
    });
  });

  it('displays error messages', async () => {
    (mappingApi.getMappings as jest.Mock).mockRejectedValue(
      new Error('Failed to load mappings')
    );
    
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load mappings')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    // Mock a delayed response
    (mappingApi.getMappings as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    renderWithTheme(<MappingPage />);
    
    // Should show loading skeletons
    expect(screen.getAllByTestId(/skeleton/i).length).toBeGreaterThan(0);
  });

  it('displays success messages', async () => {
    renderWithTheme(<MappingPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    });
    
    // Simulate successful delete
    (mappingApi.deleteMapping as jest.Mock).mockResolvedValue(undefined);
    
    const deleteButtons = screen.getAllByLabelText(/delete mapping/i);
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mapping deleted successfully')).toBeInTheDocument();
    });
  });
});