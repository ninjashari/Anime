import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Avatar,
  Chip,
  Rating,
  Grid,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
  Tv as TvIcon
} from '@mui/icons-material';
import { SearchAnimeResult, AddToListRequest } from '../../services';
import { AnimeStatus, ANIME_STATUS_LABELS, ANIME_STATUS_COLORS } from '../../types/anime';

interface AddToListModalProps {
  open: boolean;
  anime: SearchAnimeResult | null;
  onClose: () => void;
  onAdd: (request: AddToListRequest) => Promise<void>;
  loading?: boolean;
}

const AddToListModal: React.FC<AddToListModalProps> = ({
  open,
  anime,
  onClose,
  onAdd,
  loading = false
}) => {
  const theme = useTheme();
  const [status, setStatus] = useState<AnimeStatus>('plan_to_watch');
  const [score, setScore] = useState<number>(0);
  const [episodesWatched, setEpisodesWatched] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStatus('plan_to_watch');
      setScore(0);
      setEpisodesWatched(0);
      setError(null);
    }
  }, [open]);

  const handleStatusChange = (newStatus: AnimeStatus) => {
    setStatus(newStatus);
    
    // Auto-set episodes watched based on status
    if (newStatus === 'completed' && anime?.episodes) {
      setEpisodesWatched(anime.episodes);
    } else if (newStatus === 'plan_to_watch') {
      setEpisodesWatched(0);
    }
  };

  const handleScoreChange = (event: React.SyntheticEvent, value: number | null) => {
    setScore(value || 0);
  };

  const handleEpisodesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0;
    const maxEpisodes = anime?.episodes || 9999;
    setEpisodesWatched(Math.min(Math.max(0, value), maxEpisodes));
  };

  const handleSubmit = async () => {
    if (!anime) return;

    setSubmitting(true);
    setError(null);

    try {
      const request: AddToListRequest = {
        mal_id: anime.mal_id,
        status,
        episodes_watched: episodesWatched,
      };

      // Only include score if it's greater than 0
      if (score > 0) {
        request.score = score;
      }

      await onAdd(request);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add anime to list');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).getFullYear();
    } catch {
      return null;
    }
  };

  const getStatusColor = (statusKey: AnimeStatus) => {
    return ANIME_STATUS_COLORS[statusKey] || theme.palette.grey[500];
  };

  if (!anime) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            src={anime.image_url}
            alt={anime.title}
            variant="rounded"
            sx={{
              width: 60,
              height: 80,
              flexShrink: 0
            }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Add to List
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {anime.title}
            </Typography>
            {anime.title_english && anime.title_english !== anime.title && (
              <Typography variant="body2" color="text.secondary">
                {anime.title_english}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Anime info */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {anime.start_date && (
              <Chip
                size="small"
                icon={<CalendarIcon fontSize="small" />}
                label={formatDate(anime.start_date)}
                variant="outlined"
              />
            )}
            {anime.episodes && (
              <Chip
                size="small"
                icon={<TvIcon fontSize="small" />}
                label={`${anime.episodes} episodes`}
                variant="outlined"
              />
            )}
            {anime.score && (
              <Chip
                size="small"
                icon={<StarIcon fontSize="small" />}
                label={anime.score.toFixed(1)}
                variant="outlined"
              />
            )}
          </Box>

          {anime.genres.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {anime.genres.slice(0, 5).map((genre, index) => (
                <Chip
                  key={index}
                  size="small"
                  label={genre}
                  sx={{
                    fontSize: '0.7rem',
                    height: 20,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Form */}
        <Grid container spacing={3}>
          {/* Status */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => handleStatusChange(e.target.value as AnimeStatus)}
              >
                {Object.entries(ANIME_STATUS_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(key as AnimeStatus),
                        }}
                      />
                      {label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Episodes watched */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Episodes Watched"
              value={episodesWatched}
              onChange={handleEpisodesChange}
              inputProps={{
                min: 0,
                max: anime.episodes || 9999,
              }}
              helperText={anime.episodes ? `Total: ${anime.episodes} episodes` : undefined}
            />
          </Grid>

          {/* Score */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Score (Optional)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating
                  value={score}
                  onChange={handleScoreChange}
                  max={10}
                  size="medium"
                  precision={1}
                />
                <Typography variant="body2" color="text.secondary">
                  {score > 0 ? `${score}/10` : 'Not rated'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
          sx={{ textTransform: 'none', minWidth: 100 }}
        >
          {submitting ? 'Adding...' : 'Add to List'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddToListModal;