import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Box
} from '@mui/material';
import { AnimeStatus, ANIME_STATUS_LABELS, ANIME_STATUS_COLORS } from '../../types/anime';

interface StatusSelectorProps {
  currentStatus: AnimeStatus;
  onStatusChange: (status: AnimeStatus) => void;
  disabled?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  showChip?: boolean;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  variant = 'outlined',
  size = 'small',
  showChip = false
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onStatusChange(event.target.value as AnimeStatus);
  };

  const statusOptions: AnimeStatus[] = [
    'watching',
    'completed',
    'on_hold',
    'dropped',
    'plan_to_watch'
  ];

  if (showChip) {
    return (
      <Box>
        <Chip
          label={ANIME_STATUS_LABELS[currentStatus]}
          size="small"
          sx={{
            backgroundColor: ANIME_STATUS_COLORS[currentStatus],
            color: 'white',
            fontWeight: 500
          }}
        />
      </Box>
    );
  }

  return (
    <FormControl variant={variant} size={size} disabled={disabled} fullWidth>
      <InputLabel id="status-select-label">Status</InputLabel>
      <Select
        labelId="status-select-label"
        id="status-select"
        value={currentStatus}
        label="Status"
        onChange={handleChange}
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }
        }}
      >
        {statusOptions.map((status) => (
          <MenuItem key={status} value={status}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: ANIME_STATUS_COLORS[status]
                }}
              />
              {ANIME_STATUS_LABELS[status]}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default StatusSelector;