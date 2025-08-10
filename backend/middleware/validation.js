const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Admin login validation
const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Voter login validation
const validateVoterLogin = [
  body('matricNumber')
    .matches(/^[A-Z]{2}\.\d{4}\/\d{4}$/)
    .withMessage('Valid matriculation number is required (e.g., DE.2021/4001)'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Admin registration validation
const validateAdminRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('role')
    .isIn(['super_admin', 'admin', 'moderator'])
    .withMessage('Valid role is required'),
  handleValidationErrors
];

// Voter registration validation
const validateVoterRegistration = [
  body('matricNumber')
    .matches(/^[A-Z]{2}\.\d{4}\/\d{4}$/)
    .withMessage('Valid matriculation number is required (e.g., DE.2021/4001)'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('departmentId')
    .isInt({ min: 1 })
    .withMessage('Valid department is required'),
  body('levelId')
    .isInt({ min: 1 })
    .withMessage('Valid academic level is required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Election creation validation
const validateElectionCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Election title must be 5-200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Election description must be 10-1000 characters'),
  body('startTime')
    .isISO8601()
    .toDate()
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      const duration = new Date(value) - new Date(req.body.startTime);
      const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (duration > maxDuration) {
        throw new Error('Election duration cannot exceed 30 days');
      }
      return true;
    }),
  body('electionType')
    .isInt({ min: 1, max: 3 })
    .withMessage('Valid election type is required (1-3)'),
  body('positionIds')
    .isArray({ min: 1 })
    .withMessage('At least one position is required'),
  body('positionIds.*')
    .isInt({ min: 1 })
    .withMessage('Valid position IDs are required'),
  handleValidationErrors
];

// Position creation validation
const validatePositionCreation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position title must be 2-100 characters'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Position description must be 5-500 characters'),
  body('maxCandidates')
    .isInt({ min: 1, max: 50 })
    .withMessage('Max candidates must be between 1 and 50'),
  body('maxVotesPerVoter')
    .isInt({ min: 1, max: 10 })
    .withMessage('Max votes per voter must be between 1 and 10'),
  handleValidationErrors
];

// Candidate creation validation
const validateCandidateCreation = [
  body('electionId')
    .isInt({ min: 1 })
    .withMessage('Valid election ID is required'),
  body('positionId')
    .isInt({ min: 1 })
    .withMessage('Valid position ID is required'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Candidate name must be 2-100 characters'),
  body('matricNumber')
    .matches(/^[A-Z]{2}\.\d{4}\/\d{4}$/)
    .withMessage('Valid matriculation number is required'),
  body('bio')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Candidate bio must be 10-1000 characters'),
  handleValidationErrors
];

// Vote casting validation
const validateVoteCasting = [
  body('electionId')
    .isInt({ min: 1 })
    .withMessage('Valid election ID is required'),
  body('positionId')
    .isInt({ min: 1 })
    .withMessage('Valid position ID is required'),
  body('candidateId')
    .isInt({ min: 1 })
    .withMessage('Valid candidate ID is required'),
  body('voterPrivateKey')
    .isLength({ min: 64, max: 66 })
    .withMessage('Valid private key is required'),
  handleValidationErrors
];

// Voter authorization validation
const validateVoterAuthorization = [
  body('voterIds')
    .isArray({ min: 1 })
    .withMessage('At least one voter ID is required'),
  body('voterIds.*')
    .isInt({ min: 1 })
    .withMessage('Valid voter IDs are required'),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isAlpha()
    .withMessage('Sort field must contain only letters'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid start date is required'),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (allowedTypes, maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      });
    }
    
    next();
  };
};

// Custom validation for blockchain address
const validateBlockchainAddress = [
  body('address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Valid Ethereum address is required'),
  handleValidationErrors
];

// Bulk operation validation
const validateBulkOperation = [
  body('operations')
    .isArray({ min: 1, max: 100 })
    .withMessage('Operations array must contain 1-100 items'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateAdminLogin,
  validateVoterLogin,
  validateAdminRegistration,
  validateVoterRegistration,
  validateElectionCreation,
  validatePositionCreation,
  validateCandidateCreation,
  validateVoteCasting,
  validateVoterAuthorization,
  validatePasswordChange,
  validateId,
  validatePagination,
  validateSearch,
  validateDateRange,
  validateFileUpload,
  validateBlockchainAddress,
  validateBulkOperation
};
