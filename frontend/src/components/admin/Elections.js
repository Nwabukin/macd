import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid } from '@mui/material';
import AdminNav from './AdminNav';
import api from '../../api/client';

const AdminElections = () => {
  const [elections, setElections] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '', positions: '1', type: 1 });

  const load = async () => {
    try {
      const { data } = await api.get('/admin/elections');
      setElections(data.data || []);
    } catch (e) { setError('Failed to load elections'); }
  };

  useEffect(()=>{ 
    load();
    // Prefill start/end with chain time + sensible defaults
    (async()=>{
      try{
        const { data } = await api.get('/admin/blockchain/now');
        const nowSec = Number(data.chainNow || Math.floor(Date.now()/1000));
        const start = new Date((nowSec + 120) * 1000); // +2 minutes
        const end = new Date((nowSec + 120 + 3600) * 1000); // +1h
        const pad = (n)=> String(n).padStart(2,'0');
        const toLocalInput=(d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setForm((f)=>({ ...f, start: toLocalInput(start), end: toLocalInput(end) }));
      }catch(_){/* ignore */}
    })();
  },[]);

  const createElection = async () => {
    setCreating(true); setError('');
    try {
      const startTime = Math.floor(new Date(form.start).getTime()/1000);
      const endTime = Math.floor(new Date(form.end).getTime()/1000);
      const positionIds = form.positions.split(',').map(s=>parseInt(s.trim(),10)).filter(Boolean);
      await api.post('/admin/elections', {
        title: form.title,
        description: form.description,
        startTime,
        endTime,
        electionType: Number(form.type),
        positionIds,
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create election');
    } finally { setCreating(false); }
  };

  return (
    <>
    <AdminNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Elections</Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Create Election</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><TextField label="Title" fullWidth value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Description" fullWidth value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></Grid>
            <Grid item xs={12} md={4}><TextField label="Start" type="datetime-local" fullWidth value={form.start} onChange={e=>setForm({...form,start:e.target.value})} /></Grid>
            <Grid item xs={12} md={4}><TextField label="End" type="datetime-local" fullWidth value={form.end} onChange={e=>setForm({...form,end:e.target.value})} /></Grid>
            <Grid item xs={12} md={2}><TextField label="Type (1-3)" fullWidth value={form.type} onChange={e=>setForm({...form,type:e.target.value})} /></Grid>
            <Grid item xs={12} md={2}><TextField label="Position IDs (comma)" fullWidth value={form.positions} onChange={e=>setForm({...form,positions:e.target.value})} /></Grid>
          </Grid>
          <Button sx={{ mt: 2 }} variant="contained" onClick={createElection} disabled={creating}>
            {creating ? 'Creating...' : 'Create Election'}
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Existing Elections</Typography>
          {elections.length === 0 ? (
            <Typography sx={{ mt: 1 }}>No elections yet.</Typography>
          ) : (
            elections.map(e => (
              <Box key={e.id} sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{e.title}</Typography>
                <Typography variant="body2">{new Date(e.startTime*1000).toLocaleString()} - {new Date(e.endTime*1000).toLocaleString()}</Typography>
                <Typography variant="body2">Positions: {e.totalPositions} | Votes: {e.totalVotes} | Active: {e.isActive ? 'Yes' : 'No'}</Typography>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminElections;


