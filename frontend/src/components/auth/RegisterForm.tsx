import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 50) {
      errors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 255) {
      errors.password = 'Password must be less than 255 characters';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear confirm password error if passwords now match
    if (field === 'password' && formData.confirmPassword && value === formData.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
    
    if (field === 'confirmPassword' && formData.password && value === formData.password) {
      setFormErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
    
    // Clear global error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData.name.trim(), formData.username, formData.password);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is handled by the auth context
      console.error('Registration failed:', err);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>
        Create Account
      </Typography>
      
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Join us to start tracking your anime journey
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange('name')}
        error={!!formErrors.name}
        helperText={formErrors.name}
        margin="normal"
        autoComplete="name"
        autoFocus
        disabled={isLoading}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleInputChange('username')}
        error={!!formErrors.username}
        helperText={formErrors.username}
        margin="normal"
        autoComplete="username"
        disabled={isLoading}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!formErrors.password}
        helperText={formErrors.password}
        margin="normal"
        autoComplete="new-password"
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={togglePasswordVisibility}
                edge="end"
                disabled={isLoading}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Confirm Password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
        margin="normal"
        autoComplete="new-password"
        disabled={isLoading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={toggleConfirmPasswordVisibility}
                edge="end"
                disabled={isLoading}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : <PersonAdd />}
        sx={{ mb: 3, py: 1.5 }}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <Box textAlign="center">
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            color="primary"
          >
            Sign in here
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default RegisterForm;