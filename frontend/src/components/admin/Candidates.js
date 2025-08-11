import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid } from '@mui/material';
import AdminNav from './AdminNav';
import api from '../../api/client';

const AdminCandidates = () => {
  const [error, setError] = useState('');
  const [form, setForm] = useState({ electionId: '', positionId: '', name: '', matricNumber: '', bio: '' });

  const add = async () => {
    setError('');
    try {
      await api.post('/admin/candidates', {
        electionId: Number(form.electionId),
        positionId: Number(form.positionId),
        name: form.name,
        matricNumber: form.matricNumber,
        bio: form.bio,
      });
      setForm({ electionId: '', positionId: '', name: '', matricNumber: '', bio: '' });
      alert('Candidate added');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add candidate');
    }
  };

  return (
    <>
    <AdminNav />
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Candidates</Typography>
        <Paper sx={{ p: 3 }}>
          {error && <Typography color="error">{error}</Typography>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField label="Election ID" fullWidth value={form.electionId} onChange={e=>setForm({...form,electionId:e.target.value})} /></Grid>
            <Grid item xs={12} md={3}><TextField label="Position ID" fullWidth value={form.positionId} onChange={e=>setForm({...form,positionId:e.target.value})} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Name" fullWidth value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Matric Number" fullWidth value={form.matricNumber} onChange={e=>setForm({...form,matricNumber:e.target.value})} /></Grid>
            <Grid item xs={12}><TextField label="Bio" fullWidth multiline minRows={3} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} /></Grid>
          </Grid>
          <Button sx={{ mt: 2 }} variant="contained" onClick={add}>Add Candidate</Button>
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminCandidates;


