import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Component imports (will be created in later tasks)
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import VoterDashboard from './components/VoterDashboard';
import AdminVoters from './components/admin/Voters';
import AdminUploadVoters from './components/admin/UploadVoters';
import AdminElections from './components/admin/Elections';
import AdminPositions from './components/admin/Positions';
import AdminCandidates from './components/admin/Candidates';
import VoterElections from './components/voter/Elections';
import VoterVote from './components/voter/Vote';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/voters" element={<ProtectedRoute><AdminVoters /></ProtectedRoute>} />
            <Route path="/admin/upload" element={<ProtectedRoute><AdminUploadVoters /></ProtectedRoute>} />
            <Route path="/admin/elections" element={<ProtectedRoute><AdminElections /></ProtectedRoute>} />
            <Route path="/admin/positions" element={<ProtectedRoute><AdminPositions /></ProtectedRoute>} />
            <Route path="/admin/candidates" element={<ProtectedRoute><AdminCandidates /></ProtectedRoute>} />

            {/* Voter */}
            <Route path="/voter" element={<ProtectedRoute><VoterDashboard /></ProtectedRoute>} />
            <Route path="/voter/elections" element={<ProtectedRoute><VoterElections /></ProtectedRoute>} />
            <Route path="/voter/vote" element={<ProtectedRoute><VoterVote /></ProtectedRoute>} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
