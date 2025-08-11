import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const VoterNav = () => {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('privateKey');
    navigate('/login');
  };

  return (
    <AppBar position="static" color="secondary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Voter Portal
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button color="inherit" component={RouterLink} to="/voter">Dashboard</Button>
          <Button color="inherit" component={RouterLink} to="/voter/elections">Elections</Button>
          <Button color="inherit" component={RouterLink} to="/voter/vote">Vote</Button>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default VoterNav;


