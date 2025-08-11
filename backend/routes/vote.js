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

      // Optional: check election is active
      const infoRes = await callContract('AdvancedVotingContract', 'getElectionInfo', [Number(electionId)]);
      if (!infoRes.success) return res.status(400).json({ success: false, message: 'Invalid election' });
      const [_, __, startTime, endTime, ___, isActive] = infoRes.data;
      const now = Math.floor(Date.now() / 1000);
      const start = Number(startTime), end = Number(endTime);
      if (!isActive || now < start || now > end) {
        return res.status(400).json({ success: false, message: 'Election is not active' });
      }

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


