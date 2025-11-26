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
    plan_type: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
    sub_type: Joi.string().valid('veg', 'non-veg', 'both').optional(),
    start_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    end_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    amount: Joi.number().min(0).optional(),
    status: Joi.string().valid('active', 'paused', 'expired', 'cancelled', 'suspended', 'pending').optional(),
    payment_id: Joi.string().optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    payment_method: Joi.string().valid('cash', 'upi', 'card', 'netbanking', 'wallet').allow(null).optional(),
    payment_reference: Joi.string().optional(),
    auto_renewal: Joi.boolean().optional(),
    meal_plan: Joi.object({
      breakfast: Joi.boolean().optional(),
      lunch: Joi.boolean().optional(),
      dinner: Joi.boolean().optional()
    }).optional(),
    meals_included: Joi.object({
      breakfast: Joi.boolean().optional(),
      lunch: Joi.boolean().optional(),
      dinner: Joi.boolean().optional()
    }).optional(),
    special_requirements: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional()
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
    plan_type: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
    sub_type: Joi.string().valid('veg', 'non-veg', 'both').optional(),
    start_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    end_date: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string()
    ).optional(),
    amount: Joi.number().min(0).optional(),
    status: Joi.string().valid('active', 'paused', 'expired', 'cancelled', 'suspended', 'pending').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    payment_method: Joi.string().valid('cash', 'upi', 'card', 'netbanking', 'wallet').allow(null).optional(),
    payment_id: Joi.string().optional(),
    payment_reference: Joi.string().optional(),
    auto_renewal: Joi.boolean().optional(),
    meals_included: Joi.object({
      breakfast: Joi.boolean().optional(),
      lunch: Joi.boolean().optional(),
      dinner: Joi.boolean().optional()
    }).optional(),
    special_requirements: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional()
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