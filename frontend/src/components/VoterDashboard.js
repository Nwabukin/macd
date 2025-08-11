import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Button, TextField } from '@mui/material';
import VoterNav from './voter/VoterNav';
import api from '../api/client';

const VoterDashboard = () => {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [casting, setCasting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/system/health');
        setHealth(data.services?.blockchain || {});
      } catch (err) {
        setError('Failed to load status');
      }
    };
    load();
  }, []);

  const castDummyVote = async () => {
    setCasting(true);
    setError('');
    try {
      // Placeholder action: call API docs to ensure token is valid
      await api.get('/');
      alert('This is a placeholder. Voting flow will be implemented next.');
    } catch (e) {
      setError('Failed to cast vote');
    } finally {
      setCasting(false);
    }
  };

  return (
    <>
    <VoterNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Voter Dashboard
        </Typography>
        <Paper sx={{ p: 3, mt: 3 }}>
          {error && <Typography color="error">{error}</Typography>}
          <Typography variant="h6" gutterBottom>
            Blockchain Status
          </Typography>
          <Typography variant="body2">
            Connected: {health?.healthy ? 'Yes' : 'Unknown'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Private Key (to sign vote)"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
            />
            <Button sx={{ mt: 2 }} variant="contained" onClick={castDummyVote} disabled={casting}>
              {casting ? 'Casting...' : 'Cast Sample Vote'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default VoterDashboard;
