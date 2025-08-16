import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Fade,
  useTheme
} from '@mui/material';
import { SearchAnimeResult, searchApi, AddToListRequest } from '../../services';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import AddToListModal from './AddToListModal';

const SearchPage: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Modal state
  const [selectedAnime, setSelectedAnime] = useState<SearchAnimeResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  
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

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSearch = useCallback(async (searchQuery: string, isLoadMore = false) => {
    if (!searchQuery.trim()) return;

    const currentOffset = isLoadMore ? offset : 0;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
      setResults([]);
      setOffset(0);
      setQuery(searchQuery);
      setHasSearched(true);
    }

    try {
      const response = await searchApi.searchAnime(searchQuery, 20, currentOffset);
      
      if (isLoadMore) {
        setResults(prev => [...prev, ...response.results]);
      } else {
        setResults(response.results);
      }
      
      setHasMore(response.has_next);
      setOffset(currentOffset + response.results.length);
      
      if (response.cached) {
        showSnackbar('Results loaded from cache', 'info');
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to search anime';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset]);

  const handleLoadMore = useCallback(() => {
    if (query && hasMore && !loadingMore) {
      handleSearch(query, true);
    }
  }, [query, hasMore, loadingMore, handleSearch]);

  const handleAddToList = useCallback((anime: SearchAnimeResult) => {
    setSelectedAnime(anime);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedAnime(null);
  }, []);

  const handleAddToListSubmit = useCallback(async (request: AddToListRequest) => {
    if (!selectedAnime) return;

    setAddingToList(true);
    
    try {
      const response = await searchApi.addToList(request);
      
      if (response.success) {
        // Update the anime in results to show it's now in user's list
        setResults(prev => prev.map(anime => 
          anime.mal_id === selectedAnime.mal_id 
            ? { ...anime, in_user_list: true, user_list_status: request.status }
            : anime
        ));
        
        showSnackbar(response.message || 'Anime added to your list successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to add anime to list');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add anime to list';
      showSnackbar(errorMessage, 'error');
      throw err; // Re-throw to let modal handle it
    } finally {
      setAddingToList(false);
    }
  }, [selectedAnime]);

  const handleViewDetails = useCallback((anime: SearchAnimeResult) => {
    // For now, just show a snackbar. In the future, this could open a detailed modal
    showSnackbar(`Viewing details for ${anime.title}`, 'info');
  }, []);

  // Clear results when component unmounts
  useEffect(() => {
    return () => {
      setResults([]);
      setQuery('');
      setHasSearched(false);
    };
  }, []);

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Search Anime
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }}
        >
          Discover new anime and add them to your lists
        </Typography>
      </Box>

      {/* Search Bar */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
          borderRadius: { xs: 2, sm: 1 },
        }}
      >
        <SearchBar
          onSearch={(searchQuery) => handleSearch(searchQuery, false)}
          placeholder="Search for anime by title..."
          autoFocus={!theme.breakpoints.down('sm')} // Don't auto-focus on mobile to prevent keyboard popup
          loading={loading}
        />
      </Paper>

      {/* Results */}
      <Fade in={hasSearched} timeout={300}>
        <Box>
          {query && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search Results for "{query}"
              </Typography>
              {results.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Found {results.length} anime{hasMore ? ' (showing first results)' : ''}
                </Typography>
              )}
            </Box>
          )}

          <SearchResults
            results={results}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onAddToList={handleAddToList}
            onViewDetails={handleViewDetails}
            loadingMore={loadingMore}
          />
        </Box>
      </Fade>

      {/* Add to List Modal */}
      <AddToListModal
        open={modalOpen}
        anime={selectedAnime}
        onClose={handleModalClose}
        onAdd={handleAddToListSubmit}
        loading={addingToList}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SearchPage;