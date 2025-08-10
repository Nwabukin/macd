const { executeQuery, executeTransaction } = require('../config/database');
const { hashPassword, verifyPassword } = require('../middleware/auth');
const { generateWallet } = require('../config/blockchain');

class Voter {
  constructor(data) {
    this.id = data.id;
    this.matricNumber = data.matric_number;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.email = data.email;
    this.departmentId = data.department_id;
    this.levelId = data.level_id;
    this.cgpa = data.cgpa;
    this.phone = data.phone;
    this.blockchainAddress = data.blockchain_address;
    this.isAuthorized = data.is_authorized;
    this.hasGeneratedWallet = data.has_generated_wallet;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;
    this.loginAttempts = data.login_attempts;
    this.lockedUntil = data.locked_until;
  }

  // Create new voter
  static async create(voterData) {
    try {
      const query = `
        INSERT INTO voters (
          matric_number, first_name, last_name, email, 
          department_id, level_id, cgpa, phone, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        voterData.matricNumber,
        voterData.firstName,
        voterData.lastName,
        voterData.email,
        voterData.departmentId,
        voterData.levelId,
        voterData.cgpa || null,
        voterData.phone || null
      ];
      
      const result = await executeQuery(query, params);
      
      if (result.success) {
        return {
          success: true,
          voterId: result.data.insertId,
          message: 'Voter created successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find voter by matriculation number
  static async findByMatricNumber(matricNumber) {
    try {
      const query = `
        SELECT v.*, d.name as department_name, al.level_name
        FROM voters v
        LEFT JOIN departments d ON v.department_id = d.id
        LEFT JOIN academic_levels al ON v.level_id = al.id
        WHERE v.matric_number = ?
      `;
      const result = await executeQuery(query, [matricNumber]);
      
      if (result.success && result.data.length > 0) {
        return {
          success: true,
          voter: new Voter(result.data[0])
        };
      }
      
      return {
        success: false,
        message: 'Voter not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find voter by ID
  static async findById(id) {
    try {
      const query = `
        SELECT v.*, d.name as department_name, al.level_name
        FROM voters v
        LEFT JOIN departments d ON v.department_id = d.id
        LEFT JOIN academic_levels al ON v.level_id = al.id
        WHERE v.id = ?
      `;
      const result = await executeQuery(query, [id]);
      
      if (result.success && result.data.length > 0) {
        return {
          success: true,
          voter: new Voter(result.data[0])
        };
      }
      
      return {
        success: false,
        message: 'Voter not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find voter by blockchain address
  static async findByBlockchainAddress(address) {
    try {
      const query = 'SELECT * FROM voters WHERE blockchain_address = ?';
      const result = await executeQuery(query, [address]);
      
      if (result.success && result.data.length > 0) {
        return {
          success: true,
          voter: new Voter(result.data[0])
        };
      }
      
      return {
        success: false,
        message: 'Voter not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set initial password and generate wallet
  async setInitialPassword(password) {
    try {
      // Generate blockchain wallet
      const wallet = generateWallet();
      const hashedPassword = await hashPassword(password);
      
      const query = `
        UPDATE voters 
        SET password_hash = ?, blockchain_address = ?, has_generated_wallet = 1, updated_at = NOW()
        WHERE id = ?
      `;
      
      const result = await executeQuery(query, [hashedPassword, wallet.address, this.id]);
      
      if (result.success) {
        this.blockchainAddress = wallet.address;
        this.hasGeneratedWallet = true;
        
        return {
          success: true,
          wallet: {
            address: wallet.address,
            privateKey: wallet.privateKey
          },
          message: 'Password set and wallet generated successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Authenticate voter
  static async authenticate(matricNumber, password) {
    try {
      const query = 'SELECT * FROM voters WHERE matric_number = ?';
      const result = await executeQuery(query, [matricNumber]);
      
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      const voter = result.data[0];
      
      // Check if account is locked
      if (voter.locked_until && new Date(voter.locked_until) > new Date()) {
        return {
          success: false,
          message: 'Account is temporarily locked',
          lockedUntil: voter.locked_until
        };
      }
      
      // Check if password is set
      if (!voter.password_hash) {
        return {
          success: false,
          message: 'Password not set',
          requiresSetup: true
        };
      }
      
      const isValidPassword = await verifyPassword(password, voter.password_hash);
      
      if (!isValidPassword) {
        // Increment login attempts
        await executeQuery(
          'UPDATE voters SET login_attempts = login_attempts + 1 WHERE id = ?',
          [voter.id]
        );
        
        // Lock account after 5 failed attempts
        if (voter.login_attempts >= 4) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await executeQuery(
            'UPDATE voters SET locked_until = ? WHERE id = ?',
            [lockUntil, voter.id]
          );
        }
        
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      // Reset login attempts and update last login
      await executeQuery(
        'UPDATE voters SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
        [voter.id]
      );
      
      return {
        success: true,
        voter: new Voter(voter)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all voters with pagination
  static async getAll(page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', filters = {}) {
    try {
      const offset = (page - 1) * limit;
      
      // Build where conditions
      const whereConditions = ['1 = 1'];
      const whereParams = [];
      
      if (filters.departmentId) {
        whereConditions.push('v.department_id = ?');
        whereParams.push(filters.departmentId);
      }
      
      if (filters.levelId) {
        whereConditions.push('v.level_id = ?');
        whereParams.push(filters.levelId);
      }
      
      if (filters.isAuthorized !== undefined) {
        whereConditions.push('v.is_authorized = ?');
        whereParams.push(filters.isAuthorized);
      }
      
      if (filters.hasGeneratedWallet !== undefined) {
        whereConditions.push('v.has_generated_wallet = ?');
        whereParams.push(filters.hasGeneratedWallet);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Count total voters
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM voters v
        WHERE ${whereClause}
      `;
      const countResult = await executeQuery(countQuery, whereParams);
      
      if (!countResult.success) {
        return countResult;
      }
      
      const total = countResult.data[0].total;
      
      // Get voters
      const query = `
        SELECT v.*, d.name as department_name, al.level_name
        FROM voters v
        LEFT JOIN departments d ON v.department_id = d.id
        LEFT JOIN academic_levels al ON v.level_id = al.id
        WHERE ${whereClause}
        ORDER BY v.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const result = await executeQuery(query, [...whereParams, limit, offset]);
      
      if (result.success) {
        return {
          success: true,
          voters: result.data.map(voter => new Voter(voter)),
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_records: total,
            per_page: limit
          }
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Authorize voter
  async authorize() {
    try {
      const query = 'UPDATE voters SET is_authorized = 1, updated_at = NOW() WHERE id = ?';
      const result = await executeQuery(query, [this.id]);
      
      if (result.success) {
        this.isAuthorized = true;
        return {
          success: true,
          message: 'Voter authorized successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Deauthorize voter
  async deauthorize() {
    try {
      const query = 'UPDATE voters SET is_authorized = 0, updated_at = NOW() WHERE id = ?';
      const result = await executeQuery(query, [this.id]);
      
      if (result.success) {
        this.isAuthorized = false;
        return {
          success: true,
          message: 'Voter deauthorized successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Bulk authorize voters
  static async bulkAuthorize(voterIds) {
    try {
      if (!Array.isArray(voterIds) || voterIds.length === 0) {
        return {
          success: false,
          message: 'No voter IDs provided'
        };
      }
      
      const placeholders = voterIds.map(() => '?').join(',');
      const query = `UPDATE voters SET is_authorized = 1, updated_at = NOW() WHERE id IN (${placeholders})`;
      
      const result = await executeQuery(query, voterIds);
      
      if (result.success) {
        return {
          success: true,
          authorizedCount: result.data.affectedRows,
          message: `${result.data.affectedRows} voters authorized successfully`
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get voter voting history
  async getVotingHistory() {
    try {
      const query = `
        SELECT 
          bt.transaction_hash,
          bt.block_number,
          bt.gas_used,
          bt.transaction_type,
          bt.status,
          bt.created_at,
          e.title as election_title,
          p.title as position_title,
          c.name as candidate_name
        FROM blockchain_transactions bt
        LEFT JOIN elections e ON bt.election_id = e.id
        LEFT JOIN candidates c ON bt.candidate_id = c.id
        LEFT JOIN election_positions ep ON c.position_id = ep.id
        LEFT JOIN positions p ON ep.position_id = p.id
        WHERE bt.voter_address = ?
        ORDER BY bt.created_at DESC
      `;
      
      const result = await executeQuery(query, [this.blockchainAddress]);
      
      if (result.success) {
        return {
          success: true,
          votingHistory: result.data
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update voter profile
  async update(updateData) {
    try {
      const fields = [];
      const params = [];
      
      if (updateData.firstName) {
        fields.push('first_name = ?');
        params.push(updateData.firstName);
      }
      
      if (updateData.lastName) {
        fields.push('last_name = ?');
        params.push(updateData.lastName);
      }
      
      if (updateData.email) {
        fields.push('email = ?');
        params.push(updateData.email);
      }
      
      if (updateData.phone) {
        fields.push('phone = ?');
        params.push(updateData.phone);
      }
      
      if (updateData.cgpa) {
        fields.push('cgpa = ?');
        params.push(updateData.cgpa);
      }
      
      if (fields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }
      
      fields.push('updated_at = NOW()');
      params.push(this.id);
      
      const query = `UPDATE voters SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      
      if (result.success) {
        return {
          success: true,
          message: 'Voter profile updated successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Search voters
  static async search(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;
      
      // Count search results
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM voters v
        WHERE v.first_name LIKE ? OR v.last_name LIKE ? OR v.matric_number LIKE ? OR v.email LIKE ?
      `;
      const countResult = await executeQuery(countQuery, [searchPattern, searchPattern, searchPattern, searchPattern]);
      
      if (!countResult.success) {
        return countResult;
      }
      
      const total = countResult.data[0].total;
      
      // Search voters
      const query = `
        SELECT v.*, d.name as department_name, al.level_name
        FROM voters v
        LEFT JOIN departments d ON v.department_id = d.id
        LEFT JOIN academic_levels al ON v.level_id = al.id
        WHERE v.first_name LIKE ? OR v.last_name LIKE ? OR v.matric_number LIKE ? OR v.email LIKE ?
        ORDER BY v.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await executeQuery(query, [searchPattern, searchPattern, searchPattern, searchPattern, limit, offset]);
      
      if (result.success) {
        return {
          success: true,
          voters: result.data.map(voter => new Voter(voter)),
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_records: total,
            per_page: limit
          }
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get voter stats
  static async getStats() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM voters',
        'SELECT COUNT(*) as authorized FROM voters WHERE is_authorized = 1',
        'SELECT COUNT(*) as with_wallet FROM voters WHERE has_generated_wallet = 1',
        'SELECT COUNT(*) as active_today FROM voters WHERE DATE(last_login) = CURDATE()',
        'SELECT d.name as department, COUNT(*) as count FROM voters v JOIN departments d ON v.department_id = d.id GROUP BY d.id',
        'SELECT al.level_name, COUNT(*) as count FROM voters v JOIN academic_levels al ON v.level_id = al.id GROUP BY al.id'
      ];
      
      const results = await Promise.all(
        queries.map(query => executeQuery(query))
      );
      
      if (results.every(result => result.success)) {
        return {
          success: true,
          stats: {
            total_voters: results[0].data[0].total,
            authorized_voters: results[1].data[0].authorized,
            voters_with_wallet: results[2].data[0].with_wallet,
            active_today: results[3].data[0].active_today,
            by_department: results[4].data,
            by_level: results[5].data
          }
        };
      }
      
      return {
        success: false,
        message: 'Failed to get voter stats'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Convert to JSON (excluding sensitive data)
  toJSON() {
    return {
      id: this.id,
      matricNumber: this.matricNumber,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      departmentId: this.departmentId,
      levelId: this.levelId,
      cgpa: this.cgpa,
      phone: this.phone,
      blockchainAddress: this.blockchainAddress,
      isAuthorized: this.isAuthorized,
      hasGeneratedWallet: this.hasGeneratedWallet,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }
}

module.exports = Voter;
