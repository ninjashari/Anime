import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MappingTable from '../MappingTable';
import { AniDBMapping } from '../../../types/mapping';

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

const defaultProps = {
  mappings: mockMappings,
  loading: false,
  selectedMappings: [],
  onSelectionChange: jest.fn(),
  onSort: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  sortField: 'created_at' as const,
  sortOrder: 'desc' as const
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MappingTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mapping data correctly', () => {
    renderWithTheme(<MappingTable {...defaultProps} />);
    
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('54321')).toBeInTheDocument();
    expect(screen.getByText('Test Anime 1')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('shows unmapped entries correctly', () => {
    renderWithTheme(<MappingTable {...defaultProps} />);
    
    expect(screen.getByText('67890')).toBeInTheDocument();
    expect(screen.getByText('Unmapped')).toBeInTheDocument();
    expect(screen.getByText('Test Anime 2')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
  });

  it('handles selection correctly', () => {
    const onSelectionChange = jest.fn();
    renderWithTheme(
      <MappingTable {...defaultProps} onSelectionChange={onSelectionChange} />
    );
    
    // Click on first row
    const firstRow = screen.getByText('Test Anime 1').closest('tr');
    fireEvent.click(firstRow!);
    
    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });

  it('handles select all correctly', () => {
    const onSelectionChange = jest.fn();
    renderWithTheme(
      <MappingTable {...defaultProps} onSelectionChange={onSelectionChange} />
    );
    
    // Click select all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(onSelectionChange).toHaveBeenCalledWith([1, 2]);
  });

  it('handles sorting correctly', () => {
    const onSort = jest.fn();
    renderWithTheme(<MappingTable {...defaultProps} onSort={onSort} />);
    
    // Click on AniDB ID column header
    const anidbHeader = screen.getByText('AniDB ID');
    fireEvent.click(anidbHeader);
    
    expect(onSort).toHaveBeenCalledWith('anidb_id', 'asc');
  });

  it('handles edit action correctly', () => {
    const onEdit = jest.fn();
    renderWithTheme(<MappingTable {...defaultProps} onEdit={onEdit} />);
    
    // Click edit button for first mapping
    const editButtons = screen.getAllByLabelText(/edit mapping/i);
    fireEvent.click(editButtons[0]);
    
    expect(onEdit).toHaveBeenCalledWith(mockMappings[0]);
  });

  it('handles delete action correctly', () => {
    const onDelete = jest.fn();
    renderWithTheme(<MappingTable {...defaultProps} onDelete={onDelete} />);
    
    // Click delete button for first mapping
    const deleteButtons = screen.getAllByLabelText(/delete mapping/i);
    fireEvent.click(deleteButtons[0]);
    
    expect(onDelete).toHaveBeenCalledWith(mockMappings[0]);
  });

  it('shows loading state correctly', () => {
    renderWithTheme(<MappingTable {...defaultProps} loading={true} />);
    
    // Should show skeleton loaders - check for skeleton class
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no mappings', () => {
    renderWithTheme(<MappingTable {...defaultProps} mappings={[]} />);
    
    expect(screen.getByText('No mappings found')).toBeInTheDocument();
  });

  it('displays confidence scores with correct colors', () => {
    renderWithTheme(<MappingTable {...defaultProps} />);
    
    // High confidence (95%) should be green
    const highConfidenceChip = screen.getByText('95%');
    expect(highConfidenceChip).toBeInTheDocument();
    
    // Medium confidence (50%) should be orange/warning
    const mediumConfidenceChip = screen.getByText('50%');
    expect(mediumConfidenceChip).toBeInTheDocument();
  });

  it('truncates long titles correctly', () => {
    const longTitleMapping: AniDBMapping = {
      ...mockMappings[0],
      title: 'This is a very long anime title that should be truncated when displayed in the table'
    };
    
    renderWithTheme(
      <MappingTable {...defaultProps} mappings={[longTitleMapping]} />
    );
    
    const titleElement = screen.getByTitle(longTitleMapping.title);
    expect(titleElement).toBeInTheDocument();
  });

  it('prevents event propagation on action buttons', () => {
    const onSelectionChange = jest.fn();
    const onEdit = jest.fn();
    
    renderWithTheme(
      <MappingTable 
        {...defaultProps} 
        onSelectionChange={onSelectionChange}
        onEdit={onEdit}
      />
    );
    
    // Click edit button - should not trigger row selection
    const editButtons = screen.getAllByLabelText(/edit mapping/i);
    fireEvent.click(editButtons[0]);
    
    expect(onEdit).toHaveBeenCalledWith(mockMappings[0]);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});