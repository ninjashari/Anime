import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  useTheme,
  Skeleton
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon
} from '@mui/icons-material';
import {
  AniDBMapping,
  MappingSortField,
  SortOrder,
  MAPPING_SOURCE_LABELS,
  MAPPING_SOURCE_COLORS
} from '../../types/mapping';

interface MappingTableProps {
  mappings: AniDBMapping[];
  loading?: boolean;
  selectedMappings: number[];
  onSelectionChange: (selected: number[]) => void;
  onSort: (field: MappingSortField, order: SortOrder) => void;
  onEdit: (mapping: AniDBMapping) => void;
  onDelete: (mapping: AniDBMapping) => void;
  sortField?: MappingSortField;
  sortOrder?: SortOrder;
}

const MappingTable: React.FC<MappingTableProps> = ({
  mappings,
  loading = false,
  selectedMappings,
  onSelectionChange,
  onSort,
  onEdit,
  onDelete,
  sortField,
  sortOrder
}) => {
  const theme = useTheme();

  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(mappings.map(m => m.id));
    } else {
      onSelectionChange([]);
    }
  }, [mappings, onSelectionChange]);

  const handleSelectOne = useCallback((mappingId: number) => {
    const isSelected = selectedMappings.includes(mappingId);
    if (isSelected) {
      onSelectionChange(selectedMappings.filter(id => id !== mappingId));
    } else {
      onSelectionChange([...selectedMappings, mappingId]);
    }
  }, [selectedMappings, onSelectionChange]);

  const handleSort = useCallback((field: MappingSortField) => {
    const isCurrentField = sortField === field;
    const newOrder: SortOrder = isCurrentField && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  }, [sortField, sortOrder, onSort]);

  const formatConfidenceScore = (score?: number) => {
    if (score === undefined || score === null) return 'N/A';
    return `${(score * 100).toFixed(0)}%`;
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return theme.palette.grey[400];
    if (score >= 0.8) return theme.palette.success.main;
    if (score >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isAllSelected = mappings.length > 0 && selectedMappings.length === mappings.length;
  const isIndeterminate = selectedMappings.length > 0 && selectedMappings.length < mappings.length;

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Skeleton variant="rectangular" width={24} height={24} />
              </TableCell>
              {['AniDB ID', 'MAL ID', 'Title', 'Confidence', 'Source', 'Created', 'Actions'].map((header) => (
                <TableCell key={header}>
                  <Skeleton variant="text" width={80} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={24} height={24} />
                </TableCell>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={isIndeterminate}
                checked={isAllSelected}
                onChange={handleSelectAll}
                color="primary"
              />
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'anidb_id'}
                direction={sortField === 'anidb_id' ? sortOrder : 'asc'}
                onClick={() => handleSort('anidb_id')}
              >
                AniDB ID
              </TableSortLabel>
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'mal_id'}
                direction={sortField === 'mal_id' ? sortOrder : 'asc'}
                onClick={() => handleSort('mal_id')}
              >
                MAL ID
              </TableSortLabel>
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'title'}
                direction={sortField === 'title' ? sortOrder : 'asc'}
                onClick={() => handleSort('title')}
              >
                Title
              </TableSortLabel>
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'confidence_score'}
                direction={sortField === 'confidence_score' ? sortOrder : 'asc'}
                onClick={() => handleSort('confidence_score')}
              >
                Confidence
              </TableSortLabel>
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'source'}
                direction={sortField === 'source' ? sortOrder : 'asc'}
                onClick={() => handleSort('source')}
              >
                Source
              </TableSortLabel>
            </TableCell>
            
            <TableCell>
              <TableSortLabel
                active={sortField === 'created_at'}
                direction={sortField === 'created_at' ? sortOrder : 'asc'}
                onClick={() => handleSort('created_at')}
              >
                Created
              </TableSortLabel>
            </TableCell>
            
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {mappings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No mappings found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            mappings.map((mapping) => {
              const isSelected = selectedMappings.includes(mapping.id);
              
              return (
                <TableRow
                  key={mapping.id}
                  hover
                  selected={isSelected}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleSelectOne(mapping.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      color="primary"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {mapping.anidb_id}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    {mapping.mal_id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkIcon fontSize="small" color="success" />
                        <Typography variant="body2">
                          {mapping.mal_id}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkOffIcon fontSize="small" color="error" />
                        <Typography variant="body2" color="text.secondary">
                          Unmapped
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={mapping.title || 'No title'}
                    >
                      {mapping.title || 'No title'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={formatConfidenceScore(mapping.confidence_score)}
                      size="small"
                      sx={{
                        backgroundColor: getConfidenceColor(mapping.confidence_score),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={MAPPING_SOURCE_LABELS[mapping.source] || mapping.source}
                      size="small"
                      sx={{
                        backgroundColor: MAPPING_SOURCE_COLORS[mapping.source] || theme.palette.grey[500],
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(mapping.created_at)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit mapping">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(mapping);
                          }}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete mapping">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(mapping);
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MappingTable;