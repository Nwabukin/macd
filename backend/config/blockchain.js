const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Blockchain configuration
const blockchainConfig = {
  rpcUrl: process.env.BLOCKCHAIN_URL || 'http://hardhat:8545',
  chainId: process.env.CHAIN_ID || 1337,
  networkName: process.env.NETWORK_NAME || 'hardhat',
  gasLimit: process.env.GAS_LIMIT || 3000000,
  gasPrice: process.env.GAS_PRICE || '1000000000' // 1 gwei
};

// Contract addresses (from deployment)
const contractAddresses = {
  VotingContract: process.env.VOTING_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  AdvancedVotingContract: process.env.ADVANCED_VOTING_CONTRACT || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MultiSigVotingContract: process.env.MULTISIG_CONTRACT || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  SimpleVotingFactory: process.env.FACTORY_CONTRACT || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

// Provider and signer setup
let provider;
let signer;
let contracts = {};

// Initialize blockchain connection
async function initBlockchain() {
  try {
    console.log('🔄 Initializing blockchain connection...');
    console.log('🌐 RPC URL:', blockchainConfig.rpcUrl);
    
    // Create provider
    provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);
    
    // Test connection
    const network = await provider.getNetwork();
    console.log('✅ Connected to blockchain network:', network.name, 'Chain ID:', network.chainId.toString());
    
    // Setup signer
    // Prefer PRIVATE_KEY if provided; otherwise derive from first available account
    const envPrivateKey = process.env.PRIVATE_KEY;
    if (envPrivateKey && /^0x[0-9a-fA-F]{64}$/.test(envPrivateKey)) {
      signer = new ethers.Wallet(envPrivateKey, provider);
      console.log('👤 Using signer from PRIVATE_KEY:', await signer.getAddress());
    } else {
      const accounts = await provider.send('eth_accounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available from provider');
      }
      signer = await provider.getSigner(accounts[0]);
      console.log('👤 Using provider signer account:', await signer.getAddress());
    }
    
    // Load contract ABIs and initialize contracts
    await loadContracts();
    
    return true;
  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error.message);
    return false;
  }
}

// Load contract ABIs and create contract instances
async function loadContracts() {
  try {
    // Resolve ABI path (mounted into backend container by docker-compose)
    // Fallback to relative path for non-docker local runs
    const mountedPath = path.join('/app', 'blockchain', 'deployments');
    const localPath = path.join(process.cwd(), 'blockchain', 'deployments');
    const abiPath = fs.existsSync(mountedPath) ? mountedPath : localPath;
    
    // Load VotingContract ABI
    if (fs.existsSync(path.join(__dirname, abiPath, 'VotingContract-abi.json'))) {
      const votingABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, 'VotingContract-abi.json'), 'utf8')
      );
      contracts.VotingContract = new ethers.Contract(
        contractAddresses.VotingContract,
        votingABI,
        signer
      );
      console.log('📄 VotingContract loaded:', contractAddresses.VotingContract);
    }
    
    // Load AdvancedVotingContract ABI
    if (fs.existsSync(path.join(__dirname, abiPath, 'AdvancedVotingContract-abi.json'))) {
      const advancedABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, 'AdvancedVotingContract-abi.json'), 'utf8')
      );
      contracts.AdvancedVotingContract = new ethers.Contract(
        contractAddresses.AdvancedVotingContract,
        advancedABI,
        signer
      );
      console.log('📄 AdvancedVotingContract loaded:', contractAddresses.AdvancedVotingContract);
    }
    
    // Load MultiSigVotingContract ABI
    if (fs.existsSync(path.join(__dirname, abiPath, 'MultiSigVotingContract-abi.json'))) {
      const multiSigABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, 'MultiSigVotingContract-abi.json'), 'utf8')
      );
      contracts.MultiSigVotingContract = new ethers.Contract(
        contractAddresses.MultiSigVotingContract,
        multiSigABI,
        signer
      );
      console.log('📄 MultiSigVotingContract loaded:', contractAddresses.MultiSigVotingContract);
    }
    
    // Load SimpleVotingFactory ABI
    if (fs.existsSync(path.join(__dirname, abiPath, 'SimpleVotingFactory-abi.json'))) {
      const factoryABI = JSON.parse(
        fs.readFileSync(path.join(abiPath, 'SimpleVotingFactory-abi.json'), 'utf8')
      );
      contracts.SimpleVotingFactory = new ethers.Contract(
        contractAddresses.SimpleVotingFactory,
        factoryABI,
        signer
      );
      console.log('📄 SimpleVotingFactory loaded:', contractAddresses.SimpleVotingFactory);
    }
    
  } catch (error) {
    console.error('❌ Failed to load contracts:', error.message);
    throw error;
  }
}

