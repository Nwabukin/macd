-- RSU E-Voting System Enhanced Database Schema
-- This script adds additional tables and functionality for comprehensive e-voting system

USE rsu_evoting;

-- Add departments table for better organization
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add academic levels table
CREATE TABLE IF NOT EXISTS academic_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level_name VARCHAR(20) NOT NULL UNIQUE, -- 100L, 200L, 300L, 400L, 500L, 600L, 700L
    level_code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add positions table for election positions
CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    department_id INT,
    level_id INT,
    max_candidates INT DEFAULT 10,
    is_department_specific BOOLEAN DEFAULT FALSE,
    is_level_specific BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL
);

-- Add election types table
CREATE TABLE IF NOT EXISTS election_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE, -- General, Departmental, Level-based
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add voter eligibility table for complex eligibility rules
CREATE TABLE IF NOT EXISTS voter_eligibility (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    department_id INT,
    level_id INT,
    min_cgpa DECIMAL(3,2),
    additional_requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES academic_levels(id) ON DELETE CASCADE
);

-- Add election positions junction table (many-to-many)
CREATE TABLE IF NOT EXISTS election_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    position_id INT NOT NULL,
    max_votes_per_voter INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_election_position (election_id, position_id)
);

-- Add voter sessions table for security tracking
CREATE TABLE IF NOT EXISTS voter_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE
);

-- Add admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Add blockchain transactions table for comprehensive tracking
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT,
    transaction_type ENUM('deploy_contract', 'add_voter', 'add_candidate', 'cast_vote', 'end_election') NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    gas_used BIGINT,
    gas_price BIGINT,
    transaction_fee DECIMAL(20,8),
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    election_id INT,
    voter_id INT,
    candidate_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE SET NULL,
    FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE SET NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL
);

-- Add election results cache table for performance
CREATE TABLE IF NOT EXISTS election_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    position_id INT NOT NULL,
    candidate_id INT NOT NULL,
    vote_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    UNIQUE KEY unique_election_position_candidate (election_id, position_id, candidate_id)
);

-- Add system settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('admin', 'voter') NOT NULL,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modify existing tables with ALTER statements to add new columns
-- Check and add columns to voters table
SET @sql = '';
SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'department_id';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN department_id INT AFTER level;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'level_id';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN level_id INT AFTER department_id;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'cgpa';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN cgpa DECIMAL(3,2) AFTER level_id;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'phone';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN phone VARCHAR(15) AFTER email;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'last_login';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN last_login TIMESTAMP NULL AFTER private_key_shown;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'login_attempts';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN login_attempts INT DEFAULT 0 AFTER last_login;'); END IF;

SELECT COUNT(*) INTO @count FROM information_schema.columns WHERE table_schema = 'rsu_evoting' AND table_name = 'voters' AND column_name = 'locked_until';
IF @count = 0 THEN SET @sql = CONCAT(@sql, 'ALTER TABLE voters ADD COLUMN locked_until TIMESTAMP NULL AFTER login_attempts;'); END IF;

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add foreign key constraints to voters table
ALTER TABLE voters
ADD CONSTRAINT fk_voters_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_voters_level FOREIGN KEY (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL;

-- Modify candidates table
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS position_id INT AFTER election_id,
ADD COLUMN IF NOT EXISTS department_id INT AFTER matric_number,
ADD COLUMN IF NOT EXISTS level_id INT AFTER department_id,
ADD COLUMN IF NOT EXISTS manifesto TEXT AFTER bio,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE AFTER photo_url,
ADD COLUMN IF NOT EXISTS approved_by INT AFTER is_approved,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0 AFTER approved_at;

-- Add foreign key constraints to candidates table
ALTER TABLE candidates
ADD CONSTRAINT fk_candidates_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_candidates_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_candidates_level FOREIGN KEY (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_candidates_approved_by FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL;

-- Modify elections table
ALTER TABLE elections
ADD COLUMN IF NOT EXISTS election_type_id INT AFTER description,
ADD COLUMN IF NOT EXISTS department_id INT AFTER election_type_id,
ADD COLUMN IF NOT EXISTS level_id INT AFTER department_id,
ADD COLUMN IF NOT EXISTS max_voters INT AFTER contract_address,
ADD COLUMN IF NOT EXISTS total_votes INT DEFAULT 0 AFTER max_voters,
ADD COLUMN IF NOT EXISTS status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft' AFTER is_active;

-- Add foreign key constraints to elections table
ALTER TABLE elections
ADD CONSTRAINT fk_elections_type FOREIGN KEY (election_type_id) REFERENCES election_types(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_elections_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_elections_level FOREIGN KEY (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL;

-- Modify votes table
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS position_id INT AFTER election_id,
ADD COLUMN IF NOT EXISTS candidate_id INT AFTER position_id,
ADD COLUMN IF NOT EXISTS gas_used BIGINT AFTER block_number,
ADD COLUMN IF NOT EXISTS transaction_fee DECIMAL(20,8) AFTER gas_used;

-- Add foreign key constraints to votes table
ALTER TABLE votes
ADD CONSTRAINT fk_votes_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_votes_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT;

-- Modify admins table
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin' AFTER full_name,
ADD COLUMN IF NOT EXISTS department_id INT AFTER role,
ADD COLUMN IF NOT EXISTS phone VARCHAR(15) AFTER email,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL AFTER is_active,
ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0 AFTER last_login,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL AFTER login_attempts;

-- Add foreign key constraint to admins table
ALTER TABLE admins
ADD CONSTRAINT fk_admins_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
