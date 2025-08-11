import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const AdminNav = () => {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Admin Panel
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button color="inherit" component={RouterLink} to="/admin">Dashboard</Button>
          <Button color="inherit" component={RouterLink} to="/admin/voters">Voters</Button>
          <Button color="inherit" component={RouterLink} to="/admin/upload">Upload</Button>
          <Button color="inherit" component={RouterLink} to="/admin/elections">Elections</Button>
          <Button color="inherit" component={RouterLink} to="/admin/positions">Positions</Button>
          <Button color="inherit" component={RouterLink} to="/admin/candidates">Candidates</Button>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminNav;


