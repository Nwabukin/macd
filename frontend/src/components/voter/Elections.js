import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import VoterNav from './VoterNav';
import api from '../../api/client';

const VoterElections = () => {
  // Placeholder list - integration to be added next task
  const [elections, setElections] = useState([]);
  const [error, setError] = useState('');
  useEffect(()=>{
    (async()=>{
      try {
        const { data } = await api.get('/elections/active');
        setElections(data.data || []);
      } catch (e) {
        setError('Failed to load elections');
      }
    })();
  },[]);
  return (
    <>
    <VoterNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Active Elections</Typography>
        <Paper sx={{ p: 3 }}>
          {error && <Typography color="error">{error}</Typography>}
          {elections.length === 0 ? (
            <Typography>No active elections yet.</Typography>
          ) : (
            elections.map(e => (
              <Box key={e.id} sx={{ mb: 2 }}>
                <Typography variant="h6">{e.title}</Typography>
                <Button href={`/voter/vote?electionId=${e.id}`} variant="contained" sx={{ mt: 1 }}>Vote</Button>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default VoterElections;



