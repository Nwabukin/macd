const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { executeTransaction, callContract, getSigner, getProvider } = require('../config/blockchain');
const { ethers } = require('ethers');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

router.use(authenticate, requireAdmin);

// POST /api/admin/blockchain/authorize-address { address, matricNumber }
router.post(
  '/authorize-address',
  [
    body('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid address required'),
    body('matricNumber').optional().isString(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { address, matricNumber } = req.body;
      const label = matricNumber || 'AUTHORIZED';
      const tx = await executeTransaction('AdvancedVotingContract', 'authorizeVoter', [address, label]);
      if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'Tx failed' });
      res.json({ success: true, tx });
    } catch (error) {
      console.error('authorize-address error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// GET /api/admin/blockchain/now - returns chain timestamp (seconds)
router.get('/now', async (req, res) => {
  try {
    const provider = getProvider();
    const block = await provider.getBlock('latest');
    res.json({ success: true, chainNow: Number(block?.timestamp || Math.floor(Date.now()/1000)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/blockchain/bootstrap-election { title }
router.post('/bootstrap-election', async (req, res) => {
  try {
    const title = req.body?.title || 'Quick Test Election';
    // Create position
    let tx = await executeTransaction('AdvancedVotingContract', 'createPosition', [
      'President',
      'Test Position',
      5,
      1,
    ]);
    if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'createPosition failed' });

    // Assume position id 1 for simplicity
    const nowSec = Math.floor(Date.now() / 1000);
    const start = nowSec + 10;
    const end = start + 86400;
    tx = await executeTransaction('AdvancedVotingContract', 'createElection', [
      title,
      'Auto-created for testing',
      start,
      end,
      1,
      [1],
    ]);
    if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'createElection failed' });

    // Add candidate to position 1
    tx = await executeTransaction('AdvancedVotingContract', 'addCandidate', [
      1,
      1,
      'Candidate A',
      'DE.2021/9999',
      'Auto candidate',
    ]);
    if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'addCandidate failed' });

    // Return details
    const info = await callContract('AdvancedVotingContract', 'getElectionInfo', [1]);
    res.json({ success: true, electionId: 1, start, end, info: info.success ? info.data : null });
  } catch (error) {
    console.error('bootstrap-election error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;


// Admin time travel (Hardhat only): { seconds }
router.post('/time-increase', async (req, res) => {
  try {
    const seconds = Number(req.body?.seconds || 0);
    if (!seconds || seconds <= 0) return res.status(400).json({ success: false, message: 'seconds > 0 required' });
    const provider = getProvider();
    await provider.send('evm_increaseTime', [seconds]);
    await provider.send('evm_mine', []);
    res.json({ success: true, advanced: seconds });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/blockchain/faucet { address, amountEther }
router.post(
  '/faucet',
  [
    body('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid address required'),
    body('amountEther').optional().isString(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { address, amountEther } = req.body;
      const amount = amountEther ? ethers.parseEther(amountEther) : ethers.parseEther('1.0');
      const signer = getSigner();
      if (!signer) throw new Error('Signer not initialized');
      const tx = await signer.sendTransaction({ to: address, value: amount });
      const receipt = await tx.wait();
      res.json({ success: true, tx: { hash: receipt.transactionHash, blockNumber: receipt.blockNumber } });
    } catch (error) {
      console.error('faucet error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

