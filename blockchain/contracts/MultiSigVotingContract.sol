// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultiSigVotingContract
 * @dev Multi-signature contract for critical voting system administration
 * @author RSU Computer Science Department
 */
contract MultiSigVotingContract {
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmationCount;
        uint256 createdAt;
        string description;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 createdAt;
        uint256 votingDeadline;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        ProposalType proposalType;
        bytes executionData;
    }

    enum ProposalType {
        PARAMETER_CHANGE,
        ADMIN_ADDITION,
        ADMIN_REMOVAL,
        EMERGENCY_ACTION,
        CONTRACT_UPGRADE
    }

    // State variables
    address[] public admins;
    uint256 public requiredConfirmations;
    uint256 public proposalCount;
    uint256 public transactionCount;
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    mapping(address => bool) public isAdmin;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => uint8)) public votes; // 1 = for, 2 = against, 3 = abstain
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Constants
    uint256 public constant MAX_ADMINS = 20;
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant EXECUTION_DELAY = 2 hours;

    // Events
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event RequirementChanged(uint256 required);
    event TransactionSubmitted(uint256 indexed transactionId, address indexed admin);
    event TransactionConfirmed(uint256 indexed transactionId, address indexed admin);
    event TransactionRevoked(uint256 indexed transactionId, address indexed admin);
    event TransactionExecuted(uint256 indexed transactionId);
    event ProposalCreated(uint256 indexed proposalId, string title, address indexed proposer);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, uint8 vote);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event EmergencyAction(address indexed admin, string action, uint256 timestamp);

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not an admin");
        _;
    }

    modifier adminExists(address _admin) {
        require(isAdmin[_admin], "Admin does not exist");
        _;
    }

    modifier adminDoesNotExist(address _admin) {
        require(!isAdmin[_admin], "Admin already exists");
        _;
    }

    modifier transactionExists(uint256 _transactionId) {
        require(_transactionId < transactionCount, "Transaction does not exist");
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    modifier notConfirmed(uint256 _transactionId) {
        require(!isConfirmed[_transactionId][msg.sender], "Transaction already confirmed");
        _;
    }

    modifier notExecuted(uint256 _transactionId) {
        require(!transactions[_transactionId].executed, "Transaction already executed");
        _;
    }

    modifier validRequirement(uint256 _adminCount, uint256 _required) {
        require(_adminCount <= MAX_ADMINS && _required <= _adminCount && _required > 0, "Invalid requirement");
        _;
    }

    constructor(address[] memory _admins, uint256 _required) 
        validRequirement(_admins.length, _required)
    {
        require(_admins.length > 0, "Admins required");
        
        for (uint256 i = 0; i < _admins.length; i++) {
            require(_admins[i] != address(0), "Invalid admin address");
            require(!isAdmin[_admins[i]], "Duplicate admin");
            
            isAdmin[_admins[i]] = true;
            admins.push(_admins[i]);
            emit AdminAdded(_admins[i]);
        }
        
        requiredConfirmations = _required;
        emit RequirementChanged(_required);
    }

    /**
     * @dev Submit a transaction for multi-sig approval
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        string memory _description
    ) external onlyAdmin returns (uint256) {
        uint256 transactionId = transactionCount;
        
        transactions[transactionId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmationCount: 0,
            createdAt: block.timestamp,
            description: _description
        });
        
        transactionCount++;
        emit TransactionSubmitted(transactionId, msg.sender);
        
        // Auto-confirm by submitter
        confirmTransaction(transactionId);
        
        return transactionId;
    }

    /**
     * @dev Confirm a transaction
     */
    function confirmTransaction(uint256 _transactionId) 
        public 
        onlyAdmin 
        transactionExists(_transactionId) 
        notConfirmed(_transactionId) 
    {
        isConfirmed[_transactionId][msg.sender] = true;
        transactions[_transactionId].confirmationCount++;
        
        emit TransactionConfirmed(_transactionId, msg.sender);
        
        if (isTransactionConfirmed(_transactionId)) {
            executeTransaction(_transactionId);
        }
    }

    /**
     * @dev Revoke confirmation for a transaction
     */
    function revokeConfirmation(uint256 _transactionId) 
        external 
        onlyAdmin 
        transactionExists(_transactionId) 
        notExecuted(_transactionId) 
    {
        require(isConfirmed[_transactionId][msg.sender], "Transaction not confirmed");
        
        isConfirmed[_transactionId][msg.sender] = false;
        transactions[_transactionId].confirmationCount--;
        
        emit TransactionRevoked(_transactionId, msg.sender);
    }

    /**
     * @dev Execute a confirmed transaction
     */
    function executeTransaction(uint256 _transactionId) 
        public 
        transactionExists(_transactionId) 
        notExecuted(_transactionId) 
    {
        require(isTransactionConfirmed(_transactionId), "Transaction not confirmed");
        
        Transaction storage txn = transactions[_transactionId];
        txn.executed = true;
        
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(_transactionId);
    }

    /**
     * @dev Create a governance proposal
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _votingPeriod,
        ProposalType _proposalType,
        bytes memory _executionData
    ) external onlyAdmin returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_votingPeriod >= MIN_VOTING_PERIOD && _votingPeriod <= MAX_VOTING_PERIOD, "Invalid voting period");
        
        uint256 proposalId = proposalCount;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            title: _title,
            description: _description,
            proposer: msg.sender,
            createdAt: block.timestamp,
            votingDeadline: block.timestamp + _votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false,
            proposalType: _proposalType,
            executionData: _executionData
        });
        
        proposalCount++;
        emit ProposalCreated(proposalId, _title, msg.sender);
        
        return proposalId;
    }

    /**
     * @dev Vote on a proposal
     */
    function voteOnProposal(uint256 _proposalId, uint8 _vote) 
        external 
        onlyAdmin 
        proposalExists(_proposalId) 
    {
        require(_vote >= 1 && _vote <= 3, "Invalid vote"); // 1 = for, 2 = against, 3 = abstain
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        require(block.timestamp <= proposals[_proposalId].votingDeadline, "Voting period ended");
        
        hasVoted[_proposalId][msg.sender] = true;
        votes[_proposalId][msg.sender] = _vote;
        
        if (_vote == 1) {
            proposals[_proposalId].forVotes++;
        } else if (_vote == 2) {
            proposals[_proposalId].againstVotes++;
        } else {
            proposals[_proposalId].abstainVotes++;
        }
        
        emit ProposalVoted(_proposalId, msg.sender, _vote);
    }

    /**
     * @dev Execute a passed proposal
     */
    function executeProposal(uint256 _proposalId) 
        external 
        onlyAdmin 
        proposalExists(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.votingDeadline, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal not passed");
        require(proposal.forVotes >= requiredConfirmations, "Insufficient votes");
        
        proposal.executed = true;
        
        bool success = true;
        
        // Execute based on proposal type
        if (proposal.proposalType == ProposalType.PARAMETER_CHANGE) {
            // Handle parameter changes
            (bool execSuccess, ) = address(this).call(proposal.executionData);
            success = execSuccess;
        } else if (proposal.proposalType == ProposalType.ADMIN_ADDITION) {
            // Handle admin addition
            address newAdmin = abi.decode(proposal.executionData, (address));
            _addAdmin(newAdmin);
        } else if (proposal.proposalType == ProposalType.ADMIN_REMOVAL) {
            // Handle admin removal
            address adminToRemove = abi.decode(proposal.executionData, (address));
            _removeAdmin(adminToRemove);
        }
        
        emit ProposalExecuted(_proposalId, success);
    }

    /**
     * @dev Add a new admin (internal)
     */
    function _addAdmin(address _admin) 
        internal 
        adminDoesNotExist(_admin) 
        validRequirement(admins.length + 1, requiredConfirmations) 
    {
        require(_admin != address(0), "Invalid admin address");
        require(admins.length < MAX_ADMINS, "Maximum admins reached");
        
        isAdmin[_admin] = true;
        admins.push(_admin);
        
        emit AdminAdded(_admin);
    }

    /**
     * @dev Remove an admin (internal)
     */
    function _removeAdmin(address _admin) 
        internal 
        adminExists(_admin) 
    {
        require(admins.length > 1, "Cannot remove last admin");
        require(admins.length - 1 >= requiredConfirmations, "Would break requirement");
        
        isAdmin[_admin] = false;
        
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == _admin) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
        }
        
        emit AdminRemoved(_admin);
    }

    /**
     * @dev Change required confirmations
     */
    function changeRequirement(uint256 _required) 
        external 
        validRequirement(admins.length, _required) 
    {
        // This should be called through a proposal
        require(msg.sender == address(this), "Must be called through proposal");
        
        requiredConfirmations = _required;
        emit RequirementChanged(_required);
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause(address _targetContract) external onlyAdmin {
        require(_targetContract != address(0), "Invalid target contract");
        
        // Call pause function on target contract
        (bool success, ) = _targetContract.call(abi.encodeWithSignature("emergencyPause()"));
        require(success, "Emergency pause failed");
        
        emit EmergencyAction(msg.sender, "Emergency Pause", block.timestamp);
    }

    // View functions
    function isTransactionConfirmed(uint256 _transactionId) public view returns (bool) {
        return transactions[_transactionId].confirmationCount >= requiredConfirmations;
    }

    function getAdmins() external view returns (address[] memory) {
        return admins;
    }

    function getAdminCount() external view returns (uint256) {
        return admins.length;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactionCount;
    }

    function getConfirmationCount(uint256 _transactionId) external view returns (uint256) {
        return transactions[_transactionId].confirmationCount;
    }

    function getTransaction(uint256 _transactionId) external view returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 confirmationCount,
        uint256 createdAt,
        string memory description
    ) {
        Transaction storage txn = transactions[_transactionId];
        return (
            txn.to,
            txn.value,
            txn.data,
            txn.executed,
            txn.confirmationCount,
            txn.createdAt,
            txn.description
        );
    }

    function getProposal(uint256 _proposalId) external view returns (
        string memory title,
        string memory description,
        address proposer,
        uint256 createdAt,
        uint256 votingDeadline,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        ProposalType proposalType
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.createdAt,
            proposal.votingDeadline,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.proposalType
        );
    }

    function hasVotedOnProposal(uint256 _proposalId, address _admin) external view returns (bool) {
        return hasVoted[_proposalId][_admin];
    }

    function getVote(uint256 _proposalId, address _admin) external view returns (uint8) {
        return votes[_proposalId][_admin];
    }

    // Allow contract to receive Ether
    receive() external payable {}
    
    fallback() external payable {}
}
