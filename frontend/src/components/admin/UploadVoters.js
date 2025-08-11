import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import AdminNav from './AdminNav';
import api from '../../api/client';

const AdminUploadVoters = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const onFile = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('csvFile', file);
      const { data } = await api.post('/admin/voters/bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <AdminNav />
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Bulk Upload Voters (CSV)</Typography>
        <Paper sx={{ p: 3 }}>
          <input type="file" accept=".csv" onChange={onFile} />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={upload} disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button sx={{ ml: 2 }} href="/admin/voters">Back to Voters</Button>
          </Box>
          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
          {result && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Summary</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.summary, null, 2)}</pre>
              {result.errors?.length > 0 && (
                <>
                  <Typography variant="subtitle1">Errors</Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.errors.slice(0,10), null, 2)}</pre>
                </>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default AdminUploadVoters;



