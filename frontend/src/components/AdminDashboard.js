import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Grid, Card, CardContent } from '@mui/material';
import AdminNav from './admin/AdminNav';
import api from '../api/client';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setData(data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
    <AdminNav />
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Paper sx={{ p: 3, mt: 3 }}>
          {loading && <Typography>Loading...</Typography>}
          {error && <Typography color="error">{error}</Typography>}
          {data && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Admins</Typography>
                    <Typography variant="h4">{data.admin_stats?.total_admins ?? 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Voters</Typography>
                    <Typography variant="h4">{data.voter_stats?.total_voters ?? 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Blockchain</Typography>
                    <Typography variant="body1">
                      Connected: {data.blockchain_stats?.connected ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2">
                      Total Elections: {data.blockchain_stats?.total_elections ?? 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminDashboard;
