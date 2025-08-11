const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { executeTransaction, callContract, getProvider } = require('../config/blockchain');
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

      // Normalize times against chain time to avoid 'Start time must be in the future' reverts
      const provider = typeof getProvider === 'function' ? getProvider() : null;
      const latestBlock = provider ? await provider.getBlock('latest') : null;
      const chainNow = latestBlock && latestBlock.timestamp ? Number(latestBlock.timestamp) : Math.floor(Date.now() / 1000);

      const MIN_LEAD_SECONDS = 60; // ensure at least 1 minute lead on chain clock
      let s = Number(startTime);
      let e = Number(endTime);
      if (Number.isNaN(s)) s = chainNow + MIN_LEAD_SECONDS;
      if (s <= chainNow + 30) s = chainNow + MIN_LEAD_SECONDS;
      if (Number.isNaN(e) || e <= s) e = s + 3600; // default 1h duration

      const tx = await executeTransaction('AdvancedVotingContract', 'createElection', [
        title,
        description,
        s,
        e,
        Number(electionType),
        positionIds.map((p) => Number(p)),
      ]);
      if (!tx.success) return res.status(400).json({ success: false, message: tx.error || 'Transaction failed' });
      res.json({ success: true, tx, normalized: { startTime: s, endTime: e, chainNow } });
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


