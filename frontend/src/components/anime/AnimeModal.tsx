import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Rating,
  TextField,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  PlayArrow as PlayIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { AnimeListItem, AnimeStatus, ANIME_STATUS_LABELS, ANIME_STATUS_COLORS } from '../../types/anime';
import StatusSelector from './StatusSelector';
import ProgressUpdater from './ProgressUpdater';

interface AnimeModalProps {
  anime: AnimeListItem | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (animeId: number, status: AnimeStatus) => void;
  onProgressUpdate: (animeId: number, episodes: number) => void;
  onScoreUpdate: (animeId: number, score: number) => void;
  onRemove: (animeId: number) => void;
}

const AnimeModal: React.FC<AnimeModalProps> = ({
  anime,
  open,
  onClose,
  onStatusChange,
  onProgressUpdate,
  onScoreUpdate,
  onRemove
}) => {
  const theme = useTheme();
  let fullScreen = false;
  try {
    fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  } catch (error) {
    // Fallback for test environment
    fullScreen = false;
  }
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (anime) {
      setNotes(anime.notes || '');
      setHasChanges(false);
    }
  }, [anime]);

  if (!anime) return null;

  const handleStatusChange = (status: AnimeStatus) => {
    onStatusChange(anime.anime_id, status);
    setHasChanges(true);
  };

  const handleProgressUpdate = (episodes: number) => {
    onProgressUpdate(anime.anime_id, episodes);
    setHasChanges(true);
  };

  const handleScoreChange = (event: React.SyntheticEvent, value: number | null) => {
    if (value !== null) {
      onScoreUpdate(anime.anime_id, value);
      setHasChanges(true);
    }
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotes(event.target.value);
    setHasChanges(true);
  };

  const handleRemove = () => {
    onRemove(anime.anime_id);
    onClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: AnimeStatus) => {
    return ANIME_STATUS_COLORS[status] || theme.palette.grey[500];
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          minHeight: fullScreen ? '100vh' : 600,
          maxHeight: fullScreen ? '100vh' : '90vh'
        }
      }}
    >
      <DialogTitle sx={{ p: 0, position: 'relative' }}>
        {/* Header with background image */}
        <Box
          sx={{
            position: 'relative',
            height: 200,
            backgroundImage: anime.anime.image_url 
              ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${anime.anime.image_url})`
              : `linear-gradient(135deg, ${getStatusColor(anime.status)}, ${theme.palette.primary.main})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            p: 3
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={onClose}
            aria-label="close"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Status chip */}
          <Chip
            label={ANIME_STATUS_LABELS[anime.status]}
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              backgroundColor: getStatusColor(anime.status),
              color: 'white',
              fontWeight: 600
            }}
          />

          {/* Title */}
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: 'white',
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                mb: 1
              }}
            >
              {anime.anime.title}
            </Typography>
            {anime.anime.title_english && anime.anime.title_english !== anime.anime.title && (
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {anime.anime.title_english}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Left column - Image and basic info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                src={anime.anime.image_url}
                alt={anime.anime.title}
                sx={{
                  width: 200,
                  height: 280,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: theme.shadows[4]
                }}
                variant="rounded"
              />
              
              {/* Basic stats */}
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {anime.anime.episodes || '?'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Episodes
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {anime.anime.score?.toFixed(1) || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    MAL Score
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    #{anime.anime.rank || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rank
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right column - Details and controls */}
          <Grid item xs={12} md={8}>
            {/* Synopsis */}
            {anime.anime.synopsis && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="primary" />
                  Synopsis
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {anime.anime.synopsis}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* User data controls */}
            <Grid container spacing={3}>
              {/* Status */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Status
                </Typography>
                <StatusSelector
                  currentStatus={anime.status}
                  onStatusChange={handleStatusChange}
                  variant="outlined"
                  size="medium"
                />
              </Grid>

              {/* Progress */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Progress
                </Typography>
                <ProgressUpdater
                  currentProgress={anime.episodes_watched}
                  totalEpisodes={anime.anime.episodes || undefined}
                  onProgressUpdate={handleProgressUpdate}
                  showProgressBar={true}
                  allowQuickActions={true}
                />
              </Grid>

              {/* Score */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Your Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating
                    value={anime.score || 0}
                    onChange={handleScoreChange}
                    max={10}
                    size="large"
                    precision={1}
                    icon={<StarIcon fontSize="inherit" />}
                    emptyIcon={<StarIcon fontSize="inherit" />}
                  />
                  <Typography variant="body1" sx={{ ml: 1, minWidth: 30 }}>
                    {anime.score || 0}/10
                  </Typography>
                </Box>
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Dates
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Started: {formatDate(anime.start_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Finished: {formatDate(anime.finish_date)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add your notes about this anime..."
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={handleRemove}
          color="error"
          variant="outlined"
          startIcon={<CloseIcon />}
        >
          Remove from List
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnimeModal;