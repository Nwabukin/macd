const express = require('express');
const router = express.Router();
const { executeWithPrivateKey, callContract } = require('../config/blockchain');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Cast a vote using a private key (MVP approach)
router.post(
  '/',
  [
    body('electionId').isInt({ min: 1 }).withMessage('Valid electionId is required'),
    body('positionId').isInt({ min: 1 }).withMessage('Valid positionId is required'),
    body('candidateId').isInt({ min: 1 }).withMessage('Valid candidateId is required'),
    body('privateKey').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Valid privateKey is required'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { electionId, positionId, candidateId, privateKey } = req.body;

      // Validate election exists; rely on contract for time-window enforcement
      const infoRes = await callContract('AdvancedVotingContract', 'getElectionInfo', [Number(electionId)]);
      if (!infoRes.success) return res.status(400).json({ success: false, message: 'Invalid election' });

      const txRes = await executeWithPrivateKey(
        'AdvancedVotingContract',
        'vote',
        [Number(electionId), Number(positionId), Number(candidateId)],
        privateKey
      );

      if (!txRes.success) {
        return res.status(400).json({ success: false, message: txRes.error || 'Vote failed' });
      }

      return res.json({ success: true, tx: txRes });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;


