const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🗳️ Setting up sample election for testing...");
  
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
    // Start an election
    const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
    const endTime = startTime + (24 * 60 * 60); // End in 24 hours
    
    console.log("\n📅 Starting election...");
    const startTx = await contract.startElection(
      "RSU Computer Science Student Union Election 2024",
      startTime,
      endTime
    );
    await startTx.wait();
    console.log("✅ Election started successfully");
    
    // Add candidates
    console.log("\n👥 Adding candidates...");
    const candidates = [
      { name: "John Doe", position: "President" },
      { name: "Jane Smith", position: "President" },
      { name: "Mike Johnson", position: "Vice President" },
      { name: "Sarah Wilson", position: "Vice President" },
      { name: "David Brown", position: "Secretary" },
      { name: "Lisa Davis", position: "Secretary" }
    ];
    
    for (const candidate of candidates) {
      const addTx = await contract.addCandidate(candidate.name, candidate.position);
      await addTx.wait();
      console.log(`  ✅ Added ${candidate.name} for ${candidate.position}`);
    }
    
    // Authorize voters
    console.log("\n🔐 Authorizing voters...");
    const voters = [voter1.address, voter2.address, voter3.address];
    
    for (const voterAddress of voters) {
      const authTx = await contract.authorizeVoter(voterAddress);
      await authTx.wait();
      console.log(`  ✅ Authorized voter: ${voterAddress}`);
    }
    
    // Get election info
    const electionInfo = await contract.getElectionInfo();
    console.log("\n📊 Election Information:");
    console.log("  Title:", electionInfo[0]);
    console.log("  Start Time:", new Date(Number(electionInfo[1]) * 1000).toLocaleString());
    console.log("  End Time:", new Date(Number(electionInfo[2]) * 1000).toLocaleString());
    console.log("  Is Active:", electionInfo[3]);
    console.log("  Total Votes:", electionInfo[4].toString());
    console.log("  Total Candidates:", electionInfo[5].toString());
    console.log("  Total Voters:", electionInfo[6].toString());
    
    // Get all candidates
    console.log("\n🏆 Candidates:");
    const candidateData = await contract.getAllCandidates();
    for (let i = 0; i < candidateData[0].length; i++) {
      console.log(`  ${candidateData[0][i]}: ${candidateData[1][i]} (${candidateData[2][i]}) - ${candidateData[3][i]} votes`);
    }
    
    // Save setup info
    const setupInfo = {
      network: hre.network.name,
      contractAddress: deploymentInfo.contractAddress,
      electionTitle: "RSU Computer Science Student Union Election 2024",
      startTime: startTime,
      endTime: endTime,
      candidates: candidates,
      authorizedVoters: voters,
      setupTimestamp: new Date().toISOString()
    };
    
    const setupFile = path.join(__dirname, "../deployments", `${hre.network.name}-setup.json`);
    fs.writeFileSync(setupFile, JSON.stringify(setupInfo, null, 2));
    console.log("\n💾 Setup info saved to:", setupFile);
    
    console.log("\n🎯 Test voting commands:");
    console.log(`  npx hardhat run scripts/test-vote.js --network ${hre.network.name}`);
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Election setup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Setup failed:", error);
    process.exit(1);
  });
