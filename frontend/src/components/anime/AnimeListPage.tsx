import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  Skeleton,
  Fab,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Sort as SortIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import { AnimeListItem, AnimeStatus, ANIME_STATUS_LABELS, ANIME_STATUS_COLORS } from '../../types/anime';
import { animeListApi, AnimeListApiParams } from '../../services/animeListApi';
import AnimeCard from './AnimeCard';
import AnimeModal from './AnimeModal';

interface AnimeListPageProps {
  status: AnimeStatus;
  title: string;
}

type SortOption = 'title' | 'score' | 'episodes_watched' | 'updated_at' | 'start_date';
type ViewMode = 'grid' | 'list';

const AnimeListPage: React.FC<AnimeListPageProps> = ({ status, title }) => {
  const theme = useTheme();
  const [animeList, setAnimeList] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<AnimeListItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Pagination and filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [perPage] = useState(20);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<AnimeListItem | null>(null);

  const fetchAnimeList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: AnimeListApiParams = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const response = await animeListApi.getAnimeList(status, params);
      setAnimeList(response.items);
      setTotalPages(Math.ceil(response.total / perPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load anime list');
    } finally {
      setLoading(false);
    }
  }, [status, page, perPage, sortBy, sortOrder]);

  useEffect(() => {
    fetchAnimeList();
  }, [fetchAnimeList]);

  // Filter anime list based on search query
  const filteredAnimeList = animeList.filter(anime =>
    anime.anime.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (anime.anime.title_english?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStatusChange = async (animeId: number, newStatus: AnimeStatus) => {
    try {
      await animeListApi.updateAnimeStatus(animeId, newStatus);
      
      // Remove from current list if status changed
      if (newStatus !== status) {
        setAnimeList(prev => prev.filter(item => item.anime_id !== animeId));
      } else {
        // Update in current list
        setAnimeList(prev => prev.map(item => 
          item.anime_id === animeId 
            ? { ...item, status: newStatus }
            : item
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleProgressUpdate = async (animeId: number, episodes: number) => {
    try {
      const updatedItem = await animeListApi.updateEpisodeProgress(animeId, episodes);
      
      setAnimeList(prev => prev.map(item => 
        item.anime_id === animeId 
          ? { ...item, episodes_watched: episodes }
          : item
      ));

      // Update modal if open
      if (selectedAnime && selectedAnime.anime_id === animeId) {
        setSelectedAnime({ ...selectedAnime, episodes_watched: episodes });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    }
  };

  const handleScoreUpdate = async (animeId: number, score: number) => {
    try {
      await animeListApi.updateAnimeListItem(animeId, { score });
      
      setAnimeList(prev => prev.map(item => 
        item.anime_id === animeId 
          ? { ...item, score }
          : item
      ));

      // Update modal if open
      if (selectedAnime && selectedAnime.anime_id === animeId) {
        setSelectedAnime({ ...selectedAnime, score });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
    }
  };

  const handleRemove = async (animeId: number) => {
    try {
      await animeListApi.removeAnime(animeId);
      setAnimeList(prev => prev.filter(item => item.anime_id !== animeId));
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove anime');
    }
  };

  const handleViewDetails = (anime: AnimeListItem) => {
    setSelectedAnime(anime);
    setModalOpen(true);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value as SortOption);
    setPage(1);
  };

  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Drag and drop handlers
  const handleDragStart = (anime: AnimeListItem) => {
    setDraggedItem(anime);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent, targetStatus: AnimeStatus) => {
    event.preventDefault();
    if (draggedItem && draggedItem.status !== targetStatus) {
      handleStatusChange(draggedItem.anime_id, targetStatus);
    }
    setDraggedItem(null);
  };

  const getStatusColor = (status: AnimeStatus) => {
    return ANIME_STATUS_COLORS[status] || theme.palette.grey[500];
  };

  const renderSkeletonCards = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <AnimeCard
            anime={{} as AnimeListItem}
            onStatusChange={() => {}}
            onProgressUpdate={() => {}}
            onScoreUpdate={() => {}}
            onRemove={() => {}}
            onViewDetails={() => {}}
            loading={true}
          />
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Chip
            label={`${filteredAnimeList.length} anime`}
            sx={{
              backgroundColor: getStatusColor(status),
              color: 'white',
              fontWeight: 600
            }}
          />
        </Box>

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap',
          alignItems: 'center',
          mb: 2
        }}>
          {/* Search */}
          <TextField
            placeholder="Search anime..."
            value={searchQuery}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={handleSortChange}
            >
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="score">Score</MenuItem>
              <MenuItem value="episodes_watched">Progress</MenuItem>
              <MenuItem value="updated_at">Last Updated</MenuItem>
              <MenuItem value="start_date">Start Date</MenuItem>
            </Select>
          </FormControl>

          {/* Sort order */}
          <Chip
            label={sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            onClick={handleSortOrderToggle}
            icon={<SortIcon />}
            variant="outlined"
            clickable
          />

          {/* View mode toggle */}
          <Box sx={{ display: 'flex', ml: 'auto' }}>
            <Chip
              label="Grid"
              icon={<ViewModuleIcon />}
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'filled' : 'outlined'}
              clickable
              sx={{ mr: 1 }}
            />
            <Chip
              label="List"
              icon={<ViewListIcon />}
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'filled' : 'outlined'}
              clickable
            />
          </Box>
        </Box>
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        renderSkeletonCards()
      ) : filteredAnimeList.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No anime found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery 
              ? `No anime matching "${searchQuery}" in your ${title.toLowerCase()} list.`
              : `Your ${title.toLowerCase()} list is empty.`
            }
          </Typography>
        </Box>
      ) : (
        <>
          {/* Anime grid */}
          <Grid container spacing={3}>
            {filteredAnimeList.map((anime) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                md={viewMode === 'grid' ? 4 : 12} 
                lg={viewMode === 'grid' ? 3 : 12} 
                key={anime.id}
              >
                <div
                  onDragStart={() => handleDragStart(anime)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <AnimeCard
                    anime={anime}
                    onStatusChange={handleStatusChange}
                    onProgressUpdate={handleProgressUpdate}
                    onScoreUpdate={handleScoreUpdate}
                    onRemove={handleRemove}
                    onViewDetails={handleViewDetails}
                    draggable={true}
                  />
                </div>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="add anime"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24
        }}
        onClick={() => {
          // Navigate to search page
          window.location.href = '/search';
        }}
      >
        <AddIcon />
      </Fab>

      {/* Anime details modal */}
      <AnimeModal
        anime={selectedAnime}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
        onProgressUpdate={handleProgressUpdate}
        onScoreUpdate={handleScoreUpdate}
        onRemove={handleRemove}
      />
    </Box>
  );
};

export default AnimeListPage;