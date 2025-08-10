// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IVotingEvents.sol";
import "./libraries/VotingUtils.sol";

/**
 * @title Advanced RSU E-Voting Contract
 * @dev Enhanced smart contract for complex voting scenarios with multiple positions
 * @author RSU Computer Science Department
 */
contract AdvancedVotingContract is IVotingEvents {
    using VotingUtils for uint256;

    struct Candidate {
        uint256 id;
        string name;
        string matricNumber;
        uint256 positionId;
        string bio;
        uint256 voteCount;
        bool isApproved;
        uint256 approvedAt;
        bool exists;
    }
    
    struct Position {
        uint256 id;
        string title;
        string description;
        uint256 maxCandidates;
        uint256 maxVotesPerVoter;
        bool isActive;
        uint256 candidateCount;
    }
    
    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 electionType; // 1: General, 2: Departmental, 3: Level-based
        bool isActive;
        uint256 totalVotes;
        uint256 totalPositions;
        address creator;
    }
    
    struct Voter {
        address voterAddress;
        string matricNumber;
        bool isAuthorized;
        uint256 authorizedAt;
        mapping(uint256 => bool) hasVotedForPosition;
        mapping(uint256 => uint256) votedCandidateForPosition;
        uint256 totalVotesCast;
    }

    // Contract state
    address public owner;
    uint256 public currentElectionId;
    bool public contractPaused;
    
    // Mappings
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Position) public positions;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;
    mapping(uint256 => mapping(uint256 => uint256[])) public positionCandidates; // electionId => positionId => candidateIds
    mapping(uint256 => uint256[]) public electionPositions; // electionId => positionIds
    
    // Counters
    uint256 public electionCount;
    uint256 public positionCount;
    uint256 public candidateCount;
    uint256 public voterCount;
    
    // Security features
    mapping(address => bool) public authorizedAdmins;
    mapping(address => uint256) public failedVoteAttempts;
    uint256 public constant MAX_FAILED_ATTEMPTS = 3;
    uint256 public constant VOTE_LOCKOUT_PERIOD = 1 hours;
    mapping(address => uint256) public voteLockoutUntil;
    
    // Constants
    uint256 public constant MAX_POSITIONS_PER_ELECTION = 20;
    uint256 public constant MAX_CANDIDATES_PER_POSITION = 50;
    uint256 public constant MAX_ELECTION_DURATION = 30 days;
    uint256 public constant MIN_ELECTION_DURATION = 1 hours;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedAdmin() {
        require(msg.sender == owner || authorizedAdmins[msg.sender], "Only authorized admin can perform this action");
        _;
    }
    
    modifier onlyAuthorizedVoter() {
        require(voters[msg.sender].isAuthorized, "You are not authorized to vote");
        _;
    }
    
    modifier whenNotPaused() {
        require(!contractPaused, "Contract is paused");
        _;
    }
    
    modifier electionExists(uint256 _electionId) {
        require(_electionId <= electionCount && _electionId > 0, "Election does not exist");
        _;
    }
    
    modifier electionActive(uint256 _electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Election has not started yet");
        require(block.timestamp <= election.endTime, "Election has ended");
        _;
    }
    
    modifier validPosition(uint256 _positionId) {
        require(_positionId <= positionCount && _positionId > 0, "Position does not exist");
        require(positions[_positionId].isActive, "Position is not active");
        _;
    }
    
    modifier notLockedOut() {
        require(block.timestamp >= voteLockoutUntil[msg.sender], "Voter is temporarily locked out");
        _;
    }

    constructor() {
        owner = msg.sender;
        contractPaused = false;
        emit OwnershipTransferred(address(0), owner);
    }

    /**
     * @dev Create a new election with multiple positions
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _electionType,
        uint256[] memory _positionIds
    ) external onlyAuthorizedAdmin whenNotPaused returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime - _startTime >= MIN_ELECTION_DURATION, "Election duration too short");
        require(_endTime - _startTime <= MAX_ELECTION_DURATION, "Election duration too long");
        require(_positionIds.length > 0, "At least one position required");
        require(_positionIds.length <= MAX_POSITIONS_PER_ELECTION, "Too many positions");
        require(_electionType >= 1 && _electionType <= 3, "Invalid election type");

        electionCount++;
        currentElectionId = electionCount;
        
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.title = _title;
        newElection.description = _description;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.electionType = _electionType;
        newElection.isActive = true;
        newElection.creator = msg.sender;
        newElection.totalPositions = _positionIds.length;
        
        // Add positions to election
        for (uint256 i = 0; i < _positionIds.length; i++) {
            require(positions[_positionIds[i]].isActive, "Position is not active");
            electionPositions[electionCount].push(_positionIds[i]);
        }
        
        emit ElectionCreated(electionCount, _title, _startTime, _endTime, _electionType);
        return electionCount;
    }

    /**
     * @dev Create a new position for elections
     */
    function createPosition(
        string memory _title,
        string memory _description,
        uint256 _maxCandidates,
        uint256 _maxVotesPerVoter
    ) external onlyAuthorizedAdmin returns (uint256) {
        require(bytes(_title).length > 0, "Position title cannot be empty");
        require(_maxCandidates > 0 && _maxCandidates <= MAX_CANDIDATES_PER_POSITION, "Invalid max candidates");
        require(_maxVotesPerVoter > 0, "Max votes per voter must be greater than 0");

        positionCount++;
        
        Position storage newPosition = positions[positionCount];
        newPosition.id = positionCount;
        newPosition.title = _title;
        newPosition.description = _description;
        newPosition.maxCandidates = _maxCandidates;
        newPosition.maxVotesPerVoter = _maxVotesPerVoter;
        newPosition.isActive = true;
        
        emit PositionCreated(positionCount, _title, _maxCandidates);
        return positionCount;
    }

    /**
     * @dev Add a candidate to a specific position in an election
     */
    function addCandidate(
        uint256 _electionId,
        uint256 _positionId,
        string memory _name,
        string memory _matricNumber,
        string memory _bio
    ) external onlyAuthorizedAdmin electionExists(_electionId) validPosition(_positionId) returns (uint256) {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        require(bytes(_matricNumber).length > 0, "Matric number cannot be empty");
        require(elections[_electionId].isActive, "Election is not active");
        require(block.timestamp < elections[_electionId].startTime, "Cannot add candidates after election starts");
        
        // Check if position is part of this election
        bool positionInElection = false;
        uint256[] storage electionPositionList = electionPositions[_electionId];
        for (uint256 i = 0; i < electionPositionList.length; i++) {
            if (electionPositionList[i] == _positionId) {
                positionInElection = true;
                break;
            }
        }
        require(positionInElection, "Position is not part of this election");
        
        // Check candidate limit for position
        require(
            positionCandidates[_electionId][_positionId].length < positions[_positionId].maxCandidates,
            "Maximum candidates reached for this position"
        );

        candidateCount++;
        
        Candidate storage newCandidate = candidates[candidateCount];
        newCandidate.id = candidateCount;
        newCandidate.name = _name;
        newCandidate.matricNumber = _matricNumber;
        newCandidate.positionId = _positionId;
        newCandidate.bio = _bio;
        newCandidate.isApproved = true; // Auto-approve for now
        newCandidate.approvedAt = block.timestamp;
        newCandidate.exists = true;
        
        // Add to position's candidate list
        positionCandidates[_electionId][_positionId].push(candidateCount);
        positions[_positionId].candidateCount++;
        
        emit CandidateAdded(candidateCount, _name, _positionId, _electionId);
        return candidateCount;
    }

    /**
     * @dev Authorize a voter with their matriculation number
     */
    function authorizeVoter(
        address _voterAddress,
        string memory _matricNumber
    ) external onlyAuthorizedAdmin {
        require(_voterAddress != address(0), "Invalid voter address");
        require(bytes(_matricNumber).length > 0, "Matric number cannot be empty");
        require(!voters[_voterAddress].isAuthorized, "Voter already authorized");

        Voter storage voter = voters[_voterAddress];
        voter.voterAddress = _voterAddress;
        voter.matricNumber = _matricNumber;
        voter.isAuthorized = true;
        voter.authorizedAt = block.timestamp;
        
        voterCount++;
        emit VoterAuthorized(_voterAddress, _matricNumber);
    }

    /**
     * @dev Cast a vote for a candidate in a specific position
     */
    function vote(
        uint256 _electionId,
        uint256 _positionId,
        uint256 _candidateId
    ) external 
        onlyAuthorizedVoter 
        whenNotPaused 
        notLockedOut 
        electionExists(_electionId) 
        electionActive(_electionId) 
        validPosition(_positionId) 
    {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        require(candidates[_candidateId].positionId == _positionId, "Candidate not running for this position");
        require(candidates[_candidateId].isApproved, "Candidate not approved");
        
        Voter storage voter = voters[msg.sender];
        require(!voter.hasVotedForPosition[_positionId], "Already voted for this position");
        
        // Verify candidate is in this election's position
        bool candidateValid = false;
        uint256[] storage candidateList = positionCandidates[_electionId][_positionId];
        for (uint256 i = 0; i < candidateList.length; i++) {
            if (candidateList[i] == _candidateId) {
                candidateValid = true;
                break;
            }
        }
        require(candidateValid, "Candidate not valid for this election and position");
        
        // Cast vote
        voter.hasVotedForPosition[_positionId] = true;
        voter.votedCandidateForPosition[_positionId] = _candidateId;
        voter.totalVotesCast++;
        
        candidates[_candidateId].voteCount++;
        elections[_electionId].totalVotes++;
        
        // Reset failed attempts on successful vote
        failedVoteAttempts[msg.sender] = 0;
        
        emit VoteCast(msg.sender, _candidateId, _positionId, _electionId);
    }

    /**
     * @dev End an election
     */
    function endElection(uint256 _electionId) external onlyAuthorizedAdmin electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        
        election.isActive = false;
        emit ElectionEnded(_electionId, election.title, election.totalVotes);
    }

    /**
     * @dev Add authorized admin
     */
    function addAuthorizedAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        require(!authorizedAdmins[_admin], "Admin already authorized");
        
        authorizedAdmins[_admin] = true;
        emit AdminAuthorized(_admin);
    }

    /**
     * @dev Remove authorized admin
     */
    function removeAuthorizedAdmin(address _admin) external onlyOwner {
        require(authorizedAdmins[_admin], "Admin not authorized");
        
        authorizedAdmins[_admin] = false;
        emit AdminRevoked(_admin);
    }

    /**
     * @dev Pause/unpause contract
     */
    function togglePause() external onlyOwner {
        contractPaused = !contractPaused;
        emit ContractPauseToggled(contractPaused);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != owner, "New owner is the same as current owner");
        
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    // View functions
    function getElectionInfo(uint256 _electionId) external view electionExists(_electionId) returns (
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 electionType,
        bool isActive,
        uint256 totalVotes,
        uint256 totalPositions
    ) {
        Election storage election = elections[_electionId];
        return (
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.electionType,
            election.isActive,
            election.totalVotes,
            election.totalPositions
        );
    }

    function getPositionInfo(uint256 _positionId) external view validPosition(_positionId) returns (
        string memory title,
        string memory description,
        uint256 maxCandidates,
        uint256 maxVotesPerVoter,
        bool isActive,
        uint256 totalCandidates
    ) {
        Position storage position = positions[_positionId];
        return (
            position.title,
            position.description,
            position.maxCandidates,
            position.maxVotesPerVoter,
            position.isActive,
            position.candidateCount
        );
    }

    function getCandidateInfo(uint256 _candidateId) external view returns (
        string memory name,
        string memory matricNumber,
        uint256 positionId,
        string memory bio,
        uint256 voteCount,
        bool isApproved
    ) {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        Candidate storage candidate = candidates[_candidateId];
        return (
            candidate.name,
            candidate.matricNumber,
            candidate.positionId,
            candidate.bio,
            candidate.voteCount,
            candidate.isApproved
        );
    }

    function getElectionPositions(uint256 _electionId) external view electionExists(_electionId) returns (uint256[] memory) {
        return electionPositions[_electionId];
    }

    function getPositionCandidates(uint256 _electionId, uint256 _positionId) external view electionExists(_electionId) validPosition(_positionId) returns (uint256[] memory) {
        return positionCandidates[_electionId][_positionId];
    }

    function hasVoterVotedForPosition(address _voter, uint256 _positionId) external view returns (bool) {
        return voters[_voter].hasVotedForPosition[_positionId];
    }

    function getVoterChoice(address _voter, uint256 _positionId) external view returns (uint256) {
        return voters[_voter].votedCandidateForPosition[_positionId];
    }

    function isVoterAuthorized(address _voter) external view returns (bool) {
        return voters[_voter].isAuthorized;
    }

    function getCurrentElection() external view returns (uint256) {
        return currentElectionId;
    }

    // Handle failed vote attempts and lockout
    function _handleFailedVote(address _voter) internal {
        failedVoteAttempts[_voter]++;
        
        if (failedVoteAttempts[_voter] >= MAX_FAILED_ATTEMPTS) {
            voteLockoutUntil[_voter] = block.timestamp + VOTE_LOCKOUT_PERIOD;
            emit VoterLockedOut(_voter, voteLockoutUntil[_voter]);
        }
    }

    // Emergency functions
    function emergencyPause() external onlyOwner {
        contractPaused = true;
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
