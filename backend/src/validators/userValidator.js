const Joi = require('joi');

const validateUserCreate = (req, res, next) => {
  const schema = Joi.object({
    full_name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().min(6).required(),
    mess_id: Joi.string().optional(),
    role: Joi.string().valid('super_admin', 'mess_admin', 'subscriber').optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

const validateUserUpdate = (req, res, next) => {
  const schema = Joi.object({
    full_name: Joi.string().min(3).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    password: Joi.string().min(6).optional(),
    mess_id: Joi.string().optional(),
    role: Joi.string().valid('super_admin', 'mess_admin', 'subscriber').optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateUserCreate,
  validateUserUpdate
};