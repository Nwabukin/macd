import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const VoterDashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Voter Dashboard
        </Typography>
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to the RSU E-Voting System
          </Typography>
          <Typography variant="body1">
            This dashboard will be implemented in later tasks to include:
          </Typography>
          <ul>
            <li>Wallet Management</li>
            <li>Active Elections</li>
            <li>Voting Interface</li>
            <li>Vote Confirmation</li>
          </ul>
        </Paper>
      </Box>
    </Container>
  );
};

export default VoterDashboard;
