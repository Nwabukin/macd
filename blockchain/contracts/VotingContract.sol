// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RSU E-Voting Contract
 * @dev Smart contract for secure and transparent voting system
 * @author RSU Computer Science Department
 */
contract VotingContract {
    struct Candidate {
        uint256 id;
        string name;
        string position;
        uint256 voteCount;
        bool exists;
    }
    
    struct Election {
        string title;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 totalVotes;
    }
    
    address public owner;
    Election public election;
    
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public authorizedVoters;
    mapping(address => bool) public hasVoted;
    
    uint256 public candidateCount;
    uint256 public voterCount;
    
    event VoterAuthorized(address indexed voter);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event CandidateAdded(uint256 indexed candidateId, string name, string position);
    event ElectionStarted(string title, uint256 startTime, uint256 endTime);
    event ElectionEnded(string title, uint256 totalVotes);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedVoter() {
        require(authorizedVoters[msg.sender], "You are not authorized to vote");
        _;
    }
    
    modifier hasNotVoted() {
        require(!hasVoted[msg.sender], "You have already voted");
        _;
    }
    
    modifier electionActive() {
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Election has not started yet");
        require(block.timestamp <= election.endTime, "Election has ended");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function startElection(
        string memory _title,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyOwner {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime >= block.timestamp, "Start time must be in the future");
        
        election = Election({
            title: _title,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            totalVotes: 0
        });
        
        emit ElectionStarted(_title, _startTime, _endTime);
    }
    
    function addCandidate(
        string memory _name,
        string memory _position
    ) public onlyOwner {
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            position: _position,
            voteCount: 0,
            exists: true
        });
        
        emit CandidateAdded(candidateCount, _name, _position);
    }
    
    function authorizeVoter(address _voter) public onlyOwner {
        require(!authorizedVoters[_voter], "Voter already authorized");
        authorizedVoters[_voter] = true;
        voterCount++;
        
        emit VoterAuthorized(_voter);
    }
    
    function vote(uint256 _candidateId) public onlyAuthorizedVoter hasNotVoted electionActive {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        
        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        election.totalVotes++;
        
        emit VoteCast(msg.sender, _candidateId);
    }
    
    function endElection() public onlyOwner {
        require(election.isActive, "Election is not active");
        election.isActive = false;
        
        emit ElectionEnded(election.title, election.totalVotes);
    }
    
    function getCandidate(uint256 _candidateId) public view returns (
        uint256 id,
        string memory name,
        string memory position,
        uint256 voteCount
    ) {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.position, candidate.voteCount);
    }
    
    function getAllCandidates() public view returns (
        uint256[] memory ids,
        string[] memory names,
        string[] memory positions,
        uint256[] memory voteCounts
    ) {
        ids = new uint256[](candidateCount);
        names = new string[](candidateCount);
        positions = new string[](candidateCount);
        voteCounts = new uint256[](candidateCount);
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].exists) {
                ids[i-1] = candidates[i].id;
                names[i-1] = candidates[i].name;
                positions[i-1] = candidates[i].position;
                voteCounts[i-1] = candidates[i].voteCount;
            }
        }
        
        return (ids, names, positions, voteCounts);
    }
    
    function getElectionInfo() public view returns (
        string memory title,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 totalVotes,
        uint256 totalCandidates,
        uint256 totalVoters
    ) {
        return (
            election.title,
            election.startTime,
            election.endTime,
            election.isActive,
            election.totalVotes,
            candidateCount,
            voterCount
        );
    }
    
    function isVoterAuthorized(address _voter) public view returns (bool) {
        return authorizedVoters[_voter];
    }
    
    function hasVoterVoted(address _voter) public view returns (bool) {
        return hasVoted[_voter];
    }
}
