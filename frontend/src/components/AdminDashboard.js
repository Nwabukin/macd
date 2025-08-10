import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const AdminDashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to the RSU E-Voting Admin Panel
          </Typography>
          <Typography variant="body1">
            This dashboard will be implemented in later tasks to include:
          </Typography>
          <ul>
            <li>Election Management</li>
            <li>Candidate Management</li>
            <li>Voter Management</li>
            <li>Results Overview</li>
          </ul>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
