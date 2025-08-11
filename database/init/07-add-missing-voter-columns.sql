-- Add missing voter columns required by backend models
USE rsu_evoting;

-- Name fields
ALTER TABLE voters ADD COLUMN first_name VARCHAR(100) NULL AFTER matric_number;
ALTER TABLE voters ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name;

-- Authorization and wallet flags
ALTER TABLE voters ADD COLUMN is_authorized TINYINT(1) DEFAULT 0 AFTER blockchain_address;
ALTER TABLE voters ADD COLUMN has_generated_wallet TINYINT(1) DEFAULT 0 AFTER is_authorized;

-- Auth state tracking
ALTER TABLE voters ADD COLUMN login_attempts INT DEFAULT 0 AFTER has_generated_wallet;
ALTER TABLE voters ADD COLUMN locked_until DATETIME NULL AFTER login_attempts;
ALTER TABLE voters ADD COLUMN last_login DATETIME NULL AFTER updated_at;


