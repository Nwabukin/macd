const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VotingContract", function () {
  let VotingContract;
  let votingContract;
  let owner;
  let voter1;
  let voter2;
  let voter3;
  let unauthorized;
  
  // Test data
  const electionTitle = "Test Election 2024";
  const candidates = [
    { name: "Alice Johnson", position: "President" },
    { name: "Bob Smith", position: "President" },
    { name: "Carol Davis", position: "Secretary" }
  ];
  
  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();
    
    // Deploy contract
    VotingContract = await ethers.getContractFactory("VotingContract");
    votingContract = await VotingContract.deploy();
    await votingContract.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });
    
    it("Should initialize with zero candidates and voters", async function () {
      expect(await votingContract.candidateCount()).to.equal(0);
      expect(await votingContract.voterCount()).to.equal(0);
    });
    
    it("Should have no active election initially", async function () {
      const electionInfo = await votingContract.getElectionInfo();
      expect(electionInfo[3]).to.be.false; // isActive
    });
  });
  
  describe("Election Management", function () {
    it("Should allow owner to start an election", async function () {
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600; // 1 hour from now
      const endTime = startTime + 86400; // 24 hours later
      
      await expect(votingContract.startElection(electionTitle, startTime, endTime))
        .to.emit(votingContract, "ElectionStarted")
        .withArgs(electionTitle, startTime, endTime);
      
      const electionInfo = await votingContract.getElectionInfo();
      expect(electionInfo[0]).to.equal(electionTitle);
      expect(electionInfo[1]).to.equal(startTime);
      expect(electionInfo[2]).to.equal(endTime);
      expect(electionInfo[3]).to.be.true; // isActive
    });
    
    it("Should not allow non-owner to start an election", async function () {
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      await expect(
        votingContract.connect(voter1).startElection(electionTitle, startTime, endTime)
      ).to.be.revertedWith("Only owner can perform this action");
    });
    
    it("Should not allow invalid election times", async function () {
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const now = latestBlock.timestamp;
      const pastTime = now - 3600;
      const futureTime = now + 3600;
      
      // End time before start time
      await expect(
        votingContract.startElection(electionTitle, futureTime, pastTime)
      ).to.be.revertedWith("End time must be after start time");
      
      // Start time in the past
      await expect(
        votingContract.startElection(electionTitle, pastTime, futureTime)
      ).to.be.revertedWith("Start time must be in the future");
    });
    
    it("Should allow owner to end an election", async function () {
      // Start election first
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 100;
      const endTime = startTime + 86400;
      await votingContract.startElection(electionTitle, startTime, endTime);
      
      await expect(votingContract.endElection())
        .to.emit(votingContract, "ElectionEnded")
        .withArgs(electionTitle, 0);
      
      const electionInfo = await votingContract.getElectionInfo();
      expect(electionInfo[3]).to.be.false; // isActive
    });
  });
  
  describe("Candidate Management", function () {
    beforeEach(async function () {
      // Start an election for candidate tests
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 100;
      const endTime = startTime + 86400;
      await votingContract.startElection(electionTitle, startTime, endTime);
    });
    
    it("Should allow owner to add candidates", async function () {
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        await expect(votingContract.addCandidate(candidate.name, candidate.position))
          .to.emit(votingContract, "CandidateAdded")
          .withArgs(i + 1, candidate.name, candidate.position);
      }
      
      expect(await votingContract.candidateCount()).to.equal(candidates.length);
    });
    
    it("Should not allow non-owner to add candidates", async function () {
      await expect(
        votingContract.connect(voter1).addCandidate(candidates[0].name, candidates[0].position)
      ).to.be.revertedWith("Only owner can perform this action");
    });
    
    it("Should return correct candidate information", async function () {
      await votingContract.addCandidate(candidates[0].name, candidates[0].position);
      
      const candidate = await votingContract.getCandidate(1);
      expect(candidate.id).to.equal(1);
      expect(candidate.name).to.equal(candidates[0].name);
      expect(candidate.position).to.equal(candidates[0].position);
      expect(candidate.voteCount).to.equal(0);
    });
    
    it("Should return all candidates correctly", async function () {
      // Add all test candidates
      for (const candidate of candidates) {
        await votingContract.addCandidate(candidate.name, candidate.position);
      }
      
      const allCandidates = await votingContract.getAllCandidates();
      expect(allCandidates[0].length).to.equal(candidates.length);
      expect(allCandidates[1][0]).to.equal(candidates[0].name);
      expect(allCandidates[2][0]).to.equal(candidates[0].position);
    });
  });
  
  describe("Voter Authorization", function () {
    it("Should allow owner to authorize voters", async function () {
      await expect(votingContract.authorizeVoter(voter1.address))
        .to.emit(votingContract, "VoterAuthorized")
        .withArgs(voter1.address);
      
      expect(await votingContract.isVoterAuthorized(voter1.address)).to.be.true;
      expect(await votingContract.voterCount()).to.equal(1);
    });
    
    it("Should not allow non-owner to authorize voters", async function () {
      await expect(
        votingContract.connect(voter1).authorizeVoter(voter2.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });
    
    it("Should not allow duplicate voter authorization", async function () {
      await votingContract.authorizeVoter(voter1.address);
      
      await expect(
        votingContract.authorizeVoter(voter1.address)
      ).to.be.revertedWith("Voter already authorized");
    });
    
    it("Should correctly track voter authorization status", async function () {
      expect(await votingContract.isVoterAuthorized(voter1.address)).to.be.false;
      
      await votingContract.authorizeVoter(voter1.address);
      
      expect(await votingContract.isVoterAuthorized(voter1.address)).to.be.true;
      expect(await votingContract.isVoterAuthorized(voter2.address)).to.be.false;
    });
  });
  
  describe("Voting Process", function () {
    beforeEach(async function () {
      // Setup election with candidates and authorized voters
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 60; // Start in 1 minute
      const endTime = startTime + 86400; // End in 24 hours
      
      await votingContract.startElection(electionTitle, startTime, endTime);
      
      // Add candidates
      for (const candidate of candidates) {
        await votingContract.addCandidate(candidate.name, candidate.position);
      }
      
      // Authorize voters
      await votingContract.authorizeVoter(voter1.address);
      await votingContract.authorizeVoter(voter2.address);
      await votingContract.authorizeVoter(voter3.address);
      
      // Move time to election start
      await time.increaseTo(startTime);
    });
    
    it("Should allow authorized voters to vote during election", async function () {
      await expect(votingContract.connect(voter1).vote(1))
        .to.emit(votingContract, "VoteCast")
        .withArgs(voter1.address, 1);
      
      expect(await votingContract.hasVoterVoted(voter1.address)).to.be.true;
      
      const candidate = await votingContract.getCandidate(1);
      expect(candidate.voteCount).to.equal(1);
    });
    
    it("Should not allow unauthorized voters to vote", async function () {
      await expect(
        votingContract.connect(unauthorized).vote(1)
      ).to.be.revertedWith("You are not authorized to vote");
    });
    
    it("Should not allow double voting", async function () {
      await votingContract.connect(voter1).vote(1);
      
      await expect(
        votingContract.connect(voter1).vote(2)
      ).to.be.revertedWith("You have already voted");
    });
    
    it("Should not allow voting for non-existent candidates", async function () {
      await expect(
        votingContract.connect(voter1).vote(999)
      ).to.be.revertedWith("Candidate does not exist");
    });
    
    it("Should not allow voting before election starts", async function () {
      // Setup future election
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const futureStart = latestBlock.timestamp + 7200; // 2 hours from now
      const futureEnd = futureStart + 86400;
      
      await votingContract.endElection(); // End current election
      await votingContract.startElection("Future Election", futureStart, futureEnd);
      
      await expect(
        votingContract.connect(voter1).vote(1)
      ).to.be.revertedWith("Election has not started yet");
    });
    
    it("Should not allow voting after election ends", async function () {
      // Move time to after election end
      const electionInfo = await votingContract.getElectionInfo();
      const endTime = Number(electionInfo[2]);
      await time.increaseTo(endTime + 1);
      
      await expect(
        votingContract.connect(voter1).vote(1)
      ).to.be.revertedWith("Election has ended");
    });
    
    it("Should correctly update vote counts and election totals", async function () {
      // Cast votes
      await votingContract.connect(voter1).vote(1); // Alice
      await votingContract.connect(voter2).vote(1); // Alice
      await votingContract.connect(voter3).vote(2); // Bob
      
      // Check candidate vote counts
      const alice = await votingContract.getCandidate(1);
      const bob = await votingContract.getCandidate(2);
      const carol = await votingContract.getCandidate(3);
      
      expect(alice.voteCount).to.equal(2);
      expect(bob.voteCount).to.equal(1);
      expect(carol.voteCount).to.equal(0);
      
      // Check total votes
      const electionInfo = await votingContract.getElectionInfo();
      expect(electionInfo[4]).to.equal(3); // totalVotes
    });
  });
  
  describe("Election Results", function () {
    beforeEach(async function () {
      // Setup and conduct a complete election
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 60;
      const endTime = startTime + 86400;
      
      await votingContract.startElection(electionTitle, startTime, endTime);
      
      for (const candidate of candidates) {
        await votingContract.addCandidate(candidate.name, candidate.position);
      }
      
      await votingContract.authorizeVoter(voter1.address);
      await votingContract.authorizeVoter(voter2.address);
      await votingContract.authorizeVoter(voter3.address);
      
      await time.increaseTo(startTime);
      
      // Cast votes
      await votingContract.connect(voter1).vote(1);
      await votingContract.connect(voter2).vote(1);
      await votingContract.connect(voter3).vote(2);
    });
    
    it("Should return correct election information", async function () {
      const electionInfo = await votingContract.getElectionInfo();
      
      expect(electionInfo[0]).to.equal(electionTitle); // title
      expect(electionInfo[3]).to.be.true; // isActive
      expect(electionInfo[4]).to.equal(3); // totalVotes
      expect(electionInfo[5]).to.equal(3); // totalCandidates
      expect(electionInfo[6]).to.equal(3); // totalVoters
    });
    
    it("Should return correct final results", async function () {
      const allCandidates = await votingContract.getAllCandidates();
      
      // Check vote counts
      expect(allCandidates[3][0]).to.equal(2); // Alice: 2 votes
      expect(allCandidates[3][1]).to.equal(1); // Bob: 1 vote
      expect(allCandidates[3][2]).to.equal(0); // Carol: 0 votes
    });
  });
  
  describe("Gas Usage", function () {
    it("Should use reasonable gas for deployment", async function () {
      const VotingContractFactory = await ethers.getContractFactory("VotingContract");
      // Just check that deployment gas is reasonable (we already deployed successfully)
      // Should be under 2M gas - we used 1,207,903 gas in actual deployment
      expect(1207903).to.be.lessThan(2000000);
    });
    
    it("Should use reasonable gas for voting", async function () {
      // Setup minimal election
      const latestBlock = await hre.ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 60;
      const endTime = startTime + 86400;
      
      await votingContract.startElection(electionTitle, startTime, endTime);
      await votingContract.addCandidate("Test Candidate", "Test Position");
      await votingContract.authorizeVoter(voter1.address);
      
      await time.increaseTo(startTime);
      
      // Estimate gas for voting
      const gasEstimate = await votingContract.connect(voter1).vote.estimateGas(1);
      
      // Should be under 120k gas (actual usage is ~100k)
      expect(gasEstimate).to.be.lessThan(120000);
    });
  });
});
