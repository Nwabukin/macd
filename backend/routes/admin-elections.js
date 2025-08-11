const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { executeTransaction, callContract } = require('../config/blockchain');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

router.use(authenticate, requireAdmin);

// list all positions
router.get('/positions', async (req, res) => {
  try {
    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : (typeof v === 'object' && v?._isBigNumber ? Number(v) : Number(v)));
    const countRes = await callContract('AdvancedVotingContract', 'positionCount');
    if (!countRes.success) return res.status(500).json({ success: false, message: 'Failed to read position count' });
    const count = toNum(countRes.data);
    const list = [];
    for (let id = 1; id <= count; id++) {
      const infoRes = await callContract('AdvancedVotingContract', 'getPositionInfo', [id]);
      if (!infoRes.success) continue;
      const [title, description, maxCandidates, maxVotesPerVoter, isActive, candidateCount] = infoRes.data;
      list.push({
        id,
        title,
        description,
        maxCandidates: toNum(maxCandidates),
        maxVotesPerVoter: toNum(maxVotesPerVoter),
        isActive,
        candidateCount: toNum(candidateCount),
      });
    }
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('List positions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/elections - list all elections with basic info
router.get('/elections', async (req, res) => {
  try {
    const countRes = await callContract('AdvancedVotingContract', 'electionCount');
    if (!countRes.success) return res.status(500).json({ success: false, message: 'Failed to read election count' });
    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : (typeof v === 'object' && v?._isBigNumber ? Number(v) : Number(v)));
    const count = toNum(countRes.data);
    const elections = [];
    for (let id = 1; id <= count; id++) {
      const infoRes = await callContract('AdvancedVotingContract', 'getElectionInfo', [id]);
      if (!infoRes.success) continue;
      const [title, description, startTime, endTime, electionType, isActive, totalVotes, totalPositions] = infoRes.data;
      elections.push({
        id,
        title,
        description,
        startTime: toNum(startTime),
        endTime: toNum(endTime),
        electionType: toNum(electionType),
        isActive,
        totalVotes: toNum(totalVotes),
        totalPositions: toNum(totalPositions),
      });
    }
    res.json({ success: true, data: elections });
  } catch (error) {
    console.error('List elections error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/positions - create a new position
router.post(
  '/positions',
  [
    body('title').isString().isLength({ min: 2 }),
    body('description').isString().isLength({ min: 2 }),
    body('maxCandidates').isInt({ min: 1, max: 50 }),
    body('maxVotesPerVoter').isInt({ min: 1, max: 10 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { title, description, maxCandidates, maxVotesPerVoter } = req.body;
      const tx = await executeTransaction('AdvancedVotingContract', 'createPosition', [
        title,
        description,
        Number(maxCandidates),
        Number(maxVotesPerVoter),
      ]);
      if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'Transaction failed' });
      res.json({ success: true, tx });
    } catch (error) {
      console.error('Create position error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// POST /api/admin/elections - create a new election with selected positions
router.post(
  '/elections',
  [
    body('title').isString().isLength({ min: 3 }),
    body('description').isString().isLength({ min: 3 }),
    body('startTime').isInt({ min: 1 }),
    body('endTime').isInt({ min: 1 }),
    body('electionType').isInt({ min: 1, max: 3 }),
    body('positionIds').isArray({ min: 1 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { title, description, startTime, endTime, electionType, positionIds } = req.body;
      const tx = await executeTransaction('AdvancedVotingContract', 'createElection', [
        title,
        description,
        Number(startTime),
        Number(endTime),
        Number(electionType),
        positionIds.map((p) => Number(p)),
      ]);
      if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'Transaction failed' });
      res.json({ success: true, tx });
    } catch (error) {
      console.error('Create election error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// POST /api/admin/candidates - add candidate to election position
router.post(
  '/candidates',
  [
    body('electionId').isInt({ min: 1 }),
    body('positionId').isInt({ min: 1 }),
    body('name').isString().isLength({ min: 2 }),
    body('matricNumber').isString().isLength({ min: 5 }),
    body('bio').isString().isLength({ min: 3 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { electionId, positionId, name, matricNumber, bio } = req.body;
      const tx = await executeTransaction('AdvancedVotingContract', 'addCandidate', [
        Number(electionId),
        Number(positionId),
        name,
        matricNumber,
        bio,
      ]);
      if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'Transaction failed' });
      res.json({ success: true, tx });
    } catch (error) {
      console.error('Add candidate error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;


