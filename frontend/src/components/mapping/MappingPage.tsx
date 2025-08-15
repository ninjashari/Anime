import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Pagination,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreVertIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import {
  AniDBMapping,
  MappingListResponse,
  MappingStatistics,
  MappingSortField,
  SortOrder,
  MappingFilters,
  MAPPING_SOURCE_LABELS
} from '../../types/mapping';
import { mappingApi } from '../../services/mappingApi';
import MappingTable from './MappingTable';
import MappingEditor from './MappingEditor';

const MappingPage: React.FC = () => {
  const theme = useTheme();
  
  // Data state
  const [mappings, setMappings] = useState<AniDBMapping[]>([]);
  const [statistics, setStatistics] = useState<MappingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMappings, setTotalMappings] = useState(0);
  const [perPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MappingFilters>({});
  const [sortField, setSortField] = useState<MappingSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // UI state
  const [selectedMappings, setSelectedMappings] = useState<number[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingMapping, setEditingMapping] = useState<AniDBMapping | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMapping, setDeletingMapping] = useState<AniDBMapping | null>(null);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: perPage,
        offset: (page - 1) * perPage,
        source_filter: filters.source,
        sort_by: sortField,
        sort_order: sortOrder
      };

      const response = await mappingApi.getMappings(params);
      setMappings(response.mappings);
      setTotalMappings(response.total);
      setTotalPages(Math.ceil(response.total / perPage));
    } catch (err: any) {
      setError(err.message || 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filters, sortField, sortOrder]);

  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await mappingApi.getStatistics();
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMappings();
      return;
    }

    try {
      setLoading(true);
      const results = await mappingApi.searchMappings({
        query: searchQuery,
        limit: perPage
      });
      setMappings(results);
      setTotalMappings(results.length);
      setTotalPages(1);
      setPage(1);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: MappingSortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleFilterChange = (newFilters: Partial<MappingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleCreateMapping = () => {
    setEditingMapping(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleEditMapping = (mapping: AniDBMapping) => {
    setEditingMapping(mapping);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const handleDeleteMapping = (mapping: AniDBMapping) => {
    setDeletingMapping(mapping);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMapping) return;

    try {
      await mappingApi.deleteMapping(deletingMapping.anidb_id);
      setMappings(prev => prev.filter(m => m.id !== deletingMapping.id));
      setTotalMappings(prev => prev - 1);
      showSnackbar('Mapping deleted successfully');
      fetchStatistics(); // Refresh stats
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete mapping', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingMapping(null);
    }
  };

  const handleMappingSaved = (savedMapping: AniDBMapping) => {
    if (editorMode === 'create') {
      setMappings(prev => [savedMapping, ...prev]);
      setTotalMappings(prev => prev + 1);
      showSnackbar('Mapping created successfully');
    } else {
      setMappings(prev => prev.map(m => m.id === savedMapping.id ? savedMapping : m));
      showSnackbar('Mapping updated successfully');
    }
    fetchStatistics(); // Refresh stats
  };

  const handleBulkDelete = async () => {
    if (selectedMappings.length === 0) return;

    try {
      const mappingsToDelete = mappings.filter(m => selectedMappings.includes(m.id));
      const anidbIds = mappingsToDelete.map(m => m.anidb_id);
      
      await mappingApi.bulkDeleteMappings(anidbIds);
      
      setMappings(prev => prev.filter(m => !selectedMappings.includes(m.id)));
      setTotalMappings(prev => prev - selectedMappings.length);
      setSelectedMappings([]);
      
      showSnackbar(`${selectedMappings.length} mappings deleted successfully`);
      fetchStatistics();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete mappings', 'error');
    } finally {
      setBulkMenuAnchor(null);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      const result = await mappingApi.refreshMappingData();
      showSnackbar(result.message, result.errors > 0 ? 'warning' : 'success');
      fetchMappings();
      fetchStatistics();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to refresh data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary">
                {statistics.total_mappings.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Mappings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="success.main">
                {statistics.mapped_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mapped
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="error.main">
                {statistics.unmapped_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unmapped
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="info.main">
                {statistics.manual_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manual
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="warning.main">
                {statistics.auto_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automatic
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6">
                {statistics.average_confidence ? `${(statistics.average_confidence * 100).toFixed(0)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Confidence
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            AniDB Mappings
          </Typography>
          <Chip
            icon={<StatsIcon />}
            label={`${totalMappings} total`}
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage AniDB to MyAnimeList ID mappings for Jellyfin integration
        </Typography>
      </Box>

      {/* Statistics */}
      {renderStatistics()}

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              placeholder="Search by title, AniDB ID, or MAL ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <Button onClick={handleSearch} size="small">
                      Search
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={filters.source || ''}
                label="Source"
                onChange={(e: SelectChangeEvent) => 
                  handleFilterChange({ source: e.target.value || undefined })
                }
              >
                <MenuItem value="">All Sources</MenuItem>
                {Object.entries(MAPPING_SOURCE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRefreshData}
                disabled={refreshing}
              >
                Refresh Data
              </Button>
              
              {selectedMappings.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<MoreVertIcon />}
                  onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                >
                  Bulk Actions ({selectedMappings.length})
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Mappings table */}
      <MappingTable
        mappings={mappings}
        loading={loading}
        selectedMappings={selectedMappings}
        onSelectionChange={setSelectedMappings}
        onSort={handleSort}
        onEdit={handleEditMapping}
        onDelete={handleDeleteMapping}
        sortField={sortField}
        sortOrder={sortOrder}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="add mapping"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={handleCreateMapping}
      >
        <AddIcon />
      </Fab>

      {/* Mapping editor dialog */}
      <MappingEditor
        open={editorOpen}
        mapping={editingMapping}
        onClose={() => setEditorOpen(false)}
        onSave={handleMappingSaved}
        mode={editorMode}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the mapping for AniDB ID {deletingMapping?.anidb_id}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk actions menu */}
      <Menu
        anchorEl={bulkMenuAnchor}
        open={Boolean(bulkMenuAnchor)}
        onClose={() => setBulkMenuAnchor(null)}
      >
        <MenuItem onClick={handleBulkDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Selected</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MappingPage;