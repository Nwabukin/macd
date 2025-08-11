const express = require('express');
const router = express.Router();
const { callContract } = require('../config/blockchain');

// Helper to toNumber for BigInt-like
const toNum = (v) => (typeof v === 'bigint' ? Number(v) : (typeof v === 'object' && v?._isBigNumber ? Number(v) : Number(v)));

// GET /api/elections/active - list active elections with basic details
router.get('/active', async (req, res) => {
  try {
    const countRes = await callContract('AdvancedVotingContract', 'electionCount');
    if (!countRes.success) return res.status(500).json({ success: false, message: 'Failed to read election count' });
    const count = toNum(countRes.data);
    const now = Math.floor(Date.now() / 1000);
    const elections = [];

    for (let id = 1; id <= count; id++) {
      const infoRes = await callContract('AdvancedVotingContract', 'getElectionInfo', [id]);
      if (!infoRes.success) continue;
      const [title, description, startTime, endTime, electionType, isActive, totalVotes, totalPositions] = infoRes.data;
      const start = toNum(startTime);
      const end = toNum(endTime);
      const active = isActive && now >= start && now <= end;
      if (active) {
        elections.push({
          id,
          title,
          description,
          startTime: start,
          endTime: end,
          electionType: toNum(electionType),
          totalVotes: toNum(totalVotes),
          totalPositions: toNum(totalPositions),
        });
      }
    }
    res.json({ success: true, data: elections });
  } catch (error) {
    console.error('List active elections error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/elections/:id - election details including positions and candidates
router.get('/:id', async (req, res) => {
  try {
    const electionId = parseInt(req.params.id);
    const infoRes = await callContract('AdvancedVotingContract', 'getElectionInfo', [electionId]);
    if (!infoRes.success) return res.status(404).json({ success: false, message: 'Election not found' });
    const [title, description, startTime, endTime, electionType, isActive, totalVotes, totalPositions] = infoRes.data;
    const start = toNum(startTime), end = toNum(endTime);

    // Positions
    const positionsRes = await callContract('AdvancedVotingContract', 'getElectionPositions', [electionId]);
    let positions = [];
    if (positionsRes.success) {
      const posIds = positionsRes.data.map(toNum);
      for (const pid of posIds) {
        const pInfoRes = await callContract('AdvancedVotingContract', 'getPositionInfo', [pid]);
        if (!pInfoRes.success) continue;
        const [pTitle, pDesc, maxCandidates, maxVotesPerVoter, pActive, candidateCount] = pInfoRes.data;
        // Candidates for position
        const cListRes = await callContract('AdvancedVotingContract', 'getPositionCandidates', [electionId, pid]);
        const candidates = [];
        if (cListRes.success) {
          for (const cidBN of cListRes.data) {
            const cid = toNum(cidBN);
            const cInfoRes = await callContract('AdvancedVotingContract', 'getCandidateInfo', [cid]);
            if (!cInfoRes.success) continue;
            const [name, matricNumber, positionId, bio, voteCount, isApproved] = cInfoRes.data;
            candidates.push({ id: cid, name, matricNumber, positionId: toNum(positionId), bio, voteCount: toNum(voteCount), isApproved });
          }
        }
        positions.push({
          id: pid,
          title: pTitle,
          description: pDesc,
          maxCandidates: toNum(maxCandidates),
          maxVotesPerVoter: toNum(maxVotesPerVoter),
          isActive: pActive,
          candidateCount: toNum(candidateCount),
          candidates,
        });
      }
    }
    res.json({
      success: true,
      data: {
        id: electionId,
        title,
        description,
        startTime: start,
        endTime: end,
        electionType: toNum(electionType),
        isActive,
        totalVotes: toNum(totalVotes),
        totalPositions: toNum(totalPositions),
        positions,
      },
    });
  } catch (error) {
    console.error('Get election details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;


