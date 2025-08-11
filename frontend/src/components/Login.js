import React, { useState } from 'react';
import api from '../api/client';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox
} from '@mui/material';

const Login = () => {
  const [role, setRole] = useState('voter'); // 'admin' | 'voter'
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // First-time voter setup dialog state
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupMatric, setSetupMatric] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [walletResult, setWalletResult] = useState(null); // { address, privateKey }
  const [savePk, setSavePk] = useState(false);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (role === 'admin') {
        const { data } = await api.post('/auth/admin/login', {
          email: credentials.username,
          password: credentials.password,
        });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('userType', 'admin');
        window.location.href = '/admin';
      } else {
        const { data } = await api.post('/auth/voter/login', {
          matricNumber: credentials.username,
          password: credentials.password,
        });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('userType', 'voter');
        window.location.href = '/voter';
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
    
  };

  const openSetup = () => {
    setSetupError('');
    setWalletResult(null);
    setSetupOpen(true);
  };

  const closeSetup = () => {
    setSetupOpen(false);
    setSetupMatric('');
    setSetupPassword('');
    setWalletResult(null);
    setSavePk(false);
  };

  const handleFirstTimeSetup = async () => {
    setSetupLoading(true);
    setSetupError('');
    try {
      const { data } = await api.post('/auth/voter/setup', {
        matricNumber: setupMatric,
        password: setupPassword,
      });
      if (data?.wallet) {
        setWalletResult(data.wallet);
        if (savePk) {
          try { localStorage.setItem('voter_private_key', data.wallet.privateKey); } catch (_) {}
        }
      }
    } catch (err) {
      setSetupError(err?.response?.data?.message || 'Setup failed');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            RSU E-Voting System
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" gutterBottom>
            Computer Science Department
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <ToggleButtonGroup
              value={role}
              exclusive
              onChange={(_, v) => v && setRole(v)}
              size="small"
            >
              <ToggleButton value="voter">Voter</ToggleButton>
              <ToggleButton value="admin">Admin</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={role === 'admin' ? 'Admin Email' : 'Matriculation Number'}
              name="username"
              autoComplete="username"
              autoFocus
              value={credentials.username}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={role === 'admin' ? 'Password' : 'Password (or set one via First-time Setup)'}
              type="password"
              id="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            {role === 'voter' && (
              <Box sx={{ textAlign: 'center' }}>
                <Button variant="text" onClick={openSetup}>First-time voter setup</Button>
                <Typography variant="caption" display="block" color="text.secondary">
                  First-time setup creates your wallet and shows your private key once.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* First-time setup dialog */}
      <Dialog open={setupOpen} onClose={closeSetup} maxWidth="sm" fullWidth>
        <DialogTitle>First-time Voter Setup</DialogTitle>
        <DialogContent>
          {setupError && <Alert severity="error" sx={{ mb: 2 }}>{setupError}</Alert>}
          {!walletResult ? (
            <>
              <TextField
                margin="normal"
                fullWidth
                label="Matriculation Number"
                value={setupMatric}
                onChange={(e)=>setSetupMatric(e.target.value)}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Set Password"
                type="password"
                value={setupPassword}
                onChange={(e)=>setSetupPassword(e.target.value)}
              />
              <FormControlLabel
                control={<Checkbox checked={savePk} onChange={(e)=>setSavePk(e.target.checked)} />}
                label="Save private key in this browser (not recommended)"
              />
              <Typography variant="caption" color="text.secondary">
                You will see your private key only once. Store it securely.
              </Typography>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>Wallet generated successfully.</Alert>
              <TextField
                margin="dense"
                fullWidth
                label="Wallet Address"
                value={walletResult.address}
                InputProps={{ readOnly: true }}
              />
              <TextField
                margin="dense"
                fullWidth
                label="Private Key (copy and store securely)"
                value={walletResult.privateKey}
                InputProps={{ readOnly: true }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button size="small" onClick={()=>navigator.clipboard.writeText(walletResult.privateKey)}>Copy Private Key</Button>
                <Button size="small" onClick={()=>navigator.clipboard.writeText(walletResult.address)}>Copy Address</Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSetup}>Close</Button>
          {!walletResult && (
            <Button variant="contained" onClick={handleFirstTimeSetup} disabled={setupLoading || !setupMatric || !setupPassword}>
              {setupLoading ? 'Setting up...' : 'Set up'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;
