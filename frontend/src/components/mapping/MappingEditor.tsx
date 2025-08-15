import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Slider,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import {
  AniDBMapping,
  MappingCreateRequest,
  MappingUpdateRequest,
  MAPPING_SOURCE_LABELS
} from '../../types/mapping';
import { mappingApi } from '../../services/mappingApi';

interface MappingEditorProps {
  open: boolean;
  mapping?: AniDBMapping | null;
  onClose: () => void;
  onSave: (mapping: AniDBMapping) => void;
  mode: 'create' | 'edit';
}

const MappingEditor: React.FC<MappingEditorProps> = ({
  open,
  mapping,
  onClose,
  onSave,
  mode
}) => {
  const [formData, setFormData] = useState({
    anidb_id: '',
    mal_id: '',
    title: '',
    confidence_score: 0.5,
    source: 'manual'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatingConfidence, setCalculatingConfidence] = useState(false);
  const [confidenceResult, setConfidenceResult] = useState<number | null>(null);

  // Initialize form data when mapping changes
  useEffect(() => {
    if (mapping && mode === 'edit') {
      setFormData({
        anidb_id: mapping.anidb_id.toString(),
        mal_id: mapping.mal_id?.toString() || '',
        title: mapping.title || '',
        confidence_score: mapping.confidence_score || 0.5,
        source: mapping.source
      });
    } else if (mode === 'create') {
      setFormData({
        anidb_id: '',
        mal_id: '',
        title: '',
        confidence_score: 0.5,
        source: 'manual'
      });
    }
    setError(null);
    setConfidenceResult(null);
  }, [mapping, mode, open]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleCalculateConfidence = async () => {
    if (!formData.title.trim()) {
      setError('Please enter a title to calculate confidence');
      return;
    }

    setCalculatingConfidence(true);
    try {
      // For demo purposes, we'll use the same title for both AniDB and MAL
      // In a real implementation, you might have separate fields or fetch MAL title
      const result = await mappingApi.calculateConfidenceScore(
        formData.title,
        formData.title // Using same title for demo
      );
      
      setConfidenceResult(result.confidence_score);
      setFormData(prev => ({
        ...prev,
        confidence_score: result.confidence_score
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to calculate confidence score');
    } finally {
      setCalculatingConfidence(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.anidb_id.trim()) {
      setError('AniDB ID is required');
      return false;
    }

    const anidbId = parseInt(formData.anidb_id);
    if (isNaN(anidbId) || anidbId <= 0) {
      setError('AniDB ID must be a positive number');
      return false;
    }

    if (formData.mal_id.trim()) {
      const malId = parseInt(formData.mal_id);
      if (isNaN(malId) || malId <= 0) {
        setError('MAL ID must be a positive number');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const anidbId = parseInt(formData.anidb_id);
      const malId = formData.mal_id.trim() ? parseInt(formData.mal_id) : undefined;

      let savedMapping: AniDBMapping;

      if (mode === 'create') {
        const createData: MappingCreateRequest = {
          anidb_id: anidbId,
          mal_id: malId,
          title: formData.title.trim() || undefined,
          confidence_score: formData.confidence_score,
          source: formData.source
        };
        savedMapping = await mappingApi.createMapping(createData);
      } else {
        const updateData: MappingUpdateRequest = {
          mal_id: malId,
          title: formData.title.trim() || undefined,
          confidence_score: formData.confidence_score,
          source: formData.source
        };
        savedMapping = await mappingApi.updateMapping(anidbId, updateData);
      }

      onSave(savedMapping);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} mapping`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">
          {mode === 'create' ? 'Create New Mapping' : 'Edit Mapping'}
        </Typography>
        {mapping && mode === 'edit' && (
          <Typography variant="body2" color="text.secondary">
            AniDB ID: {mapping.anidb_id}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="AniDB ID"
                value={formData.anidb_id}
                onChange={(e) => handleInputChange('anidb_id', e.target.value)}
                fullWidth
                required
                disabled={mode === 'edit' || loading}
                type="number"
                helperText="The AniDB identifier for this anime"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="MyAnimeList ID"
                value={formData.mal_id}
                onChange={(e) => handleInputChange('mal_id', e.target.value)}
                fullWidth
                disabled={loading}
                type="number"
                helperText="Optional: The corresponding MAL ID"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                fullWidth
                disabled={loading}
                multiline
                rows={2}
                helperText="Anime title for reference"
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Typography gutterBottom>
                Confidence Score: {(formData.confidence_score * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={formData.confidence_score}
                onChange={(_, value) => handleInputChange('confidence_score', value as number)}
                min={0}
                max={1}
                step={0.01}
                disabled={loading}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.5, label: '50%' },
                  { value: 1, label: '100%' }
                ]}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={getConfidenceLabel(formData.confidence_score)}
                  color={getConfidenceColor(formData.confidence_score) as any}
                  size="small"
                />
                {confidenceResult !== null && (
                  <Typography variant="body2" color="text.secondary">
                    Calculated: {(confidenceResult * 100).toFixed(0)}%
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                onClick={handleCalculateConfidence}
                disabled={loading || calculatingConfidence || !formData.title.trim()}
                startIcon={calculatingConfidence ? <CircularProgress size={16} /> : <CalculateIcon />}
                fullWidth
              >
                Calculate
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={formData.source}
                  label="Source"
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  disabled={loading}
                >
                  {Object.entries(MAPPING_SOURCE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MappingEditor;