-- RSU E-Voting System Indexes and Additional Constraints
-- This script creates additional indexes for performance optimization and data integrity

USE rsu_evoting;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_voters_department_level ON voters(department_id, level_id);
CREATE INDEX IF NOT EXISTS idx_voters_email ON voters(email);
CREATE INDEX IF NOT EXISTS idx_voters_phone ON voters(phone);
CREATE INDEX IF NOT EXISTS idx_voters_cgpa ON voters(cgpa);
CREATE INDEX IF NOT EXISTS idx_voters_last_login ON voters(last_login);
CREATE INDEX IF NOT EXISTS idx_voters_blockchain_address ON voters(blockchain_address);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_department_level ON candidates(department_id, level_id);
CREATE INDEX IF NOT EXISTS idx_candidates_approved ON candidates(is_approved);
CREATE INDEX IF NOT EXISTS idx_candidates_vote_count ON candidates(vote_count);

CREATE INDEX IF NOT EXISTS idx_elections_type ON elections(election_type_id);
CREATE INDEX IF NOT EXISTS idx_elections_department ON elections(department_id);
CREATE INDEX IF NOT EXISTS idx_elections_level ON elections(level_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_active_dates ON elections(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_position ON votes(position_id);
CREATE INDEX IF NOT EXISTS idx_votes_transaction ON votes(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_votes_block_number ON votes(block_number);

CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_level ON positions(level_id);
CREATE INDEX IF NOT EXISTS idx_positions_specific ON positions(is_department_specific, is_level_specific);

CREATE INDEX IF NOT EXISTS idx_voter_sessions_token ON voter_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_voter_sessions_active ON voter_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_voter_sessions_voter ON voter_sessions(voter_id, is_active);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id, is_active);

CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_type ON blockchain_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_election ON blockchain_transactions(election_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_voter ON blockchain_transactions(voter_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_candidate ON blockchain_transactions(candidate_id);

CREATE INDEX IF NOT EXISTS idx_election_results_election_position ON election_results(election_id, position_id);
CREATE INDEX IF NOT EXISTS idx_election_results_candidate ON election_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_election_results_vote_count ON election_results(vote_count);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_type, user_id);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- Additional Constraints and Triggers

-- Ensure election dates are logical
DELIMITER //
CREATE TRIGGER IF NOT EXISTS check_election_dates 
    BEFORE INSERT ON elections 
    FOR EACH ROW 
BEGIN 
    IF NEW.end_date <= NEW.start_date THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Election end date must be after start date'; 
    END IF; 
    IF NEW.start_date <= NOW() THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Election start date must be in the future'; 
    END IF; 
END//

CREATE TRIGGER IF NOT EXISTS check_election_dates_update 
    BEFORE UPDATE ON elections 
    FOR EACH ROW 
BEGIN 
    IF NEW.end_date <= NEW.start_date THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Election end date must be after start date'; 
    END IF; 
END//
DELIMITER ;

-- Ensure CGPA is within valid range
DELIMITER //
CREATE TRIGGER IF NOT EXISTS check_voter_cgpa 
    BEFORE INSERT ON voters 
    FOR EACH ROW 
BEGIN 
    IF NEW.cgpa IS NOT NULL AND (NEW.cgpa < 0.00 OR NEW.cgpa > 5.00) THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CGPA must be between 0.00 and 5.00'; 
    END IF; 
END//

CREATE TRIGGER IF NOT EXISTS check_voter_cgpa_update 
    BEFORE UPDATE ON voters 
    FOR EACH ROW 
BEGIN 
    IF NEW.cgpa IS NOT NULL AND (NEW.cgpa < 0.00 OR NEW.cgpa > 5.00) THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CGPA must be between 0.00 and 5.00'; 
    END IF; 
END//
DELIMITER ;

-- Ensure matriculation number format
DELIMITER //
CREATE TRIGGER IF NOT EXISTS check_matric_format 
    BEFORE INSERT ON voters 
    FOR EACH ROW 
BEGIN 
    IF NEW.matric_number NOT REGEXP '^[A-Z]{2}\.[0-9]{4}/[0-9]{4}$' THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid matriculation number format. Expected: XX.YYYY/NNNN'; 
    END IF; 
END//

CREATE TRIGGER IF NOT EXISTS check_matric_format_update 
    BEFORE UPDATE ON voters 
    FOR EACH ROW 
BEGIN 
    IF NEW.matric_number NOT REGEXP '^[A-Z]{2}\.[0-9]{4}/[0-9]{4}$' THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid matriculation number format. Expected: XX.YYYY/NNNN'; 
    END IF; 
END//

CREATE TRIGGER IF NOT EXISTS check_candidate_matric_format 
    BEFORE INSERT ON candidates 
    FOR EACH ROW 
BEGIN 
    IF NEW.matric_number NOT REGEXP '^[A-Z]{2}\.[0-9]{4}/[0-9]{4}$' THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid matriculation number format. Expected: XX.YYYY/NNNN'; 
    END IF; 
END//

CREATE TRIGGER IF NOT EXISTS check_candidate_matric_format_update 
    BEFORE UPDATE ON candidates 
    FOR EACH ROW 
BEGIN 
    IF NEW.matric_number NOT REGEXP '^[A-Z]{2}\.[0-9]{4}/[0-9]{4}$' THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid matriculation number format. Expected: XX.YYYY/NNNN'; 
    END IF; 
END//
DELIMITER ;

-- Auto-update election total votes when votes are cast
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_election_vote_count 
    AFTER INSERT ON votes 
    FOR EACH ROW 
BEGIN 
    UPDATE elections 
    SET total_votes = total_votes + 1 
    WHERE id = NEW.election_id; 
END//

CREATE TRIGGER IF NOT EXISTS update_candidate_vote_count 
    AFTER INSERT ON votes 
    FOR EACH ROW 
BEGIN 
    UPDATE candidates 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.candidate_id; 
    
    -- Also update the election results cache
    INSERT INTO election_results (election_id, position_id, candidate_id, vote_count)
    VALUES (NEW.election_id, NEW.position_id, NEW.candidate_id, 1)
    ON DUPLICATE KEY UPDATE vote_count = vote_count + 1;
END//
DELIMITER ;

-- Clean up expired sessions
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    -- Cleanup expired voter sessions (older than 2 hours of inactivity)
    UPDATE voter_sessions 
    SET is_active = FALSE, logout_at = NOW() 
    WHERE is_active = TRUE 
    AND last_activity < DATE_SUB(NOW(), INTERVAL 2 HOUR);
    
    -- Cleanup expired admin sessions (older than 4 hours of inactivity)
    UPDATE admin_sessions 
    SET is_active = FALSE, logout_at = NOW() 
    WHERE is_active = TRUE 
    AND last_activity < DATE_SUB(NOW(), INTERVAL 4 HOUR);
    
    -- Cleanup expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW();
END//
DELIMITER ;

-- Clean up old audit logs (keep only last 6 months)
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_old_audit_logs
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
END//
DELIMITER ;

-- Enable the event scheduler
SET GLOBAL event_scheduler = ON;
