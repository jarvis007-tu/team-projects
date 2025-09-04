const Joi = require('joi');

const validateSubscriptionCreate = (req, res, next) => {
  const schema = Joi.object({
    user_id: Joi.number().integer().positive().required(),
    plan_type: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').required(),
    start_date: Joi.date().iso().optional(),
    payment_id: Joi.string().optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'failed').optional()
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

const validateSubscriptionUpdate = (req, res, next) => {
  const schema = Joi.object({
    plan_type: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').optional(),
    status: Joi.string().valid('active', 'paused', 'expired', 'cancelled').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'failed').optional(),
    payment_id: Joi.string().optional(),
    end_date: Joi.date().iso().optional()
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
  validateSubscriptionCreate,
  validateSubscriptionUpdate
};