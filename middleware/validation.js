const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  handleValidationErrors
];

const bookValidation = [
  body('title').notEmpty().trim(),
  body('author').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('stock_quantity').isInt({ min: 0 }),
  handleValidationErrors
];

const orderValidation = [
  body('books').isArray({ min: 1 }),
  body('books.*.id').isInt({ min: 1 }),
  body('books.*.quantity').isInt({ min: 1 }),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  bookValidation,
  orderValidation
};