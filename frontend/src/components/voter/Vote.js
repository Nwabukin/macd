import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button } from '@mui/material';
import VoterNav from './VoterNav';
import api from '../../api/client';

const VoterVote = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [election, setElection] = useState(null);
  const [positionId, setPositionId] = useState('');
  const [candidateId, setCandidateId] = useState('');

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const electionId = params.get('electionId');
    if (!electionId) return;
    (async()=>{
      try{
        const { data } = await api.get(`/elections/${electionId}`);
        setElection(data.data);
      }catch(e){ setError('Failed to load election'); }
    })();
  },[]);

  const cast = async () => {
    setStatus(''); setError('');
    try {
      if (!privateKey || !positionId || !candidateId || !election?.id) {
        setError('Private key, position and candidate are required');
        return;
      }
      setStatus('Submitting vote...');
      const { data } = await api.post('/vote', {
        electionId: Number(new URLSearchParams(window.location.search).get('electionId')),
        positionId: Number(positionId),
        candidateId: Number(candidateId),
        privateKey,
      });
      setStatus(`Vote submitted. Tx: ${data.tx.transactionHash}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit vote');
    }
  };

  return (
    <>
    <VoterNav />
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Cast Vote</Typography>
        <Paper sx={{ p: 3 }}>
          {error && <Typography color="error">{error}</Typography>}
          {status && <Typography color="primary">{status}</Typography>}
          {election && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{election.title}</Typography>
              <Typography variant="body2">Select Position and Candidate</Typography>
              <TextField
                fullWidth
                sx={{ mt: 2 }}
                label="Position ID"
                placeholder="e.g. 1"
                value={positionId}
                onChange={(e)=>setPositionId(e.target.value)}
              />
              <TextField
                fullWidth
                sx={{ mt: 2 }}
                label="Candidate ID"
                placeholder="e.g. 1"
                value={candidateId}
                onChange={(e)=>setCandidateId(e.target.value)}
              />
            </Box>
          )}
          <TextField
            fullWidth
            label="Private Key"
            placeholder="0x..."
            value={privateKey}
            onChange={(e)=>setPrivateKey(e.target.value)}
          />
          <Button sx={{ mt: 2 }} variant="contained" onClick={cast}>Submit Vote</Button>
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default VoterVote;