// Get contract instance
function getContract(contractName) {
  if (!contracts[contractName]) {
    throw new Error(`Contract ${contractName} not loaded`);
  }
  return contracts[contractName];
}

// Execute blockchain transaction with error handling
async function executeTransaction(contractName, methodName, params = [], options = {}) {
  try {
    const contract = getContract(contractName);
    
    // Estimate gas if not provided
    if (!options.gasLimit) {
      try {
        const estimatedGas = await contract[methodName].estimateGas(...params);
        options.gasLimit = Math.floor(estimatedGas * 1.2); // Add 20% buffer
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError.message);
        options.gasLimit = blockchainConfig.gasLimit;
      }
    }
    
    // Execute transaction
    const tx = await contract[methodName](...params, options);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed: ${receipt.transactionHash} (Block: ${receipt.blockNumber})`);
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      events: receipt.logs
    };
  } catch (error) {
    console.error(`❌ Transaction failed (${contractName}.${methodName}):`, error.message);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Execute a write with a temporary wallet from a private key (e.g., voter casting vote)
async function executeWithPrivateKey(contractName, methodName, params = [], privateKey, options = {}) {
  try {
    if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error('Invalid private key');
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = contractAddresses[contractName];
    if (!address) {
      throw new Error(`Unknown contract: ${contractName}`);
    }
    // Load ABI dynamically from already loaded contract or filesystem
    let abi;
    if (contracts[contractName]) {
      abi = contracts[contractName].interface.fragments ? contracts[contractName].interface.formatJson() : contracts[contractName].interface;
    } else {
      // Fallback: read from deployments
      const mountedPath = path.join('/app', 'blockchain', 'deployments');
      const localPath = path.join(process.cwd(), 'blockchain', 'deployments');
      const abiPath = fs.existsSync(mountedPath) ? mountedPath : localPath;
      const fileMap = {
        VotingContract: 'VotingContract-abi.json',
        AdvancedVotingContract: 'AdvancedVotingContract-abi.json',
        MultiSigVotingContract: 'MultiSigVotingContract-abi.json',
        SimpleVotingFactory: 'SimpleVotingFactory-abi.json'
      };
      const fileName = fileMap[contractName];
      abi = JSON.parse(fs.readFileSync(path.join(abiPath, fileName), 'utf8'));
    }
    const contract = new ethers.Contract(address, abi, wallet);

    if (!options.gasLimit) {
      try {
        const estimatedGas = await contract[methodName].estimateGas(...params);
        options.gasLimit = Math.floor(Number(estimatedGas) * 1.2);
      } catch (_) {
        options.gasLimit = blockchainConfig.gasLimit;
      }
    }
    const tx = await contract[methodName](...params, options);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error(`❌ Private key transaction failed (${contractName}.${methodName}):`, error.message);
    return { success: false, error: error.message, code: error.code };
  }
}

// Call contract method (read-only)
async function callContract(contractName, methodName, params = []) {
  try {
    const contract = getContract(contractName);
    const result = await contract[methodName](...params);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error(`❌ Contract call failed (${contractName}.${methodName}):`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get blockchain status
async function getBlockchainStatus() {
  try {
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    
    return {
      connected: true,
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      blockNumber,
      signer: {
        address: signerAddress,
        balance: ethers.formatEther(balance)
      },
      contracts: Object.keys(contracts).map(name => ({
        name,
        address: contractAddresses[name]
      }))
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

// Generate wallet for new voter
function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase
  };
}

// Create wallet from private key
function createWalletFromPrivateKey(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    return {
      success: true,
      wallet,
      address: wallet.address
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Listen for contract events
function listenForEvents(contractName, eventName, callback) {
  try {
    const contract = getContract(contractName);
    contract.on(eventName, (...args) => {
      const event = args[args.length - 1]; // Last argument is event object
      callback({
        event: eventName,
        contract: contractName,
        data: args.slice(0, -1),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
    
    console.log(`👂 Listening for ${contractName}.${eventName} events`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to setup event listener:`, error.message);
    return false;
  }
}

// Blockchain health check
async function healthCheck() {
  try {
    const blockNumber = await provider.getBlockNumber();
    return {
      healthy: true,
      blockNumber,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  initBlockchain,
  getContract,
  executeTransaction,
  callContract,
  executeWithPrivateKey,
  getBlockchainStatus,
  generateWallet,
  createWalletFromPrivateKey,
  listenForEvents,
  healthCheck,
  provider,
  signer,
  contracts,
  contractAddresses
};
