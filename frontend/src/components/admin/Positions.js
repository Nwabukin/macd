import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid } from '@mui/material';
import AdminNav from './AdminNav';
import api from '../../api/client';

const AdminPositions = () => {
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', maxCandidates: 5, maxVotesPerVoter: 1 });

  const load = async () => {
    try {
      const { data } = await api.get('/admin/positions');
      setPositions(data.data || []);
    } catch (e) { setError('Failed to load positions'); }
  };

  useEffect(()=>{ load(); },[]);

  const create = async () => {
    setCreating(true); setError('');
    try {
      await api.post('/admin/positions', {
        title: form.title,
        description: form.description,
        maxCandidates: Number(form.maxCandidates),
        maxVotesPerVoter: Number(form.maxVotesPerVoter),
      });
      await load();
    } catch (e) { setError(e?.response?.data?.message || 'Failed to create position'); } finally { setCreating(false); }
  };

  return (
    <>
    <AdminNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Positions</Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Create Position</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}><TextField label="Title" fullWidth value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Grid>
            <Grid item xs={12} md={5}><TextField label="Description" fullWidth value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></Grid>
            <Grid item xs={12} md={1}><TextField label="Max Cand" fullWidth value={form.maxCandidates} onChange={e=>setForm({...form,maxCandidates:e.target.value})} /></Grid>
            <Grid item xs={12} md={2}><TextField label="Max Votes" fullWidth value={form.maxVotesPerVoter} onChange={e=>setForm({...form,maxVotesPerVoter:e.target.value})} /></Grid>
          </Grid>
          <Button sx={{ mt: 2 }} variant="contained" onClick={create} disabled={creating}>{creating?'Creating...':'Create Position'}</Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Existing Positions</Typography>
          {positions.length === 0 ? (
            <Typography sx={{ mt: 1 }}>No positions yet.</Typography>
          ) : (
            positions.map(p => (
              <Box key={p.id} sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{p.title}</Typography>
                <Typography variant="body2">{p.description} | MaxCand: {p.maxCandidates} | MaxVotes: {p.maxVotesPerVoter}</Typography>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminPositions;


