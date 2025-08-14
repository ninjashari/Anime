import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Rating,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { AnimeListItem, AnimeStatus, ANIME_STATUS_COLORS } from '../../types/anime';
import StatusSelector from './StatusSelector';
import ProgressUpdater from './ProgressUpdater';

interface AnimeCardProps {
  anime: AnimeListItem;
  onStatusChange: (animeId: number, status: AnimeStatus) => void;
  onProgressUpdate: (animeId: number, episodes: number) => void;
  onScoreUpdate: (animeId: number, score: number) => void;
  onRemove: (animeId: number) => void;
  onViewDetails: (anime: AnimeListItem) => void;
  loading?: boolean;
  draggable?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  onStatusChange,
  onProgressUpdate,
  onScoreUpdate,
  onRemove,
  onViewDetails,
  loading = false,
  draggable = false
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (status: AnimeStatus) => {
    onStatusChange(anime.anime_id, status);
  };

  const handleProgressUpdate = (episodes: number) => {
    onProgressUpdate(anime.anime_id, episodes);
  };

  const handleScoreChange = (event: React.SyntheticEvent, value: number | null) => {
    if (value !== null) {
      onScoreUpdate(anime.anime_id, value);
    }
  };

  const handleViewDetails = () => {
    onViewDetails(anime);
    handleMenuClose();
  };

  const handleRemove = () => {
    onRemove(anime.anime_id);
    handleMenuClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: AnimeStatus) => {
    return ANIME_STATUS_COLORS[status] || theme.palette.grey[500];
  };

  if (loading) {
    return (
      <Card sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" height={28} />
          <Skeleton variant="text" height={20} width="60%" />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" height={32} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
          '& .anime-card-overlay': {
            opacity: 1
          }
        },
        '&:active': {
          cursor: draggable ? 'grabbing' : 'pointer'
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails(anime)}
      draggable={draggable}
    >
      {/* Status indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2
        }}
      >
        <Chip
          size="small"
          label={anime.status.replace('_', ' ').toUpperCase()}
          sx={{
            backgroundColor: getStatusColor(anime.status),
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem'
          }}
        />
      </Box>

      {/* Menu button */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2
        }}
      >
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label="More options"
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9)
            }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Anime image */}
      <CardMedia
        component="img"
        height="200"
        image={anime.anime.image_url || '/placeholder-anime.jpg'}
        alt={anime.anime.title}
        sx={{
          objectFit: 'cover',
          backgroundColor: theme.palette.grey[200]
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder-anime.jpg';
        }}
      />

      {/* Hover overlay */}
      <Box
        className="anime-card-overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(to bottom, transparent 0%, ${alpha(theme.palette.common.black, 0.7)} 100%)`,
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          display: 'flex',
          alignItems: 'flex-end',
          p: 2,
          zIndex: 1
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          Click for details
        </Typography>
      </Box>

      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Title */}
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 600,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            minHeight: '2.4em'
          }}
        >
          {anime.anime.title}
        </Typography>

        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <ProgressUpdater
            currentProgress={anime.episodes_watched}
            totalEpisodes={anime.anime.episodes || undefined}
            onProgressUpdate={handleProgressUpdate}
            showProgressBar={true}
            allowQuickActions={false}
          />
        </Box>

        {/* Score */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ mr: 1, minWidth: 45 }}>
            Score:
          </Typography>
          <Rating
            value={anime.score || 0}
            onChange={handleScoreChange}
            max={10}
            size="small"
            precision={1}
          />
          <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
            {anime.score || 'Not rated'}
          </Typography>
        </Box>

        {/* Dates */}
        {(anime.start_date || anime.finish_date) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {anime.start_date && formatDate(anime.start_date)}
              {anime.start_date && anime.finish_date && ' - '}
              {anime.finish_date && formatDate(anime.finish_date)}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleViewDetails}>
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Quick Edit
        </MenuItem>
        <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Remove
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default AnimeCard;