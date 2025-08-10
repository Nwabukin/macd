// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVotingEvents
 * @dev Interface for all voting-related events
 */
interface IVotingEvents {
    // Election events
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        uint256 startTime,
        uint256 endTime,
        uint256 electionType
    );
    
    event ElectionStarted(
        uint256 indexed electionId,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event ElectionEnded(
        uint256 indexed electionId,
        string title,
        uint256 totalVotes
    );
    
    event ElectionUpdated(
        uint256 indexed electionId,
        string title,
        uint256 startTime,
        uint256 endTime
    );

    // Position events
    event PositionCreated(
        uint256 indexed positionId,
        string title,
        uint256 maxCandidates
    );
    
    event PositionUpdated(
        uint256 indexed positionId,
        string title,
        uint256 maxCandidates
    );
    
    event PositionDeactivated(
        uint256 indexed positionId
    );

    // Candidate events
    event CandidateAdded(
        uint256 indexed candidateId,
        string name,
        uint256 indexed positionId,
        uint256 indexed electionId
    );
    
    event CandidateApproved(
        uint256 indexed candidateId,
        address indexed approver,
        uint256 timestamp
    );
    
    event CandidateRejected(
        uint256 indexed candidateId,
        address indexed rejector,
        string reason
    );
    
    event CandidateUpdated(
        uint256 indexed candidateId,
        string name,
        string bio
    );

    // Voter events
    event VoterAuthorized(
        address indexed voter,
        string matricNumber
    );
    
    event VoterDeauthorized(
        address indexed voter,
        string reason
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId,
        uint256 indexed positionId,
        uint256 electionId
    );
    
    event VoteUpdated(
        address indexed voter,
        uint256 indexed oldCandidateId,
        uint256 indexed newCandidateId,
        uint256 positionId
    );
    
    event VoterLockedOut(
        address indexed voter,
        uint256 lockoutUntil
    );

    // Admin events
    event AdminAuthorized(
        address indexed admin
    );
    
    event AdminRevoked(
        address indexed admin
    );
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Security events
    event ContractPauseToggled(
        bool paused
    );
    
    event EmergencyPause(
        address indexed admin,
        uint256 timestamp
    );
    
    event SecurityBreach(
        address indexed suspiciousAddress,
        string reason,
        uint256 timestamp
    );
    
    event FailedVoteAttempt(
        address indexed voter,
        uint256 candidateId,
        string reason
    );

    // System events
    event ConfigurationUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue
    );
    
    event BatchVoterAuthorization(
        uint256 count,
        address indexed admin
    );
    
    event ElectionResultsPublished(
        uint256 indexed electionId,
        uint256 timestamp
    );
}
