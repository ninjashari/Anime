import React from 'react';
import { Box, Paper, Container } from '@mui/material';
import LoginForm from '../components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ 
        backgroundColor: 'grey.100',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={8}
          sx={{ 
            p: 4, 
            maxWidth: 450, 
            width: '100%',
            mx: 'auto',
            borderRadius: 2,
          }}
        >
          <LoginForm />
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;