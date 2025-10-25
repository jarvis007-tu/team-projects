const Joi = require('joi');

const validateSubscriptionCreate = (req, res, next) => {
  const schema = Joi.object({
    user_id: Joi.alternatives().try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.number().integer().positive() // Legacy numeric ID
    ).required(),
    mess_id: Joi.alternatives().try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.number().integer().positive() // Legacy numeric ID
    ).optional(),
    plan_id: Joi.alternatives().try(
      Joi.string(), // Allow string plan IDs
      Joi.number().integer().positive() // Legacy numeric ID
    ).optional(),
    plan_type: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').optional(),
    start_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    end_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    status: Joi.string().valid('active', 'paused', 'expired', 'cancelled', 'suspended').optional(),
    payment_id: Joi.string().optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'failed').optional(),
    meal_plan: Joi.object({
      breakfast: Joi.boolean().optional(),
      lunch: Joi.boolean().optional(),
      dinner: Joi.boolean().optional()
    }).optional()
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