# RSU E-Voting System Database Schema Documentation

## Overview

This document describes the comprehensive database schema for the RSU E-Voting System. The database is designed to support a secure, scalable, and feature-rich blockchain-based voting system for the Rivers State University Computer Science Department.

## Database Structure

### Core Tables

#### 1. **admins**
Stores administrator user accounts with role-based access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique admin identifier |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Admin username |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Admin email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| full_name | VARCHAR(100) | NOT NULL | Admin full name |
| role | ENUM | DEFAULT 'admin' | Role: super_admin, admin, moderator |
| department_id | INT | FOREIGN KEY | Associated department |
| phone | VARCHAR(15) | | Phone number |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| last_login | TIMESTAMP | NULL | Last login time |
| login_attempts | INT | DEFAULT 0 | Failed login attempts |
| locked_until | TIMESTAMP | NULL | Account lock expiry |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

#### 2. **voters**
Stores student voter information with blockchain integration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique voter identifier |
| matric_number | VARCHAR(20) | UNIQUE, NOT NULL | Student matriculation number |
| full_name | VARCHAR(100) | NOT NULL | Student full name |
| email | VARCHAR(100) | | Student email address |
| level | VARCHAR(10) | NOT NULL | Academic level (100L, 200L, etc.) |
| department_id | INT | FOREIGN KEY | Department reference |
| level_id | INT | FOREIGN KEY | Academic level reference |
| cgpa | DECIMAL(3,2) | | Cumulative Grade Point Average |
| phone | VARCHAR(15) | | Phone number |
| password_hash | VARCHAR(255) | | Hashed password for login |
| blockchain_address | VARCHAR(42) | | Ethereum wallet address |
| private_key_shown | BOOLEAN | DEFAULT FALSE | Whether private key was displayed |
| has_voted | BOOLEAN | DEFAULT FALSE | Voting status flag |
| last_login | TIMESTAMP | NULL | Last login time |
| login_attempts | INT | DEFAULT 0 | Failed login attempts |
| locked_until | TIMESTAMP | NULL | Account lock expiry |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

#### 3. **elections**
Manages election configurations and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique election identifier |
| title | VARCHAR(200) | NOT NULL | Election title |
| description | TEXT | | Election description |
| election_type_id | INT | FOREIGN KEY | Type of election |
| department_id | INT | FOREIGN KEY | Department scope (if applicable) |
| level_id | INT | FOREIGN KEY | Level scope (if applicable) |
| start_date | DATETIME | NOT NULL | Election start time |
| end_date | DATETIME | NOT NULL | Election end time |
| created_by | INT | FOREIGN KEY | Creating admin |
| contract_address | VARCHAR(42) | | Smart contract address |
| max_voters | INT | | Maximum allowed voters |
| total_votes | INT | DEFAULT 0 | Total votes cast |
| is_active | BOOLEAN | DEFAULT FALSE | Active status |
| status | ENUM | DEFAULT 'draft' | Election status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

#### 4. **candidates**
Stores candidate information for elections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique candidate identifier |
| election_id | INT | FOREIGN KEY, NOT NULL | Associated election |
| position_id | INT | FOREIGN KEY | Position being contested |
| name | VARCHAR(100) | NOT NULL | Candidate name |
| matric_number | VARCHAR(20) | UNIQUE, NOT NULL | Candidate matric number |
| department_id | INT | FOREIGN KEY | Candidate department |
| level_id | INT | FOREIGN KEY | Candidate academic level |
| bio | TEXT | | Candidate biography |
| manifesto | TEXT | | Campaign manifesto |
| photo_url | VARCHAR(255) | | Profile photo URL |
| is_approved | BOOLEAN | DEFAULT FALSE | Approval status |
| approved_by | INT | FOREIGN KEY | Approving admin |
| approved_at | TIMESTAMP | NULL | Approval time |
| vote_count | INT | DEFAULT 0 | Current vote count |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

#### 5. **votes**
Tracks vote records with blockchain transaction references.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique vote identifier |
| voter_id | INT | FOREIGN KEY, NOT NULL | Voting student |
| election_id | INT | FOREIGN KEY, NOT NULL | Election reference |
| position_id | INT | FOREIGN KEY | Position voted for |
| candidate_id | INT | FOREIGN KEY | Candidate voted for |
| transaction_hash | VARCHAR(66) | NOT NULL | Blockchain transaction hash |
| block_number | BIGINT | | Block number containing transaction |
| gas_used | BIGINT | | Gas consumed by transaction |
| transaction_fee | DECIMAL(20,8) | | Transaction fee paid |
| voted_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Vote timestamp |

### Reference Tables

#### 6. **departments**
Academic departments within the university.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique department identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Department name |
| code | VARCHAR(10) | UNIQUE, NOT NULL | Department code |
| description | TEXT | | Department description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

#### 7. **academic_levels**
Academic year levels (100L, 200L, etc.).

#### 8. **positions**
Contestable positions in elections.

