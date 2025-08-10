const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AdvancedVotingContract", function () {
  let AdvancedVotingContract;
  let advancedVoting;
  let owner;
  let admin1;
  let admin2;
  let voter1;
  let voter2;
  let voter3;
  let unauthorized;
  
  // Test data
  const electionTitle = "RSU Student Union Election 2024";
  const electionDescription = "Annual student union elections for all positions";
  const positions = [
    { title: "President", description: "Student Union President", maxCandidates: 5, maxVotes: 1 },
    { title: "Vice President", description: "Student Union Vice President", maxCandidates: 3, maxVotes: 1 },
    { title: "Secretary", description: "Student Union Secretary", maxCandidates: 4, maxVotes: 1 }
  ];
  
  const candidates = [
    { name: "Alice Johnson", matric: "DE.2021/4001", bio: "Experienced leader" },
    { name: "Bob Smith", matric: "DE.2021/4002", bio: "Dedicated student" },
    { name: "Carol Davis", matric: "DE.2021/4003", bio: "Passionate advocate" },
    { name: "David Wilson", matric: "DE.2021/4004", bio: "Student representative" }
  ];

  beforeEach(async function () {
    // Get signers
    [owner, admin1, admin2, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();
    
    // Deploy contract
    AdvancedVotingContract = await ethers.getContractFactory("AdvancedVotingContract");
    advancedVoting = await AdvancedVotingContract.deploy();
    await advancedVoting.waitForDeployment();
    
    // Add authorized admins
    await advancedVoting.addAuthorizedAdmin(admin1.address);
    await advancedVoting.addAuthorizedAdmin(admin2.address);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await advancedVoting.owner()).to.equal(owner.address);
    });
    
    it("Should initialize with correct default values", async function () {
      expect(await advancedVoting.electionCount()).to.equal(0);
      expect(await advancedVoting.positionCount()).to.equal(0);
      expect(await advancedVoting.candidateCount()).to.equal(0);
      expect(await advancedVoting.voterCount()).to.equal(0);
      expect(await advancedVoting.contractPaused()).to.be.false;
    });
    
    it("Should authorize admins correctly", async function () {
      expect(await advancedVoting.authorizedAdmins(admin1.address)).to.be.true;
      expect(await advancedVoting.authorizedAdmins(admin2.address)).to.be.true;
      expect(await advancedVoting.authorizedAdmins(unauthorized.address)).to.be.false;
    });
  });

  describe("Position Management", function () {
    it("Should allow authorized admin to create positions", async function () {
      for (const position of positions) {
        await expect(
          advancedVoting.connect(admin1).createPosition(
            position.title,
            position.description,
            position.maxCandidates,
            position.maxVotes
          )
        ).to.emit(advancedVoting, "PositionCreated");
      }
      
      expect(await advancedVoting.positionCount()).to.equal(positions.length);
    });
    
    it("Should not allow unauthorized user to create positions", async function () {
      await expect(
        advancedVoting.connect(unauthorized).createPosition(
          positions[0].title,
          positions[0].description,
          positions[0].maxCandidates,
          positions[0].maxVotes
        )
      ).to.be.revertedWith("Only authorized admin can perform this action");
    });
    
    it("Should validate position parameters", async function () {
      // Empty title
      await expect(
        advancedVoting.connect(admin1).createPosition("", "Description", 5, 1)
      ).to.be.revertedWith("Position title cannot be empty");
      
      // Invalid max candidates
      await expect(
        advancedVoting.connect(admin1).createPosition("Title", "Description", 0, 1)
      ).to.be.revertedWith("Invalid max candidates");
      
      // Invalid max votes
      await expect(
        advancedVoting.connect(admin1).createPosition("Title", "Description", 5, 0)
      ).to.be.revertedWith("Max votes per voter must be greater than 0");
    });
    
    it("Should return correct position information", async function () {
      await advancedVoting.connect(admin1).createPosition(
        positions[0].title,
        positions[0].description,
        positions[0].maxCandidates,
        positions[0].maxVotes
      );
      
      const positionInfo = await advancedVoting.getPositionInfo(1);
      expect(positionInfo[0]).to.equal(positions[0].title);
      expect(positionInfo[1]).to.equal(positions[0].description);
      expect(positionInfo[2]).to.equal(positions[0].maxCandidates);
      expect(positionInfo[3]).to.equal(positions[0].maxVotes);
      expect(positionInfo[4]).to.be.true; // isActive
    });
  });

  describe("Election Management", function () {
    let positionIds;
    
    beforeEach(async function () {
      // Create positions first
      positionIds = [];
      for (const position of positions) {
        const tx = await advancedVoting.connect(admin1).createPosition(
          position.title,
          position.description,
          position.maxCandidates,
          position.maxVotes
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => 
          log.fragment && log.fragment.name === 'PositionCreated'
        );
        positionIds.push(event.args[0]);
      }
    });
    
    it("Should allow authorized admin to create elections", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      await expect(
        advancedVoting.connect(admin1).createElection(
          electionTitle,
          electionDescription,
          startTime,
          endTime,
          1, // General election
          positionIds
        )
      ).to.emit(advancedVoting, "ElectionCreated");
      
      expect(await advancedVoting.electionCount()).to.equal(1);
      expect(await advancedVoting.currentElectionId()).to.equal(1);
    });
    
    it("Should validate election parameters", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      // End time before start time
      await expect(
        advancedVoting.connect(admin1).createElection(
          electionTitle,
          electionDescription,
          endTime,
          startTime,
          1,
          positionIds
        )
      ).to.be.revertedWith("End time must be after start time");
      
      // Start time in past
      await expect(
        advancedVoting.connect(admin1).createElection(
          electionTitle,
          electionDescription,
          latestBlock.timestamp - 3600,
          endTime,
          1,
          positionIds
        )
      ).to.be.revertedWith("Start time must be in the future");
      
      // No positions
      await expect(
        advancedVoting.connect(admin1).createElection(
          electionTitle,
          electionDescription,
          startTime,
          endTime,
          1,
          []
        )
      ).to.be.revertedWith("At least one position required");
    });
    
    it("Should return correct election information", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      await advancedVoting.connect(admin1).createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime,
        1,
        positionIds
      );
      
      const electionInfo = await advancedVoting.getElectionInfo(1);
      expect(electionInfo[0]).to.equal(electionTitle);
      expect(electionInfo[1]).to.equal(electionDescription);
      expect(electionInfo[2]).to.equal(startTime);
      expect(electionInfo[3]).to.equal(endTime);
      expect(electionInfo[4]).to.equal(1); // electionType
      expect(electionInfo[5]).to.be.true; // isActive
    });
  });

  describe("Candidate Management", function () {
    let electionId;
    let positionIds;
    
    beforeEach(async function () {
      // Create positions
      positionIds = [];
      for (const position of positions) {
        const tx = await advancedVoting.connect(admin1).createPosition(
          position.title,
          position.description,
          position.maxCandidates,
          position.maxVotes
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => 
          log.fragment && log.fragment.name === 'PositionCreated'
        );
        positionIds.push(event.args[0]);
      }
      
      // Create election
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      const tx = await advancedVoting.connect(admin1).createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime,
        1,
        positionIds
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'ElectionCreated'
      );
      electionId = event.args[0];
    });
    
    it("Should allow authorized admin to add candidates", async function () {
      await expect(
        advancedVoting.connect(admin1).addCandidate(
          electionId,
          positionIds[0],
          candidates[0].name,
          candidates[0].matric,
          candidates[0].bio
        )
      ).to.emit(advancedVoting, "CandidateAdded");
      
      expect(await advancedVoting.candidateCount()).to.equal(1);
    });
    
    it("Should validate candidate parameters", async function () {
      // Empty name
      await expect(
        advancedVoting.connect(admin1).addCandidate(
          electionId,
          positionIds[0],
          "",
          candidates[0].matric,
          candidates[0].bio
        )
      ).to.be.revertedWith("Candidate name cannot be empty");
      
      // Empty matric number
      await expect(
        advancedVoting.connect(admin1).addCandidate(
          electionId,
          positionIds[0],
          candidates[0].name,
          "",
          candidates[0].bio
        )
      ).to.be.revertedWith("Matric number cannot be empty");
    });
    
    it("Should return correct candidate information", async function () {
      await advancedVoting.connect(admin1).addCandidate(
        electionId,
        positionIds[0],
        candidates[0].name,
        candidates[0].matric,
        candidates[0].bio
      );
      
      const candidateInfo = await advancedVoting.getCandidateInfo(1);
      expect(candidateInfo[0]).to.equal(candidates[0].name);
      expect(candidateInfo[1]).to.equal(candidates[0].matric);
      expect(candidateInfo[2]).to.equal(positionIds[0]);
      expect(candidateInfo[3]).to.equal(candidates[0].bio);
      expect(candidateInfo[5]).to.be.true; // isApproved
    });
  });

  describe("Voter Authorization", function () {
    it("Should allow authorized admin to authorize voters", async function () {
      await expect(
        advancedVoting.connect(admin1).authorizeVoter(
          voter1.address,
          "DE.2021/4001"
        )
      ).to.emit(advancedVoting, "VoterAuthorized");
      
      expect(await advancedVoting.isVoterAuthorized(voter1.address)).to.be.true;
      expect(await advancedVoting.voterCount()).to.equal(1);
    });
    
    it("Should not allow duplicate voter authorization", async function () {
      await advancedVoting.connect(admin1).authorizeVoter(voter1.address, "DE.2021/4001");
      
      await expect(
        advancedVoting.connect(admin1).authorizeVoter(voter1.address, "DE.2021/4002")
      ).to.be.revertedWith("Voter already authorized");
    });
    
    it("Should validate voter parameters", async function () {
      // Invalid address
      await expect(
        advancedVoting.connect(admin1).authorizeVoter(ethers.ZeroAddress, "DE.2021/4001")
      ).to.be.revertedWith("Invalid voter address");
      
      // Empty matric number
      await expect(
        advancedVoting.connect(admin1).authorizeVoter(voter1.address, "")
      ).to.be.revertedWith("Matric number cannot be empty");
    });
  });

  describe("Voting Process", function () {
    let electionId;
    let positionIds;
    let candidateIds;
    
    beforeEach(async function () {
      // Create positions
      positionIds = [];
      for (const position of positions) {
        const tx = await advancedVoting.connect(admin1).createPosition(
          position.title,
          position.description,
          position.maxCandidates,
          position.maxVotes
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => 
          log.fragment && log.fragment.name === 'PositionCreated'
        );
        positionIds.push(event.args[0]);
      }
      
      // Create election
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 60;
      const endTime = startTime + 86400;
      
      const tx = await advancedVoting.connect(admin1).createElection(
        electionTitle,
        electionDescription,
        startTime,
        endTime,
        1,
        positionIds
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'ElectionCreated'
      );
      electionId = event.args[0];
      
      // Add candidates
      candidateIds = [];
      for (let i = 0; i < candidates.length; i++) {
        const candidateTx = await advancedVoting.connect(admin1).addCandidate(
          electionId,
          positionIds[i % positionIds.length],
          candidates[i].name,
          candidates[i].matric,
          candidates[i].bio
        );
        const candidateReceipt = await candidateTx.wait();
        const candidateEvent = candidateReceipt.logs.find(log => 
          log.fragment && log.fragment.name === 'CandidateAdded'
        );
        candidateIds.push(candidateEvent.args[0]);
      }
      
      // Authorize voters
      await advancedVoting.connect(admin1).authorizeVoter(voter1.address, "DE.2021/4001");
      await advancedVoting.connect(admin1).authorizeVoter(voter2.address, "DE.2021/4002");
      await advancedVoting.connect(admin1).authorizeVoter(voter3.address, "DE.2021/4003");
      
      // Move time to election start
      await time.increaseTo(startTime);
    });
    
    it("Should allow authorized voters to vote", async function () {
      await expect(
        advancedVoting.connect(voter1).vote(electionId, positionIds[0], candidateIds[0])
      ).to.emit(advancedVoting, "VoteCast");
      
      expect(await advancedVoting.hasVoterVotedForPosition(voter1.address, positionIds[0])).to.be.true;
      expect(await advancedVoting.getVoterChoice(voter1.address, positionIds[0])).to.equal(candidateIds[0]);
    });
    
    it("Should not allow unauthorized voters to vote", async function () {
      await expect(
        advancedVoting.connect(unauthorized).vote(electionId, positionIds[0], candidateIds[0])
      ).to.be.revertedWith("You are not authorized to vote");
    });
    
    it("Should not allow double voting for same position", async function () {
      // Make sure we have a candidate for the first position
      await advancedVoting.connect(voter1).vote(electionId, positionIds[0], candidateIds[0]);
      
      await expect(
        advancedVoting.connect(voter1).vote(electionId, positionIds[0], candidateIds[0])
      ).to.be.revertedWith("Already voted for this position");
    });
    
    it("Should allow voting for different positions", async function () {
      await advancedVoting.connect(voter1).vote(electionId, positionIds[0], candidateIds[0]);
      await advancedVoting.connect(voter1).vote(electionId, positionIds[1], candidateIds[1]);
      
      expect(await advancedVoting.hasVoterVotedForPosition(voter1.address, positionIds[0])).to.be.true;
      expect(await advancedVoting.hasVoterVotedForPosition(voter1.address, positionIds[1])).to.be.true;
    });
  });

  describe("Admin Management", function () {
    it("Should allow owner to add authorized admins", async function () {
      const newAdmin = voter1.address;
      
      await expect(advancedVoting.addAuthorizedAdmin(newAdmin))
        .to.emit(advancedVoting, "AdminAuthorized")
        .withArgs(newAdmin);
      
      expect(await advancedVoting.authorizedAdmins(newAdmin)).to.be.true;
    });
    
    it("Should allow owner to remove authorized admins", async function () {
      await expect(advancedVoting.removeAuthorizedAdmin(admin1.address))
        .to.emit(advancedVoting, "AdminRevoked")
        .withArgs(admin1.address);
      
      expect(await advancedVoting.authorizedAdmins(admin1.address)).to.be.false;
    });
    
    it("Should not allow non-owner to manage admins", async function () {
      await expect(
        advancedVoting.connect(admin1).addAuthorizedAdmin(voter1.address)
      ).to.be.revertedWith("Only owner can perform this action");
      
      await expect(
        advancedVoting.connect(admin1).removeAuthorizedAdmin(admin2.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Security Features", function () {
    it("Should allow owner to pause/unpause contract", async function () {
      await expect(advancedVoting.togglePause())
        .to.emit(advancedVoting, "ContractPauseToggled")
        .withArgs(true);
      
      expect(await advancedVoting.contractPaused()).to.be.true;
      
      await expect(advancedVoting.togglePause())
        .to.emit(advancedVoting, "ContractPauseToggled")
        .withArgs(false);
      
      expect(await advancedVoting.contractPaused()).to.be.false;
    });
    
    it("Should prevent operations when paused", async function () {
      await advancedVoting.togglePause();
      
      // Test a different operation that should be paused
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 3600;
      const endTime = startTime + 86400;
      
      await expect(
        advancedVoting.connect(admin1).createElection(
          "Test Election",
          "Test Description", 
          startTime,
          endTime,
          1,
          [1]
        )
      ).to.be.revertedWith("Contract is paused");
    });
    
    it("Should allow ownership transfer", async function () {
      const newOwner = admin1.address;
      
      await expect(advancedVoting.transferOwnership(newOwner))
        .to.emit(advancedVoting, "OwnershipTransferred")
        .withArgs(owner.address, newOwner);
      
      expect(await advancedVoting.owner()).to.equal(newOwner);
    });
  });

  describe("Gas Usage", function () {
    it("Should use reasonable gas for position creation", async function () {
      const gasEstimate = await advancedVoting.connect(admin1).createPosition.estimateGas(
        "Test Position",
        "Test Description",
        5,
        1
      );
      
      expect(gasEstimate).to.be.lessThan(200000);
    });
    
    it("Should use reasonable gas for voting", async function () {
      // Setup minimal election
      const positionTx = await advancedVoting.connect(admin1).createPosition("Test", "Test", 5, 1);
      const positionReceipt = await positionTx.wait();
      const positionEvent = positionReceipt.logs.find(log => 
        log.fragment && log.fragment.name === 'PositionCreated'
      );
      const positionId = positionEvent.args[0];
      
      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp + 60;
      const endTime = startTime + 86400;
      
      const electionTx = await advancedVoting.connect(admin1).createElection(
        "Test Election",
        "Test Description",
        startTime,
        endTime,
        1,
        [positionId]
      );
      const electionReceipt = await electionTx.wait();
      const electionEvent = electionReceipt.logs.find(log => 
        log.fragment && log.fragment.name === 'ElectionCreated'
      );
      const electionId = electionEvent.args[0];
      
      const candidateTx = await advancedVoting.connect(admin1).addCandidate(
        electionId,
        positionId,
        "Test Candidate",
        "DE.2021/0001",
        "Test Bio"
      );
      const candidateReceipt = await candidateTx.wait();
      const candidateEvent = candidateReceipt.logs.find(log => 
        log.fragment && log.fragment.name === 'CandidateAdded'
      );
      const candidateId = candidateEvent.args[0];
      
      await advancedVoting.connect(admin1).authorizeVoter(voter1.address, "DE.2021/4001");
      await time.increaseTo(startTime);
      
      const gasEstimate = await advancedVoting.connect(voter1).vote.estimateGas(
        electionId,
        positionId,
        candidateId
      );
      
      expect(gasEstimate).to.be.lessThan(200000);
    });
  });
});
