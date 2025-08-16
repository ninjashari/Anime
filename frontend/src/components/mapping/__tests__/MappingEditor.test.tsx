import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MappingEditor from '../MappingEditor';
import { AniDBMapping } from '../../../types/mapping';
import { mappingApi } from '../../../services/mappingApi';

// Mock the mapping API
jest.mock('../../../services/mappingApi', () => ({
  mappingApi: {
    createMapping: jest.fn(),
    updateMapping: jest.fn(),
    calculateConfidenceScore: jest.fn()
  }
}));

const theme = createTheme();

const mockMapping: AniDBMapping = {
  id: 1,
  anidb_id: 12345,
  mal_id: 54321,
  title: 'Test Anime',
  confidence_score: 0.95,
  source: 'manual',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

const defaultProps = {
  open: true,
  mapping: null,
  onClose: jest.fn(),
  onSave: jest.fn(),
  mode: 'create' as const
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MappingEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create mode correctly', () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    expect(screen.getByText('Create New Mapping')).toBeInTheDocument();
    expect(screen.getByLabelText(/anidb id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/myanimelist id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  it('renders edit mode correctly', () => {
    renderWithTheme(
      <MappingEditor 
        {...defaultProps} 
        mode="edit" 
        mapping={mockMapping}
      />
    );
    
    expect(screen.getByText('Edit Mapping')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('54321')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Anime')).toBeInTheDocument();
  });

  it('disables AniDB ID field in edit mode', () => {
    renderWithTheme(
      <MappingEditor 
        {...defaultProps} 
        mode="edit" 
        mapping={mockMapping}
      />
    );
    
    const anidbIdField = screen.getByLabelText(/anidb id/i);
    expect(anidbIdField).toBeDisabled();
  });

  it('validates required fields', async () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    // Try to save without AniDB ID
    const saveButton = screen.getByText('Create');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('AniDB ID is required')).toBeInTheDocument();
    });
  });

  it('validates numeric fields', async () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    // Enter invalid AniDB ID
    const anidbIdField = screen.getByLabelText(/anidb id/i);
    fireEvent.change(anidbIdField, { target: { value: 'invalid' } });
    
    const saveButton = screen.getByText('Create');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('AniDB ID must be a positive number')).toBeInTheDocument();
    });
  });

  it('handles form input changes', () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    const anidbIdField = screen.getByLabelText(/anidb id/i);
    const malIdField = screen.getByLabelText(/myanimelist id/i);
    const titleField = screen.getByLabelText(/title/i);
    
    fireEvent.change(anidbIdField, { target: { value: '12345' } });
    fireEvent.change(malIdField, { target: { value: '54321' } });
    fireEvent.change(titleField, { target: { value: 'Test Anime' } });
    
    expect(anidbIdField).toHaveValue('12345');
    expect(malIdField).toHaveValue('54321');
    expect(titleField).toHaveValue('Test Anime');
  });

  it('handles confidence score slider', () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 0.8 } });
    
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('handles source selection', () => {
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    const sourceSelect = screen.getByLabelText(/source/i);
    fireEvent.mouseDown(sourceSelect);
    
    const autoOption = screen.getByText('Automatic');
    fireEvent.click(autoOption);
    
    expect(sourceSelect).toHaveTextContent('Automatic');
  });

  it('calls createMapping API in create mode', async () => {
    const mockCreatedMapping = { ...mockMapping, id: 2 };
    (mappingApi.createMapping as jest.Mock).mockResolvedValue(mockCreatedMapping);
    
    const onSave = jest.fn();
    renderWithTheme(<MappingEditor {...defaultProps} onSave={onSave} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/anidb id/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/myanimelist id/i), { target: { value: '54321' } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Anime' } });
    
    // Save
    fireEvent.click(screen.getByText('Create'));
    
    await waitFor(() => {
      expect(mappingApi.createMapping).toHaveBeenCalledWith({
        anidb_id: 12345,
        mal_id: 54321,
        title: 'Test Anime',
        confidence_score: 0.5,
        source: 'manual'
      });
      expect(onSave).toHaveBeenCalledWith(mockCreatedMapping);
    });
  });

  it('calls updateMapping API in edit mode', async () => {
    const mockUpdatedMapping = { ...mockMapping, title: 'Updated Anime' };
    (mappingApi.updateMapping as jest.Mock).mockResolvedValue(mockUpdatedMapping);
    
    const onSave = jest.fn();
    renderWithTheme(
      <MappingEditor 
        {...defaultProps} 
        mode="edit" 
        mapping={mockMapping}
        onSave={onSave}
      />
    );
    
    // Update title
    const titleField = screen.getByLabelText(/title/i);
    fireEvent.change(titleField, { target: { value: 'Updated Anime' } });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mappingApi.updateMapping).toHaveBeenCalledWith(12345, {
        mal_id: 54321,
        title: 'Updated Anime',
        confidence_score: 0.95,
        source: 'manual'
      });
      expect(onSave).toHaveBeenCalledWith(mockUpdatedMapping);
    });
  });

  it('handles calculate confidence button', async () => {
    (mappingApi.calculateConfidenceScore as jest.Mock).mockResolvedValue({
      confidence_score: 0.85,
      anidb_title: 'Test Anime',
      mal_title: 'Test Anime'
    });
    
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    // Enter title
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Anime' } });
    
    // Click calculate button
    const calculateButton = screen.getByText('Calculate');
    fireEvent.click(calculateButton);
    
    await waitFor(() => {
      expect(mappingApi.calculateConfidenceScore).toHaveBeenCalledWith('Test Anime', 'Test Anime');
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('shows loading state during save', async () => {
    (mappingApi.createMapping as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    // Fill required field
    fireEvent.change(screen.getByLabelText(/anidb id/i), { target: { value: '12345' } });
    
    // Click save
    fireEvent.click(screen.getByText('Create'));
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('handles API errors', async () => {
    (mappingApi.createMapping as jest.Mock).mockRejectedValue(
      new Error('Mapping already exists')
    );
    
    renderWithTheme(<MappingEditor {...defaultProps} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/anidb id/i), { target: { value: '12345' } });
    
    // Save
    fireEvent.click(screen.getByText('Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Mapping already exists')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    renderWithTheme(<MappingEditor {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(onClose).toHaveBeenCalled();
  });

  it('prevents closing during save operation', () => {
    const onClose = jest.fn();
    renderWithTheme(<MappingEditor {...defaultProps} onClose={onClose} />);
    
    // Simulate loading state
    const saveButton = screen.getByText('Create');
    fireEvent.click(saveButton);
    
    // Try to close
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });
});