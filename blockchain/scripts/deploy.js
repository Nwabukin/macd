const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of RSU E-Voting Contract...");
  console.log("🌐 Network:", hre.network.name);
  
  // Get the ContractFactory and Signers
  const [deployer, ...accounts] = await hre.ethers.getSigners();
  
  console.log("📝 Deploying contracts with the account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy the VotingContract
  console.log("\n📦 Deploying VotingContract...");
  const VotingContract = await hre.ethers.getContractFactory("VotingContract");
  
  // Deploy with gas estimation
  try {
    const deployTx = VotingContract.getDeployTransaction();
    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log("⛽ Estimated gas for deployment:", estimatedGas.toString());
  } catch (error) {
    console.log("⚠️  Gas estimation failed, proceeding with deployment...");
  }
  
  const votingContract = await VotingContract.deploy();
  console.log("⏳ Deployment transaction sent:", votingContract.deploymentTransaction().hash);
  
  await votingContract.waitForDeployment();

  const contractAddress = await votingContract.getAddress();
  const deploymentTx = votingContract.deploymentTransaction();
  
  console.log("\n✅ VotingContract deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("👤 Contract owner:", await votingContract.owner());
  console.log("🔗 Deployment transaction:", deploymentTx.hash);
  console.log("⛽ Gas used:", deploymentTx.gasLimit.toString());
  
  // Get deployment receipt for detailed info
  const receipt = await deploymentTx.wait();
  console.log("🧾 Gas actually used:", receipt.gasUsed.toString());
  console.log("📦 Block number:", receipt.blockNumber);
  
  // Verify contract functionality
  console.log("\n🔍 Verifying contract functionality...");
  try {
    // Test basic contract functions
    const owner = await votingContract.owner();
    const candidateCount = await votingContract.candidateCount();
    const voterCount = await votingContract.voterCount();
    
    console.log("✅ Contract verification successful:");
    console.log("  - Owner:", owner);
    console.log("  - Initial candidate count:", candidateCount.toString());
    console.log("  - Initial voter count:", voterCount.toString());
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }
  
  // Save deployment information
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deploymentHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasLimit: deploymentTx.gasLimit.toString(),
    gasPrice: deploymentTx.gasPrice?.toString() || "0",
    timestamp: new Date().toISOString(),
    compilerVersion: "0.8.19",
    optimized: true
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);
  
  // Generate ABI file for frontend integration
  const artifact = await hre.artifacts.readArtifact("VotingContract");
  const abiFile = path.join(deploymentsDir, `VotingContract-abi.json`);
  fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
  console.log("📝 Contract ABI saved to:", abiFile);
  
  // Display deployment summary
  console.log("\n📊 Deployment Summary:");
  console.table({
    "Network": deploymentInfo.network,
    "Chain ID": deploymentInfo.chainId,
    "Contract Address": deploymentInfo.contractAddress,
    "Deployer": deploymentInfo.deployerAddress,
    "Block Number": deploymentInfo.blockNumber,
    "Gas Used": deploymentInfo.gasUsed,
    "Transaction Hash": deploymentInfo.deploymentHash
  });
  
  // Show available accounts for testing
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("\n🔑 Available test accounts:");
    for (let i = 0; i < Math.min(5, accounts.length + 1); i++) {
      const account = i === 0 ? deployer : accounts[i - 1];
      const balance = await hre.ethers.provider.getBalance(account.address);
      console.log(`  ${i}: ${account.address} (${hre.ethers.formatEther(balance)} ETH)`);
    }
  }
  
  console.log("\n🎯 Next steps:");
  console.log("  1. Update backend .env with CONTRACT_ADDRESS=" + contractAddress);
  console.log("  2. Copy ABI file to frontend for contract interaction");
  console.log("  3. Run tests: npm run test");
  console.log("  4. Start backend integration");
}

main()
  .then(() => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment failed:", error);
    process.exit(1);
  });
