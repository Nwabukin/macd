const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🗳️ Testing voting functionality...");
  
  // Load deployment info
  const deploymentFile = path.join(__dirname, "../deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please deploy the contract first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("📍 Using contract at:", deploymentInfo.contractAddress);
  
  // Get contract instance
  const [owner, voter1, voter2, voter3] = await hre.ethers.getSigners();
  const VotingContract = await hre.ethers.getContractFactory("VotingContract");
  const contract = VotingContract.attach(deploymentInfo.contractAddress);
  
  try {
    // Check if voters are authorized
    console.log("\n🔍 Checking voter authorization...");
    const voters = [
      { signer: voter1, name: "Voter 1" },
      { signer: voter2, name: "Voter 2" },
      { signer: voter3, name: "Voter 3" }
    ];
    
    for (const voter of voters) {
      const isAuthorized = await contract.isVoterAuthorized(voter.signer.address);
      const hasVoted = await contract.hasVoterVoted(voter.signer.address);
      console.log(`  ${voter.name} (${voter.signer.address}): Authorized=${isAuthorized}, HasVoted=${hasVoted}`);
    }
    
    // Get election info
    const electionInfo = await contract.getElectionInfo();
    const isActive = electionInfo[3];
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = Number(electionInfo[1]);
    const endTime = Number(electionInfo[2]);
    
    console.log("\n📊 Election Status:");
    console.log("  Current Time:", new Date().toLocaleString());
    console.log("  Start Time:", new Date(startTime * 1000).toLocaleString());
    console.log("  End Time:", new Date(endTime * 1000).toLocaleString());
    console.log("  Is Active:", isActive);
    console.log("  Can Vote Now:", currentTime >= startTime && currentTime <= endTime && isActive);
    
    // If we can vote, cast some test votes
    if (currentTime >= startTime && currentTime <= endTime && isActive) {
      console.log("\n🗳️ Casting test votes...");
      
      // Voter 1 votes for candidate 1
      try {
        console.log("  Voter 1 voting for candidate 1...");
        const vote1Tx = await contract.connect(voter1).vote(1);
        await vote1Tx.wait();
        console.log("  ✅ Voter 1 voted successfully");
      } catch (error) {
        console.log("  ❌ Voter 1 vote failed:", error.reason || error.message);
      }
      
      // Voter 2 votes for candidate 2
      try {
        console.log("  Voter 2 voting for candidate 2...");
        const vote2Tx = await contract.connect(voter2).vote(2);
        await vote2Tx.wait();
        console.log("  ✅ Voter 2 voted successfully");
      } catch (error) {
        console.log("  ❌ Voter 2 vote failed:", error.reason || error.message);
      }
      
      // Voter 3 votes for candidate 1
      try {
        console.log("  Voter 3 voting for candidate 1...");
        const vote3Tx = await contract.connect(voter3).vote(1);
        await vote3Tx.wait();
        console.log("  ✅ Voter 3 voted successfully");
      } catch (error) {
        console.log("  ❌ Voter 3 vote failed:", error.reason || error.message);
      }
      
    } else if (currentTime < startTime) {
      console.log("⏰ Election hasn't started yet. Waiting...");
      // You could add logic to wait for the election to start
    } else if (currentTime > endTime) {
      console.log("⏰ Election has ended.");
    } else {
      console.log("❌ Election is not active.");
    }
    
    // Show updated results
    console.log("\n🏆 Current Results:");
    const candidateData = await contract.getAllCandidates();
    for (let i = 0; i < candidateData[0].length; i++) {
      console.log(`  Candidate ${candidateData[0][i]}: ${candidateData[1][i]} (${candidateData[2][i]}) - ${candidateData[3][i]} votes`);
    }
    
    // Show final election info
    const finalElectionInfo = await contract.getElectionInfo();
    console.log("\n📈 Final Election Stats:");
    console.log("  Total Votes Cast:", finalElectionInfo[4].toString());
    console.log("  Total Candidates:", finalElectionInfo[5].toString());
    console.log("  Total Authorized Voters:", finalElectionInfo[6].toString());
    
    // Check who has voted
    console.log("\n✅ Voting Status:");
    for (const voter of voters) {
      const hasVoted = await contract.hasVoterVoted(voter.signer.address);
      console.log(`  ${voter.name}: ${hasVoted ? "Voted" : "Not voted"}`);
    }
    
  } catch (error) {
    console.error("❌ Vote testing failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Vote testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Vote testing failed:", error);
    process.exit(1);
  });
