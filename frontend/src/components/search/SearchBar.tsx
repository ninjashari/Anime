import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Box,
  InputAdornment,
  IconButton,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { searchApi, SearchHistoryItem } from '../../services';
import { useDebounce } from '../../hooks';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  loading?: boolean;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search for anime...',
  autoFocus = false,
  disabled = false,
  loading = false,
  initialValue = ''
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce input value for suggestions
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Load search history on component mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const response = await searchApi.getSearchHistory(10);
        setSearchHistory(response.history);
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // Load suggestions when input changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (debouncedInputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const response = await searchApi.getSearchSuggestions(debouncedInputValue, 5);
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [debouncedInputValue]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowDropdown(false);

      // Update search history
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.query !== query.trim());
        return [
          { id: Date.now(), query: query.trim(), result_count: 0, created_at: new Date().toISOString() },
          ...filtered
        ].slice(0, 10);
      });
    }
  }, [onSearch]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch(inputValue);
    }
  };

  const handleSearchClick = () => {
    handleSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleHistoryClick = (query: string) => {
    setInputValue(query);
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSearch(suggestion);
  };

  const handleFocus = () => {
    setShowDropdown(true);
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow clicks on items
    setTimeout(() => setShowDropdown(false), 200);
  };

  const renderDropdownContent = () => {
    const hasHistory = searchHistory.length > 0;
    const hasSuggestions = suggestions.length > 0;
    const hasInput = inputValue.length > 0;

    if (loadingSuggestions) {
      return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      );
    }

    if (!hasHistory && !hasSuggestions && !hasInput) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Start typing to search for anime
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ py: 0 }}>
        {/* Suggestions */}
        {hasSuggestions && hasInput && (
          <>
            <ListItem sx={{ py: 0.5, px: 2 }}>
              <TrendingIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                SUGGESTIONS
              </Typography>
            </ListItem>
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={`suggestion-${index}`}
                button
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{ py: 0.5, px: 2 }}
              >
                <SearchIcon fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={suggestion}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
            {hasHistory && <Divider />}
          </>
        )}

        {/* Search History */}
        {hasHistory && (!hasInput || inputValue.length < 2) && (
          <>
            <ListItem sx={{ py: 0.5, px: 2 }}>
              <HistoryIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                RECENT SEARCHES
              </Typography>
            </ListItem>
            {searchHistory.slice(0, 5).map((item) => (
              <ListItem
                key={item.id}
                button
                onClick={() => handleHistoryClick(item.query)}
                sx={{ py: 0.5, px: 2 }}
              >
                <HistoryIcon fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={item.query}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </>
        )}
      </List>
    );
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
              {inputValue && (
                <IconButton
                  size="small"
                  onClick={handleClear}
                  disabled={disabled}
                  aria-label="Clear search"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                onClick={handleSearchClick}
                disabled={disabled || !inputValue.trim()}
                color="primary"
                aria-label="Search"
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
        }}
      />

      {/* Dropdown */}
      {showDropdown && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            maxHeight: 300,
            overflow: 'auto',
            boxShadow: 3,
          }}
        >
          {renderDropdownContent()}
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;