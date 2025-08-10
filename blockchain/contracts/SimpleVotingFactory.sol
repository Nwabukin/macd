// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AdvancedVotingContract.sol";

/**
 * @title SimpleVotingFactory
 * @dev Simplified factory contract for deploying voting contracts
 * @author RSU Computer Science Department
 */
contract SimpleVotingFactory {
    struct DeployedContract {
        address contractAddress;
        string name;
        address deployer;
        uint256 deployedAt;
        bool isActive;
    }

    // State variables
    address public owner;
    uint256 public deployedContractCount;
    uint256 public deploymentFee;

    // Mappings
    mapping(uint256 => DeployedContract) public deployedContracts;
    mapping(address => uint256[]) public userContracts;
    mapping(address => bool) public authorizedDeployers;

    // Events
    event ContractDeployed(
        uint256 indexed contractId,
        address indexed contractAddress,
        address indexed deployer,
        string name
    );
    
    event DeployerAuthorized(address indexed deployer);
    event DeployerRevoked(address indexed deployer);
    event DeploymentFeeUpdated(uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner, "Not authorized to deploy");
        _;
    }

    constructor(uint256 _deploymentFee) {
        owner = msg.sender;
        deploymentFee = _deploymentFee;
    }

    /**
     * @dev Deploy an advanced voting contract
     */
    function deployAdvancedVotingContract(
        string memory _name
    ) external payable onlyAuthorizedDeployer returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(_name).length > 0, "Name cannot be empty");

        // Deploy new AdvancedVotingContract
        AdvancedVotingContract newContract = new AdvancedVotingContract();
        
        // Transfer ownership to deployer
        newContract.transferOwnership(msg.sender);
        
        return _registerDeployedContract(
            address(newContract),
            _name,
            msg.sender
        );
    }

    /**
     * @dev Register a deployed contract
     */
    function _registerDeployedContract(
        address _contractAddress,
        string memory _name,
        address _deployer
    ) internal returns (address) {
        uint256 contractId = deployedContractCount;
        
        deployedContracts[contractId] = DeployedContract({
            contractAddress: _contractAddress,
            name: _name,
            deployer: _deployer,
            deployedAt: block.timestamp,
            isActive: true
        });
        
        userContracts[_deployer].push(contractId);
        deployedContractCount++;
        
        emit ContractDeployed(contractId, _contractAddress, _deployer, _name);
        
        return _contractAddress;
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
     * @dev Update deployment fee
     */
    function updateDeploymentFee(uint256 _newFee) external onlyOwner {
        deploymentFee = _newFee;
        emit DeploymentFeeUpdated(_newFee);
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
    function getDeployedContract(uint256 _contractId) external view returns (
        address contractAddress,
        string memory name,
        address deployer,
        uint256 deployedAt,
        bool isActive
    ) {
        require(_contractId < deployedContractCount, "Contract ID does not exist");
        DeployedContract storage deployed = deployedContracts[_contractId];
        return (
            deployed.contractAddress,
            deployed.name,
            deployed.deployer,
            deployed.deployedAt,
            deployed.isActive
        );
    }

    function getUserContracts(address _user) external view returns (uint256[] memory) {
        return userContracts[_user];
    }

    function isAuthorizedDeployer(address _deployer) external view returns (bool) {
        return authorizedDeployers[_deployer] || _deployer == owner;
    }

    // Receive function to accept Ether
    receive() external payable {}
}
