import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  Chip,
  Skeleton,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
  Tv as TvIcon
} from '@mui/icons-material';
import { SearchAnimeResult } from '../../services';
import { ANIME_STATUS_COLORS, ANIME_STATUS_LABELS } from '../../types/anime';

interface SearchResultsProps {
  results: SearchAnimeResult[];
  loading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAddToList: (anime: SearchAnimeResult) => void;
  onViewDetails?: (anime: SearchAnimeResult) => void;
  loadingMore?: boolean;
}

interface SearchResultCardProps {
  anime: SearchAnimeResult;
  onAddToList: (anime: SearchAnimeResult) => void;
  onViewDetails?: (anime: SearchAnimeResult) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  anime,
  onAddToList,
  onViewDetails
}) => {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onAddToList(anime);
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(anime);
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

  const getStatusColor = (status?: string) => {
    if (!status) return theme.palette.grey[500];
    const statusKey = status.toLowerCase().replace(' ', '_') as keyof typeof ANIME_STATUS_COLORS;
    return ANIME_STATUS_COLORS[statusKey] || theme.palette.grey[500];
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return 'Unknown';
    const statusKey = status.toLowerCase().replace(' ', '_') as keyof typeof ANIME_STATUS_LABELS;
    return ANIME_STATUS_LABELS[statusKey] || status;
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onViewDetails ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
      onClick={onViewDetails ? handleViewDetails : undefined}
    >
      {/* Status indicator */}
      {anime.in_user_list && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
          }}
        >
          <Chip
            size="small"
            icon={<CheckIcon fontSize="small" />}
            label={getStatusLabel(anime.user_list_status)}
            sx={{
              backgroundColor: getStatusColor(anime.user_list_status),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
      )}

      {/* Add button */}
      {!anime.in_user_list && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
          }}
        >
          <Tooltip title="Add to list">
            <IconButton
              size="small"
              onClick={handleAddClick}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.9),
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Anime image */}
      <CardMedia
        component="img"
        height="280"
        image={!imageError && anime.image_url ? anime.image_url : '/placeholder-anime.jpg'}
        alt={anime.title}
        onError={handleImageError}
        sx={{
          objectFit: 'cover',
          backgroundColor: theme.palette.grey[200],
        }}
      />

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
            minHeight: '2.4em',
          }}
        >
          {anime.title}
        </Typography>

        {/* English title */}
        {anime.title_english && anime.title_english !== anime.title && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {anime.title_english}
          </Typography>
        )}

        {/* Info row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {/* Year */}
          {anime.start_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatDate(anime.start_date)}
              </Typography>
            </Box>
          )}

          {/* Episodes */}
          {anime.episodes && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TvIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {anime.episodes} eps
              </Typography>
            </Box>
          )}

          {/* Score */}
          {anime.score && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StarIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {anime.score.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Media type and status */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          {anime.media_type && (
            <Chip
              size="small"
              label={anime.media_type}
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
          {anime.status && (
            <Chip
              size="small"
              label={anime.status}
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>

        {/* Genres */}
        {anime.genres.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {anime.genres.slice(0, 3).map((genre, index) => (
              <Chip
                key={index}
                size="small"
                label={genre}
                sx={{
                  fontSize: '0.65rem',
                  height: 18,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              />
            ))}
            {anime.genres.length > 3 && (
              <Typography variant="caption" color="text.secondary">
                +{anime.genres.length - 3} more
              </Typography>
            )}
          </Box>
        )}

        {/* Synopsis */}
        {anime.synopsis && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {anime.synopsis}
          </Typography>
        )}
      </CardContent>

      {/* Action button */}
      <Box sx={{ p: 2, pt: 0 }}>
        {anime.in_user_list ? (
          <Button
            fullWidth
            variant="outlined"
            disabled
            startIcon={<CheckIcon />}
            sx={{ textTransform: 'none' }}
          >
            In Your List
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={handleAddClick}
            startIcon={<AddIcon />}
            sx={{ textTransform: 'none' }}
          >
            Add to List
          </Button>
        )}
      </Box>
    </Card>
  );
};

const SearchResultSkeleton: React.FC = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Skeleton variant="rectangular" height={280} />
    <CardContent sx={{ flexGrow: 1 }}>
      <Skeleton variant="text" height={28} />
      <Skeleton variant="text" height={20} width="60%" />
      <Box sx={{ mt: 1, mb: 1 }}>
        <Skeleton variant="text" height={16} width="40%" />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Skeleton variant="rectangular" width={60} height={20} />
        <Skeleton variant="rectangular" width={80} height={20} />
      </Box>
      <Skeleton variant="text" height={16} />
      <Skeleton variant="text" height={16} />
      <Skeleton variant="text" height={16} width="80%" />
    </CardContent>
    <Box sx={{ p: 2, pt: 0 }}>
      <Skeleton variant="rectangular" height={36} />
    </Box>
  </Card>
);

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  onAddToList,
  onViewDetails,
  loadingMore = false,
}) => {
  const [visibleResults, setVisibleResults] = useState(20);

  // Reset visible results when new search is performed
  useEffect(() => {
    setVisibleResults(20);
  }, [results]);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore();
    } else {
      // Local pagination
      setVisibleResults(prev => prev + 20);
    }
  }, [onLoadMore]);

  // Show loading skeletons
  if (loading && results.length === 0) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 12 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <SearchResultSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Show error
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  // Show no results
  if (!loading && results.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No anime found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search terms or browse popular anime
        </Typography>
      </Box>
    );
  }

  const displayedResults = onLoadMore ? results : results.slice(0, visibleResults);
  const canLoadMore = onLoadMore ? hasMore : visibleResults < results.length;

  return (
    <Box>
      <Grid container spacing={3}>
        {displayedResults.map((anime) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={anime.mal_id}>
            <SearchResultCard
              anime={anime}
              onAddToList={onAddToList}
              onViewDetails={onViewDetails}
            />
          </Grid>
        ))}
      </Grid>

      {/* Load more button */}
      {canLoadMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
            sx={{ minWidth: 120 }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SearchResults;