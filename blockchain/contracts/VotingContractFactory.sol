// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AdvancedVotingContract.sol";
import "./MultiSigVotingContract.sol";
import "./VotingContract.sol";

/**
 * @title VotingContractFactory
 * @dev Factory contract for deploying and managing voting contracts
 * @author RSU Computer Science Department
 */
contract VotingContractFactory {
    struct DeployedContract {
        address contractAddress;
        string contractType;
        string name;
        address deployer;
        uint256 deployedAt;
        bool isActive;
        uint256 version;
    }

    struct ContractTemplate {
        string name;
        string description;
        bytes bytecode;
        uint256 version;
        bool isActive;
        uint256 deploymentCost;
    }

    // State variables
    address public owner;
    uint256 public deployedContractCount;
    uint256 public templateCount;
    uint256 public currentVersion;
    bool public factoryPaused;
    uint256 public deploymentFee;

    // Mappings
    mapping(uint256 => DeployedContract) public deployedContracts;
    mapping(address => uint256[]) public userContracts;
    mapping(string => uint256) public templateIds;
    mapping(uint256 => ContractTemplate) public templates;
    mapping(address => bool) public authorizedDeployers;
    mapping(address => bool) public contractExists;

    // Events
    event ContractDeployed(
        uint256 indexed contractId,
        address indexed contractAddress,
        string contractType,
        address indexed deployer,
        string name
    );
    
    event TemplateAdded(
        uint256 indexed templateId,
        string name,
        uint256 version
    );
    
    event TemplateUpdated(
        uint256 indexed templateId,
        uint256 newVersion
    );
    
    event DeployerAuthorized(address indexed deployer);
    event DeployerRevoked(address indexed deployer);
    event FactoryPaused(bool paused);
    event DeploymentFeeUpdated(uint256 newFee);
    event ContractDeactivated(uint256 indexed contractId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner, "Not authorized to deploy");
        _;
    }

    modifier whenNotPaused() {
        require(!factoryPaused, "Factory is paused");
        _;
    }

    modifier contractIdExists(uint256 _contractId) {
        require(_contractId < deployedContractCount, "Contract ID does not exist");
        _;
    }

    constructor(uint256 _deploymentFee) {
        owner = msg.sender;
        deploymentFee = _deploymentFee;
        currentVersion = 1;
        factoryPaused = false;
        
        // Initialize basic templates
        _addTemplate(
            "BasicVoting",
            "Basic voting contract for simple elections",
            "",
            1,
            true,
            0
        );
        
        _addTemplate(
            "AdvancedVoting",
            "Advanced voting contract with multiple positions",
            "",
            1,
            true,
            deploymentFee
        );
        
        _addTemplate(
            "MultiSigVoting",
            "Multi-signature voting contract for governance",
            "",
            1,
            true,
            deploymentFee * 2
        );
    }

    /**
     * @dev Deploy a basic voting contract
     */
    function deployBasicVotingContract(
        string memory _name
    ) external payable onlyAuthorizedDeployer whenNotPaused returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(_name).length > 0, "Name cannot be empty");

        // Deploy new VotingContract (the original one)
        VotingContract newContract = new VotingContract();
        
        // Transfer ownership to deployer
        // Note: This would require the VotingContract to have a transferOwnership function
        
        return _registerDeployedContract(
            address(newContract),
            "BasicVoting",
            _name,
            msg.sender
        );
    }

    /**
     * @dev Deploy an advanced voting contract
     */
    function deployAdvancedVotingContract(
        string memory _name
    ) external payable onlyAuthorizedDeployer whenNotPaused returns (address) {
        require(msg.value >= templates[templateIds["AdvancedVoting"]].deploymentCost, "Insufficient deployment fee");
        require(bytes(_name).length > 0, "Name cannot be empty");

        // Deploy new AdvancedVotingContract
        AdvancedVotingContract newContract = new AdvancedVotingContract();
        
        // Transfer ownership to deployer
        newContract.transferOwnership(msg.sender);
        
        return _registerDeployedContract(
            address(newContract),
            "AdvancedVoting",
            _name,
            msg.sender
        );
    }

    /**
     * @dev Deploy a multi-signature voting contract
     */
    function deployMultiSigVotingContract(
        string memory _name,
        address[] memory _admins,
        uint256 _requiredConfirmations
    ) external payable onlyAuthorizedDeployer whenNotPaused returns (address) {
        require(msg.value >= templates[templateIds["MultiSigVoting"]].deploymentCost, "Insufficient deployment fee");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_admins.length > 0, "At least one admin required");
        require(_requiredConfirmations > 0 && _requiredConfirmations <= _admins.length, "Invalid required confirmations");

        // Deploy new MultiSigVotingContract
        MultiSigVotingContract newContract = new MultiSigVotingContract(_admins, _requiredConfirmations);
        
        return _registerDeployedContract(
            address(newContract),
            "MultiSigVoting",
            _name,
            msg.sender
        );
    }

    /**
     * @dev Register a deployed contract
     */
    function _registerDeployedContract(
        address _contractAddress,
        string memory _contractType,
        string memory _name,
        address _deployer
    ) internal returns (address) {
        uint256 contractId = deployedContractCount;
        
        deployedContracts[contractId] = DeployedContract({
            contractAddress: _contractAddress,
            contractType: _contractType,
            name: _name,
            deployer: _deployer,
            deployedAt: block.timestamp,
            isActive: true,
            version: currentVersion
        });
        
        userContracts[_deployer].push(contractId);
        contractExists[_contractAddress] = true;
        deployedContractCount++;
        
        emit ContractDeployed(contractId, _contractAddress, _contractType, _deployer, _name);
        
        return _contractAddress;
    }

    /**
     * @dev Add a new contract template
     */
    function addTemplate(
        string memory _name,
        string memory _description,
        bytes memory _bytecode,
        uint256 _version,
        uint256 _deploymentCost
    ) external onlyOwner {
        _addTemplate(_name, _description, _bytecode, _version, true, _deploymentCost);
    }

    /**
     * @dev Internal function to add template
     */
    function _addTemplate(
        string memory _name,
        string memory _description,
        bytes memory _bytecode,
        uint256 _version,
        bool _isActive,
        uint256 _deploymentCost
    ) internal {
        require(bytes(_name).length > 0, "Template name cannot be empty");
        require(templateIds[_name] == 0, "Template already exists");

        templateCount++;
        templateIds[_name] = templateCount;
        
        templates[templateCount] = ContractTemplate({
            name: _name,
            description: _description,
            bytecode: _bytecode,
            version: _version,
            isActive: _isActive,
            deploymentCost: _deploymentCost
        });
        
        emit TemplateAdded(templateCount, _name, _version);
    }

    /**
     * @dev Update a contract template
     */
    function updateTemplate(
        string memory _name,
        string memory _description,
        bytes memory _bytecode,
        uint256 _version,
        uint256 _deploymentCost
    ) external onlyOwner {
        uint256 templateId = templateIds[_name];
        require(templateId > 0, "Template does not exist");
        
        ContractTemplate storage template = templates[templateId];
        template.description = _description;
        template.bytecode = _bytecode;
        template.version = _version;
        template.deploymentCost = _deploymentCost;
        
        emit TemplateUpdated(templateId, _version);
    }

    /**
     * @dev Authorize a deployer
     */
    function authorizeDeployer(address _deployer) external onlyOwner {
        require(_deployer != address(0), "Invalid deployer address");
        require(!authorizedDeployers[_deployer], "Deployer already authorized");
        
        authorizedDeployers[_deployer] = true;
        emit DeployerAuthorized(_deployer);
    }

    /**
     * @dev Revoke deployer authorization
     */
    function revokeDeployer(address _deployer) external onlyOwner {
        require(authorizedDeployers[_deployer], "Deployer not authorized");
        
        authorizedDeployers[_deployer] = false;
        emit DeployerRevoked(_deployer);
    }

    /**
     * @dev Pause/unpause factory
     */
    function togglePause() external onlyOwner {
        factoryPaused = !factoryPaused;
        emit FactoryPaused(factoryPaused);
    }

    /**
     * @dev Update deployment fee
     */
    function updateDeploymentFee(uint256 _newFee) external onlyOwner {
        deploymentFee = _newFee;
        emit DeploymentFeeUpdated(_newFee);
    }

    /**
     * @dev Deactivate a deployed contract
     */
    function deactivateContract(uint256 _contractId) external onlyOwner contractIdExists(_contractId) {
        deployedContracts[_contractId].isActive = false;
        emit ContractDeactivated(_contractId);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        require(_newOwner != owner, "New owner is same as current owner");
        
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner).transfer(balance);
    }

    // View functions
    function getDeployedContract(uint256 _contractId) external view contractIdExists(_contractId) returns (
        address contractAddress,
        string memory contractType,
        string memory name,
        address deployer,
        uint256 deployedAt,
        bool isActive,
        uint256 version
    ) {
        DeployedContract storage deployed = deployedContracts[_contractId];
        return (
            deployed.contractAddress,
            deployed.contractType,
            deployed.name,
            deployed.deployer,
            deployed.deployedAt,
            deployed.isActive,
            deployed.version
        );
    }

    function getUserContracts(address _user) external view returns (uint256[] memory) {
        return userContracts[_user];
    }

    function getTemplate(string memory _name) external view returns (
        string memory description,
        uint256 version,
        bool isActive,
        uint256 deploymentCost
    ) {
        uint256 templateId = templateIds[_name];
        require(templateId > 0, "Template does not exist");
        
        ContractTemplate storage template = templates[templateId];
        return (
            template.description,
            template.version,
            template.isActive,
            template.deploymentCost
        );
    }

    function isContractDeployed(address _contract) external view returns (bool) {
        return contractExists[_contract];
    }

    function isAuthorizedDeployer(address _deployer) external view returns (bool) {
        return authorizedDeployers[_deployer] || _deployer == owner;
    }

    function getFactoryInfo() external view returns (
        address factoryOwner,
        uint256 totalDeployed,
        uint256 totalTemplates,
        uint256 version,
        bool isPaused,
        uint256 fee
    ) {
        return (
            owner,
            deployedContractCount,
            templateCount,
            currentVersion,
            factoryPaused,
            deploymentFee
        );
    }

    // Emergency function
    function emergencyStop() external onlyOwner {
        factoryPaused = true;
        emit FactoryPaused(true);
    }

    // Receive function to accept Ether
    receive() external payable {}
}
