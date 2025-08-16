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
  useMediaQuery,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      <Card sx={{ 
        height: { xs: 320, sm: 400 }, 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: { xs: 2, sm: 1 },
      }}>
        <Skeleton variant="rectangular" height={isMobile ? 160 : 200} />
        <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          <Skeleton variant="text" height={isMobile ? 24 : 28} />
          <Skeleton variant="text" height={isMobile ? 16 : 20} width="60%" />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" height={isMobile ? 28 : 32} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: { xs: 320, sm: 400 },
        display: 'flex',
        flexDirection: 'column',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        borderRadius: { xs: 2, sm: 1 },
        boxShadow: isMobile ? theme.shadows[2] : theme.shadows[1],
        '&:hover': {
          transform: isMobile ? 'none' : 'translateY(-4px)',
          boxShadow: isMobile ? theme.shadows[3] : theme.shadows[8],
          '& .anime-card-overlay': {
            opacity: isMobile ? 0 : 1
          }
        },
        '&:active': {
          cursor: draggable ? 'grabbing' : 'pointer',
          transform: isMobile ? 'scale(0.98)' : 'translateY(-4px)',
        }
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={() => onViewDetails(anime)}
      draggable={draggable}
    >
      {/* Status indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 6, sm: 8 },
          left: { xs: 6, sm: 8 },
          zIndex: 2
        }}
      >
        <Chip
          size={isMobile ? "small" : "small"}
          label={anime.status.replace('_', ' ').toUpperCase()}
          sx={{
            backgroundColor: getStatusColor(anime.status),
            color: 'white',
            fontWeight: 600,
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            height: { xs: 20, sm: 24 },
          }}
        />
      </Box>

      {/* Menu button */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 6, sm: 8 },
          right: { xs: 6, sm: 8 },
          zIndex: 2
        }}
      >
        <IconButton
          size={isMobile ? "medium" : "small"}
          onClick={handleMenuOpen}
          aria-label="More options"
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            width: { xs: 36, sm: 32 },
            height: { xs: 36, sm: 32 },
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9)
            }
          }}
        >
          <MoreVertIcon fontSize={isMobile ? "medium" : "small"} />
        </IconButton>
      </Box>

      {/* Anime image */}
      <CardMedia
        component="img"
        height={isMobile ? "160" : "200"}
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

      {/* Hover overlay - hidden on mobile */}
      {!isMobile && (
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
      )}

      <CardContent sx={{ 
        flexGrow: 1, 
        p: { xs: 1.5, sm: 2 },
        '&:last-child': { pb: { xs: 1.5, sm: 2 } }
      }}>
        {/* Title */}
        <Typography
          variant={isMobile ? "subtitle1" : "h6"}
          component="h3"
          sx={{
            fontWeight: 600,
            mb: { xs: 0.5, sm: 1 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            minHeight: { xs: '2.2em', sm: '2.4em' },
            fontSize: { xs: '0.9rem', sm: '1.25rem' },
          }}
        >
          {anime.anime.title}
        </Typography>

        {/* Progress */}
        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
          <ProgressUpdater
            currentProgress={anime.episodes_watched}
            totalEpisodes={anime.anime.episodes || undefined}
            onProgressUpdate={handleProgressUpdate}
            showProgressBar={true}
            allowQuickActions={false}
          />
        </Box>

        {/* Score */}
        <Box sx={{ 
          display: 'flex', 
          mb: { xs: 0.5, sm: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              mr: { xs: 0, sm: 1 }, 
              mb: { xs: 0.5, sm: 0 },
              minWidth: { xs: 'auto', sm: 45 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            Score:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Rating
              value={anime.score || 0}
              onChange={handleScoreChange}
              max={10}
              size={isMobile ? "small" : "small"}
              precision={1}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 1, 
                color: 'text.secondary',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
              }}
            >
              {anime.score || 'Not rated'}
            </Typography>
          </Box>
        </Box>

        {/* Dates - Hide on mobile to save space */}
        {!isMobile && (anime.start_date || anime.finish_date) && (
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
        PaperProps={{
          sx: {
            minWidth: isMobile ? 180 : 160,
            '& .MuiMenuItem-root': {
              minHeight: isMobile ? 48 : 40,
              px: isMobile ? 3 : 2,
              fontSize: isMobile ? '1rem' : '0.875rem',
            }
          }
        }}
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