#### 9. **election_types**
Types of elections (General, Departmental, Level-based).

### Security & Session Management

#### 10. **voter_sessions**
Active voter session tracking for security.

#### 11. **admin_sessions**
Active admin session tracking.

#### 12. **password_reset_tokens**
Password reset token management.

### Blockchain Integration

#### 13. **blockchain_transactions**
Comprehensive blockchain transaction tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique transaction identifier |
| transaction_hash | VARCHAR(66) | UNIQUE, NOT NULL | Blockchain transaction hash |
| block_number | BIGINT | | Block number |
| transaction_type | ENUM | NOT NULL | Type of transaction |
| from_address | VARCHAR(42) | NOT NULL | Sender address |
| to_address | VARCHAR(42) | | Recipient address |
| gas_used | BIGINT | | Gas consumed |
| gas_price | BIGINT | | Gas price |
| transaction_fee | DECIMAL(20,8) | | Total transaction fee |
| status | ENUM | DEFAULT 'pending' | Transaction status |
| election_id | INT | FOREIGN KEY | Associated election |
| voter_id | INT | FOREIGN KEY | Associated voter |
| candidate_id | INT | FOREIGN KEY | Associated candidate |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| confirmed_at | TIMESTAMP | NULL | Confirmation time |

### Performance & Analytics

#### 14. **election_results**
Cached election results for performance.

#### 15. **audit_logs**
Comprehensive system activity logging.

#### 16. **system_settings**
Configurable system parameters.

## Key Features

### 1. **Data Integrity**
- Foreign key constraints ensure referential integrity
- Triggers validate data formats (matriculation numbers, CGPA ranges)
- Check constraints ensure logical data relationships

### 2. **Security**
- Password hashing with bcrypt
- Session management with automatic cleanup
- Account lockout after failed login attempts
- Comprehensive audit logging

### 3. **Performance**
- Strategic indexing on frequently queried columns
- Cached election results for fast retrieval
- Event scheduler for automatic cleanup tasks

### 4. **Blockchain Integration**
- Ethereum wallet address storage for voters
- Transaction hash tracking for vote verification
- Gas usage and fee tracking for cost analysis

### 5. **Flexible Election Management**
- Support for different election types and scopes
- Department and level-specific elections
- Position-based voting with multiple candidates

### 6. **Academic Integration**
- Department and level-based organization
- CGPA tracking for eligibility requirements
- Matriculation number validation

## Database Constraints

### Triggers
- **Election Date Validation**: Ensures end date is after start date
- **CGPA Validation**: Ensures CGPA is between 0.00 and 5.00
- **Matriculation Format**: Validates format as XX.YYYY/NNNN
- **Vote Count Updates**: Auto-updates vote counts when votes are cast

### Events (Scheduled Tasks)
- **Session Cleanup**: Expires inactive sessions every hour
- **Audit Log Cleanup**: Removes old audit logs (6+ months) daily

### Indexes
Comprehensive indexing strategy for optimal query performance:
- Composite indexes on frequently joined columns
- Unique indexes on business keys
- Performance indexes on search and filter columns

## Sample Data

The database includes sample data for testing:
- 4 admin users with different roles
- 12 student voters across different levels
- 6 academic departments
- 7 academic levels (100L-700L)
- 4 election types
- 15 common positions for elections
- System configuration settings

## Usage Guidelines

### 1. **Adding New Voters**
```sql
INSERT INTO voters (matric_number, full_name, email, level, department_id, level_id, cgpa)
VALUES ('DE.2024/4004', 'New Student', 'new.student@rsu.edu.ng', '100L', 1, 1, 3.50);
```

### 2. **Creating Elections**
```sql
INSERT INTO elections (title, description, election_type_id, start_date, end_date, created_by)
VALUES ('Student Union Election 2024', 'Annual student union elections', 1, '2024-03-01 08:00:00', '2024-03-03 18:00:00', 1);
```

### 3. **Viewing Election Results**
```sql
SELECT c.name, c.vote_count, p.title as position
FROM candidates c
JOIN positions p ON c.position_id = p.id
WHERE c.election_id = 1
ORDER BY p.title, c.vote_count DESC;
```

## Backup and Maintenance

### Recommended Maintenance
1. **Daily**: Monitor active sessions and transaction logs
2. **Weekly**: Review audit logs for security events
3. **Monthly**: Analyze performance metrics and optimize queries
4. **Quarterly**: Review and archive old election data

### Backup Strategy
- **Full backup**: Daily
- **Incremental backup**: Every 6 hours
- **Transaction log backup**: Every 15 minutes
- **Test restoration**: Weekly

## Security Considerations

1. **Data Encryption**: Sensitive data should be encrypted at rest
2. **Access Control**: Role-based permissions for different admin levels
3. **Audit Trail**: All actions are logged with user identification
4. **Session Security**: Automatic session expiry and secure tokens
5. **Input Validation**: Database triggers validate critical data formats
