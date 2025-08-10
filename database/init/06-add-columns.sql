-- Add missing columns to existing tables
USE rsu_evoting;

-- Add columns to voters table
ALTER TABLE voters ADD COLUMN department_id INT AFTER level;
ALTER TABLE voters ADD COLUMN level_id INT AFTER department_id;
ALTER TABLE voters ADD COLUMN cgpa DECIMAL(3,2) AFTER level_id;
ALTER TABLE voters ADD COLUMN phone VARCHAR(15) AFTER email;

-- Add columns to candidates table  
ALTER TABLE candidates ADD COLUMN position_id INT AFTER election_id;
ALTER TABLE candidates ADD COLUMN department_id INT AFTER matric_number;
ALTER TABLE candidates ADD COLUMN level_id INT AFTER department_id;
ALTER TABLE candidates ADD COLUMN is_approved BOOLEAN DEFAULT FALSE AFTER photo_url;
ALTER TABLE candidates ADD COLUMN vote_count INT DEFAULT 0 AFTER is_approved;

-- Add columns to elections table
ALTER TABLE elections ADD COLUMN election_type_id INT AFTER description;
ALTER TABLE elections ADD COLUMN department_id INT AFTER election_type_id;
ALTER TABLE elections ADD COLUMN total_votes INT DEFAULT 0 AFTER contract_address;
ALTER TABLE elections ADD COLUMN status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft' AFTER is_active;

-- Add columns to admins table
ALTER TABLE admins ADD COLUMN role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin' AFTER full_name;
ALTER TABLE admins ADD COLUMN department_id INT AFTER role;
ALTER TABLE admins ADD COLUMN phone VARCHAR(15) AFTER email;

-- Add columns to votes table
ALTER TABLE votes ADD COLUMN candidate_id INT AFTER election_id;

-- Add foreign key constraints
ALTER TABLE voters ADD FOREIGN KEY fk_voters_department (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE voters ADD FOREIGN KEY fk_voters_level (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL;

ALTER TABLE candidates ADD FOREIGN KEY fk_candidates_department (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD FOREIGN KEY fk_candidates_level (level_id) REFERENCES academic_levels(id) ON DELETE SET NULL;

ALTER TABLE elections ADD FOREIGN KEY fk_elections_type (election_type_id) REFERENCES election_types(id) ON DELETE SET NULL;
ALTER TABLE elections ADD FOREIGN KEY fk_elections_department (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE admins ADD FOREIGN KEY fk_admins_department (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE votes ADD FOREIGN KEY fk_votes_candidate (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT;
