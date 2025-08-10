const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of Advanced RSU E-Voting Contracts...");
  console.log("🌐 Network:", hre.network.name);
  
  // Get the ContractFactory and Signers
  const [deployer, admin1, admin2, ...accounts] = await hre.ethers.getSigners();
  
  console.log("📝 Deploying contracts with the account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployerAddress: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // 1. Deploy AdvancedVotingContract
    console.log("\n📦 Deploying AdvancedVotingContract...");
    const AdvancedVotingContract = await hre.ethers.getContractFactory("AdvancedVotingContract");
    const advancedVoting = await AdvancedVotingContract.deploy();
    await advancedVoting.waitForDeployment();

    const advancedVotingAddress = await advancedVoting.getAddress();
    const advancedVotingTx = advancedVoting.deploymentTransaction();
    const advancedVotingReceipt = await advancedVotingTx.wait();

    console.log("✅ AdvancedVotingContract deployed to:", advancedVotingAddress);
    console.log("⛽ Gas used:", advancedVotingReceipt.gasUsed.toString());

    deploymentInfo.contracts.AdvancedVotingContract = {
      address: advancedVotingAddress,
      deploymentHash: advancedVotingTx.hash,
      blockNumber: advancedVotingReceipt.blockNumber,
      gasUsed: advancedVotingReceipt.gasUsed.toString()
    };

    // 2. Deploy MultiSigVotingContract
    console.log("\n📦 Deploying MultiSigVotingContract...");
    const MultiSigVotingContract = await hre.ethers.getContractFactory("MultiSigVotingContract");
    
    // Setup initial admins (deployer, admin1, admin2)
    const initialAdmins = [deployer.address, admin1.address, admin2.address];
    const requiredConfirmations = 2; // Require 2 out of 3
    
    const multiSigVoting = await MultiSigVotingContract.deploy(initialAdmins, requiredConfirmations);
    await multiSigVoting.waitForDeployment();

    const multiSigAddress = await multiSigVoting.getAddress();
    const multiSigTx = multiSigVoting.deploymentTransaction();
    const multiSigReceipt = await multiSigTx.wait();

    console.log("✅ MultiSigVotingContract deployed to:", multiSigAddress);
    console.log("⛽ Gas used:", multiSigReceipt.gasUsed.toString());
    console.log("👥 Initial admins:", initialAdmins);
    console.log("🔒 Required confirmations:", requiredConfirmations);

    deploymentInfo.contracts.MultiSigVotingContract = {
      address: multiSigAddress,
      deploymentHash: multiSigTx.hash,
      blockNumber: multiSigReceipt.blockNumber,
      gasUsed: multiSigReceipt.gasUsed.toString(),
      initialAdmins: initialAdmins,
      requiredConfirmations: requiredConfirmations
    };

    // 3. Deploy SimpleVotingFactory
    console.log("\n📦 Deploying SimpleVotingFactory...");
    const SimpleVotingFactory = await hre.ethers.getContractFactory("SimpleVotingFactory");
    const deploymentFee = hre.ethers.parseEther("0.01"); // 0.01 ETH deployment fee
    
    const factory = await SimpleVotingFactory.deploy(deploymentFee);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    const factoryTx = factory.deploymentTransaction();
    const factoryReceipt = await factoryTx.wait();

    console.log("✅ SimpleVotingFactory deployed to:", factoryAddress);
    console.log("⛽ Gas used:", factoryReceipt.gasUsed.toString());
    console.log("💰 Deployment fee:", hre.ethers.formatEther(deploymentFee), "ETH");

    deploymentInfo.contracts.SimpleVotingFactory = {
      address: factoryAddress,
      deploymentHash: factoryTx.hash,
      blockNumber: factoryReceipt.blockNumber,
      gasUsed: factoryReceipt.gasUsed.toString(),
      deploymentFee: deploymentFee.toString()
    };

    // 4. Setup AdvancedVotingContract
    console.log("\n🔧 Setting up AdvancedVotingContract...");
    
    // Add admin1 and admin2 as authorized admins
    await advancedVoting.addAuthorizedAdmin(admin1.address);
    await advancedVoting.addAuthorizedAdmin(admin2.address);
    console.log("✅ Authorized admins added");

    // Create sample positions
    console.log("\n📋 Creating sample positions...");
    const positions = [
      { title: "President", desc: "Student Union President", maxCand: 5, maxVotes: 1 },
      { title: "Vice President", desc: "Student Union Vice President", maxCand: 3, maxVotes: 1 },
      { title: "Secretary", desc: "Student Union Secretary", maxCand: 4, maxVotes: 1 },
      { title: "Treasurer", desc: "Student Union Treasurer", maxCand: 3, maxVotes: 1 }
    ];

    const positionIds = [];
    for (const pos of positions) {
      const tx = await advancedVoting.connect(admin1).createPosition(
        pos.title, pos.desc, pos.maxCand, pos.maxVotes
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'PositionCreated'
      );
      positionIds.push(event.args[0]);
      console.log(`  ✅ Created position: ${pos.title} (ID: ${event.args[0]})`);
    }

    deploymentInfo.sampleData = {
      positions: positions.map((pos, i) => ({
        id: positionIds[i].toString(),
        title: pos.title,
        description: pos.desc
      }))
    };

    // 5. Verify deployments
    console.log("\n🔍 Verifying deployments...");
    
    // Verify AdvancedVotingContract
    const owner = await advancedVoting.owner();
    const positionCount = await advancedVoting.positionCount();
    console.log("✅ AdvancedVotingContract - Owner:", owner);
    console.log("✅ AdvancedVotingContract - Positions created:", positionCount.toString());

    // Verify MultiSigVotingContract
    const adminCount = await multiSigVoting.getAdminCount();
    const required = await multiSigVoting.requiredConfirmations();
    console.log("✅ MultiSigVotingContract - Admin count:", adminCount.toString());
    console.log("✅ MultiSigVotingContract - Required confirmations:", required.toString());

    // Verify Factory
    const factoryOwner = await factory.owner();
    const deployedCount = await factory.deployedContractCount();
    console.log("✅ SimpleVotingFactory - Owner:", factoryOwner);
    console.log("✅ SimpleVotingFactory - Deployed count:", deployedCount.toString());

    // 6. Save deployment information
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-advanced.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Advanced deployment info saved to:", deploymentFile);

    // Generate ABIs for all contracts
    const contracts = ['AdvancedVotingContract', 'MultiSigVotingContract', 'SimpleVotingFactory'];
    for (const contractName of contracts) {
      const artifact = await hre.artifacts.readArtifact(contractName);
      const abiFile = path.join(deploymentsDir, `${contractName}-abi.json`);
      fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
      console.log(`📝 ${contractName} ABI saved to:`, abiFile);
    }

    // 7. Display deployment summary
    console.log("\n📊 Advanced Deployment Summary:");
    console.table({
      "AdvancedVotingContract": {
        "Address": deploymentInfo.contracts.AdvancedVotingContract.address,
        "Gas Used": deploymentInfo.contracts.AdvancedVotingContract.gasUsed
      },
      "MultiSigVotingContract": {
        "Address": deploymentInfo.contracts.MultiSigVotingContract.address,
        "Gas Used": deploymentInfo.contracts.MultiSigVotingContract.gasUsed
      },
      "SimpleVotingFactory": {
        "Address": deploymentInfo.contracts.SimpleVotingFactory.address,
        "Gas Used": deploymentInfo.contracts.SimpleVotingFactory.gasUsed
      }
    });

    // Show available accounts for testing
    if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
      console.log("\n🔑 Available test accounts:");
      for (let i = 0; i < Math.min(5, accounts.length + 3); i++) {
        let account;
        if (i === 0) account = deployer;
        else if (i === 1) account = admin1;
        else if (i === 2) account = admin2;
        else account = accounts[i - 3];
        
        const balance = await hre.ethers.provider.getBalance(account.address);
        console.log(`  ${i}: ${account.address} (${hre.ethers.formatEther(balance)} ETH)`);
      }
    }

    console.log("\n🎯 Next steps:");
    console.log("  1. Update backend .env with contract addresses:");
    console.log(`     ADVANCED_VOTING_CONTRACT=${deploymentInfo.contracts.AdvancedVotingContract.address}`);
    console.log(`     MULTISIG_CONTRACT=${deploymentInfo.contracts.MultiSigVotingContract.address}`);
    console.log(`     FACTORY_CONTRACT=${deploymentInfo.contracts.SimpleVotingFactory.address}`);
    console.log("  2. Copy ABI files to frontend for contract interaction");
    console.log("  3. Run advanced tests: npm run test test/AdvancedVotingContract.test.js");
    console.log("  4. Set up sample election with positions and candidates");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Advanced deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Advanced deployment failed:", error);
    process.exit(1);
  });
