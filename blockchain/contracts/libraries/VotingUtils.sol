// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VotingUtils
 * @dev Library for voting-related utility functions
 */
library VotingUtils {
    // Constants
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_HOUR = 3600;
    uint256 public constant SECONDS_PER_MINUTE = 60;

    /**
     * @dev Validate matriculation number format (DE.YYYY/NNNN)
     */
    function isValidMatricNumber(string memory _matricNumber) internal pure returns (bool) {
        bytes memory matricBytes = bytes(_matricNumber);
        
        // Check minimum length (DE.2020/1234 = 11 characters)
        if (matricBytes.length < 11 || matricBytes.length > 15) {
            return false;
        }
        
        // Check format: XX.YYYY/NNNN
        // First two characters should be letters
        if (!isLetter(matricBytes[0]) || !isLetter(matricBytes[1])) {
            return false;
        }
        
        // Third character should be dot
        if (matricBytes[2] != 0x2E) { // 0x2E is '.'
            return false;
        }
        
        // Characters 3-6 should be digits (year)
        for (uint256 i = 3; i < 7; i++) {
            if (!isDigit(matricBytes[i])) {
                return false;
            }
        }
        
        // 7th character should be forward slash
        if (matricBytes[7] != 0x2F) { // 0x2F is '/'
            return false;
        }
        
        // Remaining characters should be digits
        for (uint256 i = 8; i < matricBytes.length; i++) {
            if (!isDigit(matricBytes[i])) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Check if character is a letter (A-Z or a-z)
     */
    function isLetter(bytes1 _char) internal pure returns (bool) {
        return (_char >= 0x41 && _char <= 0x5A) || (_char >= 0x61 && _char <= 0x7A);
    }

    /**
     * @dev Check if character is a digit (0-9)
     */
    function isDigit(bytes1 _char) internal pure returns (bool) {
        return _char >= 0x30 && _char <= 0x39;
    }

    /**
     * @dev Calculate time remaining until election starts
     */
    function timeUntilStart(uint256 _startTime) internal view returns (uint256) {
        if (block.timestamp >= _startTime) {
            return 0;
        }
        return _startTime - block.timestamp;
    }

    /**
     * @dev Calculate time remaining until election ends
     */
    function timeUntilEnd(uint256 _endTime) internal view returns (uint256) {
        if (block.timestamp >= _endTime) {
            return 0;
        }
        return _endTime - block.timestamp;
    }

    /**
     * @dev Check if election is currently active
     */
    function isElectionActive(uint256 _startTime, uint256 _endTime) internal view returns (bool) {
        return block.timestamp >= _startTime && block.timestamp <= _endTime;
    }

    /**
     * @dev Calculate election duration in days
     */
    function getElectionDurationInDays(uint256 _startTime, uint256 _endTime) internal pure returns (uint256) {
        require(_endTime > _startTime, "Invalid time range");
        return (_endTime - _startTime) / SECONDS_PER_DAY;
    }

    /**
     * @dev Format timestamp to human readable string (simplified)
     */
    function formatTimestamp(uint256 _timestamp) internal pure returns (string memory) {
        // Simplified implementation - in practice, you might use a more sophisticated library
        return string(abi.encodePacked("Timestamp: ", uintToString(_timestamp)));
    }

    /**
     * @dev Convert uint to string
     */
    function uintToString(uint256 _value) internal pure returns (string memory) {
        if (_value == 0) {
            return "0";
        }
        
        uint256 temp = _value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (_value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_value % 10)));
            _value /= 10;
        }
        
        return string(buffer);
    }

    /**
     * @dev Validate election time parameters
     */
    function validateElectionTimes(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _minDuration,
        uint256 _maxDuration
    ) internal view returns (bool) {
        // Start time must be in the future
        if (_startTime <= block.timestamp) {
            return false;
        }
        
        // End time must be after start time
        if (_endTime <= _startTime) {
            return false;
        }
        
        // Duration must be within allowed range
        uint256 duration = _endTime - _startTime;
        if (duration < _minDuration || duration > _maxDuration) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev Calculate percentage with precision
     */
    function calculatePercentage(uint256 _numerator, uint256 _denominator, uint256 _precision) internal pure returns (uint256) {
        require(_denominator > 0, "Division by zero");
        return (_numerator * _precision) / _denominator;
    }

    /**
     * @dev Check if string is empty
     */
    function isEmpty(string memory _str) internal pure returns (bool) {
        return bytes(_str).length == 0;
    }

    /**
     * @dev Compare two strings
     */
    function compareStrings(string memory _a, string memory _b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(_a)) == keccak256(abi.encodePacked(_b));
    }

    /**
     * @dev Generate a simple hash for data integrity
     */
    function generateDataHash(
        string memory _data1,
        string memory _data2,
        uint256 _number
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_data1, _data2, _number, block.timestamp));
    }

    /**
     * @dev Validate address is not zero
     */
    function isValidAddress(address _addr) internal pure returns (bool) {
        return _addr != address(0);
    }

    /**
     * @dev Extension function for uint256 using library
     */
    function isEven(uint256 _number) internal pure returns (bool) {
        return _number % 2 == 0;
    }

    /**
     * @dev Extension function for uint256 using library
     */
    function isOdd(uint256 _number) internal pure returns (bool) {
        return _number % 2 == 1;
    }

    /**
     * @dev Safe subtraction that returns 0 if result would be negative
     */
    function safeSub(uint256 _a, uint256 _b) internal pure returns (uint256) {
        if (_b >= _a) {
            return 0;
        }
        return _a - _b;
    }

    /**
     * @dev Calculate compound interest for time-based voting weight (advanced feature)
     */
    function calculateTimeWeight(uint256 _voteTime, uint256 _electionStart, uint256 _electionEnd) internal pure returns (uint256) {
        require(_voteTime >= _electionStart && _voteTime <= _electionEnd, "Invalid vote time");
        
        uint256 electionDuration = _electionEnd - _electionStart;
        uint256 timeFromStart = _voteTime - _electionStart;
        
        // Early votes get slightly higher weight (100% to 110%)
        // This is a simple linear function, can be made more sophisticated
        uint256 weight = 100 + (10 * (electionDuration - timeFromStart)) / electionDuration;
        return weight;
    }

    /**
     * @dev Batch operation utility
     */
    function validateBatchSize(uint256 _batchSize, uint256 _maxBatchSize) internal pure returns (bool) {
        return _batchSize > 0 && _batchSize <= _maxBatchSize;
    }
}
