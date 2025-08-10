-- RSU E-Voting System Initial Data
-- This script populates the database with initial reference data

USE rsu_evoting;

-- Insert departments
INSERT IGNORE INTO departments (name, code, description) VALUES
('Computer Science', 'CSC', 'Department of Computer Science'),
('Mathematics', 'MTH', 'Department of Mathematics'),
('Physics', 'PHY', 'Department of Physics'),
('Chemistry', 'CHM', 'Department of Chemistry'),
('Biology', 'BIO', 'Department of Biology'),
('Statistics', 'STA', 'Department of Statistics');

-- Insert academic levels
INSERT IGNORE INTO academic_levels (level_name, level_code, description) VALUES
('100 Level', '100L', 'First Year Students'),
('200 Level', '200L', 'Second Year Students'),
('300 Level', '300L', 'Third Year Students'),
('400 Level', '400L', 'Final Year Students'),
('500 Level', '500L', 'Fifth Year Students (Medicine/Engineering)'),
('600 Level', '600L', 'Sixth Year Students (Medicine)'),
('700 Level', '700L', 'Seventh Year Students (Medicine)');

-- Insert election types
INSERT IGNORE INTO election_types (type_name, description) VALUES
('General Election', 'University-wide elections for student union positions'),
('Departmental Election', 'Department-specific elections for departmental positions'),
('Level Election', 'Level-specific elections for class representatives'),
('Faculty Election', 'Faculty-wide elections for faculty positions');

-- Insert common positions
INSERT IGNORE INTO positions (title, description, is_department_specific, is_level_specific, max_candidates) VALUES
-- General University Positions
('Student Union President', 'President of the entire student union body', FALSE, FALSE, 5),
('Student Union Vice President', 'Vice President of the student union', FALSE, FALSE, 5),
('Student Union Secretary', 'Secretary of the student union', FALSE, FALSE, 5),
('Student Union Treasurer', 'Treasurer of the student union', FALSE, FALSE, 5),
('Student Union PRO', 'Public Relations Officer of the student union', FALSE, FALSE, 5),

-- Departmental Positions (Computer Science)
('Departmental President', 'President of the Computer Science Students Association', TRUE, FALSE, 3),
('Departmental Vice President', 'Vice President of the departmental association', TRUE, FALSE, 3),
('Departmental Secretary', 'Secretary of the departmental association', TRUE, FALSE, 3),
('Departmental Treasurer', 'Treasurer of the departmental association', TRUE, FALSE, 3),
('Departmental PRO', 'Public Relations Officer of the department', TRUE, FALSE, 3),

-- Level-specific Positions
('Class Governor', 'Governor of the class (level representative)', FALSE, TRUE, 3),
('Class Deputy Governor', 'Deputy Governor of the class', FALSE, TRUE, 3),
('Class Secretary', 'Secretary of the class', FALSE, TRUE, 3),
('Class Treasurer', 'Treasurer of the class', FALSE, TRUE, 3),
('Class PRO', 'Public Relations Officer of the class', FALSE, TRUE, 3);

-- Insert system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'RSU E-Voting System', 'string', 'Name of the voting system', TRUE),
('site_description', 'Secure blockchain-based e-voting system for RSU Computer Science Department', 'string', 'Description of the system', TRUE),
('max_login_attempts', '5', 'number', 'Maximum login attempts before account lockout', FALSE),
('lockout_duration', '30', 'number', 'Account lockout duration in minutes', FALSE),
('session_timeout', '120', 'number', 'Session timeout in minutes', FALSE),
('voting_reminder_hours', '24', 'number', 'Hours before election end to send voting reminders', FALSE),
('min_password_length', '8', 'number', 'Minimum password length requirement', FALSE),
('require_email_verification', 'true', 'boolean', 'Whether email verification is required', FALSE),
('allow_candidate_self_registration', 'false', 'boolean', 'Whether candidates can register themselves', FALSE),
('blockchain_network_id', '1337', 'number', 'Blockchain network ID (Hardhat local)', FALSE),
('gas_price', '20000000000', 'number', 'Default gas price for transactions (20 gwei)', FALSE),
('contract_deployment_account', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'string', 'Account used for contract deployment', FALSE);

-- Sample voter data for testing (Computer Science Department)
INSERT IGNORE INTO voters (matric_number, full_name, email, level, department_id, level_id, cgpa, phone, password_hash) VALUES
-- 400 Level Students
('DE.2021/4311', 'John Doe', 'john.doe@student.rsu.edu.ng', '400L', 1, 4, 4.25, '08012345678', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2021/4312', 'Jane Smith', 'jane.smith@student.rsu.edu.ng', '400L', 1, 4, 4.10, '08023456789', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2021/4313', 'Michael Johnson', 'michael.johnson@student.rsu.edu.ng', '400L', 1, 4, 3.95, '08034567890', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),

-- 300 Level Students
('DE.2022/4201', 'Sarah Wilson', 'sarah.wilson@student.rsu.edu.ng', '300L', 1, 3, 4.35, '08045678901', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2022/4202', 'David Brown', 'david.brown@student.rsu.edu.ng', '300L', 1, 3, 3.80, '08056789012', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2022/4203', 'Lisa Davis', 'lisa.davis@student.rsu.edu.ng', '300L', 1, 3, 4.05, '08067890123', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),

-- 200 Level Students
('DE.2023/4101', 'Robert Miller', 'robert.miller@student.rsu.edu.ng', '200L', 1, 2, 3.75, '08078901234', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2023/4102', 'Emily Taylor', 'emily.taylor@student.rsu.edu.ng', '200L', 1, 2, 4.20, '08089012345', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2023/4103', 'James Anderson', 'james.anderson@student.rsu.edu.ng', '200L', 1, 2, 3.90, '08090123456', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),

-- 100 Level Students
('DE.2024/4001', 'Amanda White', 'amanda.white@student.rsu.edu.ng', '100L', 1, 1, 4.00, '08101234567', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2024/4002', 'Christopher Lee', 'christopher.lee@student.rsu.edu.ng', '100L', 1, 1, 3.85, '08112345678', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6'),
('DE.2024/4003', 'Michelle Garcia', 'michelle.garcia@student.rsu.edu.ng', '100L', 1, 1, 4.15, '08123456789', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6');

-- Additional admin users
INSERT IGNORE INTO admins (username, email, password_hash, full_name, role, department_id, phone) VALUES
('super_admin', 'superadmin@rsu.edu.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6', 'Super Administrator', 'super_admin', NULL, '08134567890'),
('cs_admin', 'cs.admin@rsu.edu.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6', 'Computer Science Administrator', 'admin', 1, '08145678901'),
('moderator', 'moderator@rsu.edu.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/uBMI8.H7NdL0A1qC6', 'System Moderator', 'moderator', 1, '08156789012');
