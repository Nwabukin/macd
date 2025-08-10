const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Voter = require('../models/Voter');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { 
  validateAdminRegistration, 
  validateVoterRegistration,
  validateVoterAuthorization,
  validatePagination,
  validateSearch,
  validateId
} = require('../middleware/validation');
const { callContract, executeTransaction } = require('../config/blockchain');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Apply authentication middleware to all admin routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get various statistics
    const [adminStats, voterStats] = await Promise.all([
      Admin.getStats(),
      Voter.getStats()
    ]);
    
    // Get blockchain status
    const blockchainStatus = await callContract('AdvancedVotingContract', 'electionCount');
    
    const dashboardData = {
      success: true,
      data: {
        admin_stats: adminStats.success ? adminStats.stats : null,
        voter_stats: voterStats.success ? voterStats.stats : null,
        blockchain_stats: {
          total_elections: blockchainStatus.success ? blockchainStatus.data.toString() : 0,
          connected: blockchainStatus.success
        },
        system_health: {
          database: true, // This would be from actual health checks
          blockchain: blockchainStatus.success,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
});

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admins with pagination
 * @access  Private (Admin)
 */
router.get('/admins', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    
    const result = await Admin.getAll(
      parseInt(page), 
      parseInt(limit), 
      sortBy, 
      sortOrder
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result.admins,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch admins'
      });
    }
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/admin/admins
 * @desc    Create new admin
 * @access  Private (Admin)
 */
router.post('/admins', validateAdminRegistration, async (req, res) => {
  try {
    const adminData = req.body;
    
    // Check if admin with email already exists
    const existingAdmin = await Admin.findByEmail(adminData.email);
    if (existingAdmin.success) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }
    
    const result = await Admin.create(adminData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        adminId: result.adminId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create admin'
      });
    }
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/admins/search
 * @desc    Search admins
 * @access  Private (Admin)
 */
