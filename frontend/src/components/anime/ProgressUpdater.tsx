import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  LinearProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';

interface ProgressUpdaterProps {
  currentProgress: number;
  totalEpisodes?: number;
  onProgressUpdate: (episodes: number) => void;
  disabled?: boolean;
  showProgressBar?: boolean;
  allowQuickActions?: boolean;
}

const ProgressUpdater: React.FC<ProgressUpdaterProps> = ({
  currentProgress,
  totalEpisodes,
  onProgressUpdate,
  disabled = false,
  showProgressBar = true,
  allowQuickActions = true
}) => {
  const [inputValue, setInputValue] = useState<string>(currentProgress.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(currentProgress.toString());
    }
  }, [currentProgress, isEditing]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const newValue = parseInt(inputValue, 10);
    if (!isNaN(newValue) && newValue >= 0) {
      const maxEpisodes = totalEpisodes || Number.MAX_SAFE_INTEGER;
      const clampedValue = Math.min(newValue, maxEpisodes);
      onProgressUpdate(clampedValue);
      setInputValue(clampedValue.toString());
    } else {
      setInputValue(currentProgress.toString());
    }
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleInputBlur();
    }
  };

  const handleIncrement = () => {
    const maxEpisodes = totalEpisodes || Number.MAX_SAFE_INTEGER;
    const newValue = Math.min(currentProgress + 1, maxEpisodes);
    onProgressUpdate(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(currentProgress - 1, 0);
    onProgressUpdate(newValue);
  };

  const progressPercentage = totalEpisodes 
    ? Math.min((currentProgress / totalEpisodes) * 100, 100)
    : 0;

  const isCompleted = totalEpisodes && currentProgress >= totalEpisodes;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: showProgressBar ? 1 : 0 }}>
        {allowQuickActions && (
          <Tooltip title="Decrease episode count">
            <span>
              <IconButton
                size="small"
                onClick={handleDecrement}
                disabled={disabled || currentProgress <= 0}
                sx={{ p: 0.5 }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        <TextField
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          size="small"
          type="number"
          inputProps={{
            min: 0,
            max: totalEpisodes,
            style: { textAlign: 'center' }
          }}
          InputProps={{
            endAdornment: totalEpisodes && (
              <InputAdornment position="end">
                <Typography variant="body2" color="text.secondary">
                  / {totalEpisodes}
                </Typography>
              </InputAdornment>
            )
          }}
          sx={{
            width: totalEpisodes ? 120 : 80,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: isCompleted ? 'success.main' : undefined
              }
            }
          }}
        />

        {allowQuickActions && (
          <Tooltip title="Increase episode count">
            <span>
              <IconButton
                size="small"
                onClick={handleIncrement}
                disabled={disabled || Boolean(totalEpisodes && currentProgress >= totalEpisodes)}
                sx={{ p: 0.5 }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {isCompleted && (
          <PlayIcon 
            color="success" 
            fontSize="small" 
            titleAccess="Completed!"
          />
        )}
      </Box>

      {showProgressBar && totalEpisodes && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              flexGrow: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: isCompleted ? 'success.main' : 'primary.main',
                borderRadius: 3
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
            {Math.round(progressPercentage)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProgressUpdater;