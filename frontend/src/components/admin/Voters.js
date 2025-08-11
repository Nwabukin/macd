import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField } from '@mui/material';
import AdminNav from './AdminNav';
import api from '../../api/client';

const AdminVoters = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voters, setVoters] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const url = searchTerm ? `/admin/voters/search?q=${encodeURIComponent(searchTerm)}&page=${page}` : `/admin/voters?page=${page}`;
      const { data } = await api.get(url);
      setVoters(data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const authorize = async (id) => {
    try {
      await api.put(`/admin/voters/${id}/authorize`);
      await load();
    } catch (e) {
      setError('Failed to authorize voter');
    }
  };

  return (
    <>
    <AdminNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Voters</Typography>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" label="Search" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
            <Button variant="contained" onClick={()=>{ setPage(1); load(); }}>Search</Button>
            <Button variant="outlined" onClick={()=>{ setSearchTerm(''); setPage(1); load(); }}>Reset</Button>
            <Button href="/admin/upload" variant="text">Bulk Upload</Button>
          </Box>
          {loading && <Typography>Loading...</Typography>}
          {error && <Typography color="error">{error}</Typography>}
          {!loading && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Matric</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Authorized</TableCell>
                  <TableCell>Wallet</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {voters.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{v.matricNumber}</TableCell>
                    <TableCell>{v.firstName} {v.lastName}</TableCell>
                    <TableCell>{v.email}</TableCell>
                    <TableCell>{v.isAuthorized ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{v.blockchainAddress ? v.blockchainAddress.slice(0,6)+'...'+v.blockchainAddress.slice(-4) : '-'}</TableCell>
                    <TableCell>
                      {!v.isAuthorized && (
                        <Button size="small" variant="contained" onClick={()=>authorize(v.id)}>Authorize</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminVoters;