router.get('/admins/search', validateSearch, validatePagination, async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;
    
    const result = await Admin.search(searchTerm, parseInt(page), parseInt(limit));
    
    if (result.success) {
      res.json({
        success: true,
        data: result.admins,
        pagination: result.pagination,
        searchTerm
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Search failed'
      });
    }
  } catch (error) {
    console.error('Search admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/voters
 * @desc    Get all voters with pagination and filters
 * @access  Private (Admin)
 */
router.get('/voters', validatePagination, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      departmentId,
      levelId,
      isAuthorized,
      hasGeneratedWallet
    } = req.query;
    
    const filters = {};
    if (departmentId) filters.departmentId = parseInt(departmentId);
    if (levelId) filters.levelId = parseInt(levelId);
    if (isAuthorized !== undefined) filters.isAuthorized = isAuthorized === 'true';
    if (hasGeneratedWallet !== undefined) filters.hasGeneratedWallet = hasGeneratedWallet === 'true';
    
    const result = await Voter.getAll(
      parseInt(page), 
      parseInt(limit), 
      sortBy, 
      sortOrder,
      filters
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result.voters,
        pagination: result.pagination,
        filters
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch voters'
      });
    }
  } catch (error) {
    console.error('Get voters error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/admin/voters
 * @desc    Register new voter
 * @access  Private (Admin)
 */
router.post('/voters', validateVoterRegistration, async (req, res) => {
  try {
    const voterData = req.body;
    
    // Check if voter with matric number already exists
    const existingVoter = await Voter.findByMatricNumber(voterData.matricNumber);
    if (existingVoter.success) {
      return res.status(400).json({
        success: false,
        message: 'Voter with this matriculation number already exists'
      });
    }
    
    const result = await Voter.create(voterData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        voterId: result.voterId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to register voter'
      });
    }
  } catch (error) {
    console.error('Register voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/admin/voters/bulk
 * @desc    Bulk register voters from CSV
 * @access  Private (Admin)
 */
router.post('/voters/bulk', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          const registrationResults = [];
          
          for (const [index, voterData] of results.entries()) {
            try {
              // Validate required fields
              if (!voterData.matricNumber || !voterData.firstName || !voterData.lastName || !voterData.email) {
                errors.push({
                  row: index + 2, // +2 because CSV row 1 is header and array is 0-indexed
                  error: 'Missing required fields'
                });
                continue;
              }
              
              // Check for existing voter
              const existingVoter = await Voter.findByMatricNumber(voterData.matricNumber);
              if (existingVoter.success) {
                errors.push({
                  row: index + 2,
                  error: 'Voter already exists'
                });
                continue;
              }
              
              // Register voter
              const result = await Voter.create({
                matricNumber: voterData.matricNumber,
                firstName: voterData.firstName,
                lastName: voterData.lastName,
                email: voterData.email,
                departmentId: parseInt(voterData.departmentId) || 1,
                levelId: parseInt(voterData.levelId) || 1,
                cgpa: parseFloat(voterData.cgpa) || null,
                phone: voterData.phone || null
              });
              
              if (result.success) {
                registrationResults.push({
                  row: index + 2,
                  matricNumber: voterData.matricNumber,
                  status: 'success'
                });
              } else {
                errors.push({
                  row: index + 2,
                  error: result.error
                });
              }
            } catch (rowError) {
              errors.push({
                row: index + 2,
                error: rowError.message
              });
            }
          }
          
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          
          res.json({
            success: true,
            message: 'Bulk registration completed',
            summary: {
              total_processed: results.length,
              successful: registrationResults.length,
              failed: errors.length
            },
            successful_registrations: registrationResults,
            errors: errors
          });
        } catch (processError) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          
          res.status(500).json({
            success: false,
            message: 'Error processing CSV file',
            error: processError.message
          });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.status(500).json({
          success: false,
          message: 'Error reading CSV file',
          error: error.message
        });
      });
  } catch (error) {
    console.error('Bulk register voters error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/voters/:id/authorize
 * @desc    Authorize voter
 * @access  Private (Admin)
 */
router.put('/voters/:id/authorize', validateId, async (req, res) => {
  try {
    const voterId = req.params.id;
    
    const voterResult = await Voter.findById(voterId);
    if (!voterResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }
    
    const voter = voterResult.voter;
    const result = await voter.authorize();
    
    if (result.success) {
      // Also authorize on blockchain if voter has wallet
      if (voter.blockchainAddress) {
        try {
          const blockchainResult = await executeTransaction(
            'AdvancedVotingContract',
            'authorizeVoter',
            [voter.blockchainAddress, voter.matricNumber]
          );
          
          console.log('Blockchain authorization result:', blockchainResult);
        } catch (blockchainError) {
          console.error('Blockchain authorization failed:', blockchainError);
          // Continue with database authorization even if blockchain fails
        }
      }
      
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to authorize voter'
      });
    }
  } catch (error) {
    console.error('Authorize voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/voters/authorize/bulk
 * @desc    Bulk authorize voters
 * @access  Private (Admin)
 */
router.put('/voters/authorize/bulk', validateVoterAuthorization, async (req, res) => {
  try {
    const { voterIds } = req.body;
    
    const result = await Voter.bulkAuthorize(voterIds);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        authorizedCount: result.authorizedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to authorize voters'
      });
    }
  } catch (error) {
    console.error('Bulk authorize voters error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/voters/search
 * @desc    Search voters
 * @access  Private (Admin)
 */
router.get('/voters/search', validateSearch, validatePagination, async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;
    
    const result = await Voter.search(searchTerm, parseInt(page), parseInt(limit));
    
    if (result.success) {
      res.json({
        success: true,
        data: result.voters,
        pagination: result.pagination,
        searchTerm
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Search failed'
      });
    }
  } catch (error) {
    console.error('Search voters error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/voters/:id
 * @desc    Get voter details
 * @access  Private (Admin)
 */
router.get('/voters/:id', validateId, async (req, res) => {
  try {
    const voterId = req.params.id;
    
    const result = await Voter.findById(voterId);
    
    if (result.success) {
      // Get voting history
      const historyResult = await result.voter.getVotingHistory();
      
      res.json({
        success: true,
        data: {
          voter: result.voter.toJSON(),
          votingHistory: historyResult.success ? historyResult.votingHistory : []
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }
  } catch (error) {
    console.error('Get voter details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/system/health', async (req, res) => {
  try {
    // Check database health
    const { healthCheck: dbHealthCheck } = require('../config/database');
    const dbHealth = await dbHealthCheck();
    
    // Check blockchain health
    const { healthCheck: blockchainHealthCheck } = require('../config/blockchain');
    const blockchainHealth = await blockchainHealthCheck();
    
    const systemHealth = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          ...dbHealth
        },
        blockchain: {
          status: blockchainHealth.healthy ? 'healthy' : 'unhealthy',
          ...blockchainHealth
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        }
      }
    };
    
    const overallHealth = dbHealth.healthy && blockchainHealth.healthy;
    systemHealth.status = overallHealth ? 'healthy' : 'degraded';
    
    res.status(overallHealth ? 200 : 503).json(systemHealth);
  } catch (error) {
    console.error('System health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/reports/summary
 * @desc    Get system summary report
 * @access  Private (Admin)
 */
router.get('/reports/summary', async (req, res) => {
  try {
    const [adminStats, voterStats] = await Promise.all([
      Admin.getStats(),
      Voter.getStats()
    ]);
    
    // Get blockchain statistics
    const electionCount = await callContract('AdvancedVotingContract', 'electionCount');
    const positionCount = await callContract('AdvancedVotingContract', 'positionCount');
    const candidateCount = await callContract('AdvancedVotingContract', 'candidateCount');
    
    const summary = {
      success: true,
      report: {
        generated_at: new Date().toISOString(),
        generated_by: req.admin.email,
        admin_summary: adminStats.success ? adminStats.stats : null,
        voter_summary: voterStats.success ? voterStats.stats : null,
        blockchain_summary: {
          total_elections: electionCount.success ? electionCount.data.toString() : 0,
          total_positions: positionCount.success ? positionCount.data.toString() : 0,
          total_candidates: candidateCount.success ? candidateCount.data.toString() : 0
        }
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary report'
    });
  }
});

module.exports = router;
