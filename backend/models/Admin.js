const { executeQuery, executeTransaction } = require('../config/database');
const { hashPassword, verifyPassword } = require('../middleware/auth');

class Admin {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.role = data.role;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;
  }

  // Create new admin
  static async create(adminData) {
    try {
      const hashedPassword = await hashPassword(adminData.password);
      
      const query = `
        INSERT INTO admins (email, password_hash, first_name, last_name, role, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        adminData.email,
        hashedPassword,
        adminData.firstName,
        adminData.lastName,
        adminData.role || 'admin'
      ];
      
      const result = await executeQuery(query, params);
      
      if (result.success) {
        return {
          success: true,
          adminId: result.data.insertId,
          message: 'Admin created successfully'
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

  // Find admin by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM admins WHERE email = ? AND is_active = 1';
      const result = await executeQuery(query, [email]);
      
      if (result.success && result.data.length > 0) {
        return {
          success: true,
          admin: new Admin(result.data[0])
        };
      }
      
      return {
        success: false,
        message: 'Admin not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find admin by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM admins WHERE id = ? AND is_active = 1';
      const result = await executeQuery(query, [id]);
      
      if (result.success && result.data.length > 0) {
        return {
          success: true,
          admin: new Admin(result.data[0])
        };
      }
      
      return {
        success: false,
        message: 'Admin not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Authenticate admin
  static async authenticate(email, password) {
    try {
      const query = 'SELECT * FROM admins WHERE email = ? AND is_active = 1';
      const result = await executeQuery(query, [email]);
      
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      const admin = result.data[0];
      const isValidPassword = await verifyPassword(password, admin.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      // Update last login
      await executeQuery('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
      
      return {
        success: true,
        admin: new Admin(admin)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all admins with pagination
  static async getAll(page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc') {
    try {
      const offset = (page - 1) * limit;
      
      // Count total admins
      const countQuery = 'SELECT COUNT(*) as total FROM admins WHERE is_active = 1';
      const countResult = await executeQuery(countQuery);
      
      if (!countResult.success) {
        return countResult;
      }
      
      const total = countResult.data[0].total;
      
      // Get admins
      const query = `
        SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
        FROM admins 
        WHERE is_active = 1
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      
      const result = await executeQuery(query, [limit, offset]);
      
      if (result.success) {
        return {
          success: true,
          admins: result.data.map(admin => new Admin(admin)),
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

  // Update admin
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
      
      if (updateData.role) {
        fields.push('role = ?');
        params.push(updateData.role);
      }
      
      if (updateData.email) {
        fields.push('email = ?');
        params.push(updateData.email);
      }
      
      if (fields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }
      
      fields.push('updated_at = NOW()');
      params.push(this.id);
      
      const query = `UPDATE admins SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      
      if (result.success) {
        // Refresh admin data
        const updatedAdmin = await Admin.findById(this.id);
        Object.assign(this, updatedAdmin.admin);
        
        return {
          success: true,
          message: 'Admin updated successfully'
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

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      // Verify current password
      const admin = await Admin.findById(this.id);
      if (!admin.success) {
        return admin;
      }
      
      const query = 'SELECT password_hash FROM admins WHERE id = ?';
      const result = await executeQuery(query, [this.id]);
      
      if (!result.success) {
        return result;
      }
      
      const isValidPassword = await verifyPassword(currentPassword, result.data[0].password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      const updateQuery = 'UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?';
      const updateResult = await executeQuery(updateQuery, [hashedPassword, this.id]);
      
      if (updateResult.success) {
        return {
          success: true,
          message: 'Password changed successfully'
        };
      }
      
      return updateResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Deactivate admin
  async deactivate() {
    try {
      const query = 'UPDATE admins SET is_active = 0, updated_at = NOW() WHERE id = ?';
      const result = await executeQuery(query, [this.id]);
      
      if (result.success) {
        this.isActive = false;
        return {
          success: true,
          message: 'Admin deactivated successfully'
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

  // Get admin stats
  static async getStats() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM admins WHERE is_active = 1',
        'SELECT COUNT(*) as active_today FROM admins WHERE DATE(last_login) = CURDATE()',
        'SELECT role, COUNT(*) as count FROM admins WHERE is_active = 1 GROUP BY role'
      ];
      
      const results = await Promise.all(
        queries.map(query => executeQuery(query))
      );
      
      if (results.every(result => result.success)) {
        return {
          success: true,
          stats: {
            total_admins: results[0].data[0].total,
            active_today: results[1].data[0].active_today,
            by_role: results[2].data
          }
        };
      }
      
      return {
        success: false,
        message: 'Failed to get admin stats'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Search admins
  static async search(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;
      
      // Count search results
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM admins 
        WHERE is_active = 1 
        AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
      `;
      const countResult = await executeQuery(countQuery, [searchPattern, searchPattern, searchPattern]);
      
      if (!countResult.success) {
        return countResult;
      }
      
      const total = countResult.data[0].total;
      
      // Search admins
      const query = `
        SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
        FROM admins 
        WHERE is_active = 1 
        AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await executeQuery(query, [searchPattern, searchPattern, searchPattern, limit, offset]);
      
      if (result.success) {
        return {
          success: true,
          admins: result.data.map(admin => new Admin(admin)),
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

  // Get admin activity log
  async getActivityLog(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT action, ip_address, user_agent, created_at
        FROM audit_logs 
        WHERE user_type = 'admin' AND user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await executeQuery(query, [this.id, limit, offset]);
      
      if (result.success) {
        return {
          success: true,
          activities: result.data
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

  // Convert to JSON (excluding sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }
}

module.exports = Admin;
