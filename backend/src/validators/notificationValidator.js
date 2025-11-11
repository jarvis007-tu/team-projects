const Joi = require('joi');

const validateNotification = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(10).required(),
    type: Joi.string().valid('announcement', 'reminder', 'alert', 'subscription', 'menu').optional(),
    recipient_id: Joi.number().integer().positive().optional().allow(null),
    priority: Joi.string().valid('low', 'medium', 'high').optional()
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

const validateBulkNotification = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(10).required(),
    type: Joi.string().valid('announcement', 'reminder', 'alert', 'subscription', 'menu').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    target_audience: Joi.string().valid('all', 'active_subscribers', 'mess_outlet').optional(),
    mess_id: Joi.string().optional().allow(null, ''),
    schedule_type: Joi.string().valid('immediate', 'scheduled').optional(),
    scheduled_at: Joi.date().optional().allow(null, ''),
    recipient_criteria: Joi.object({
      role: Joi.string().valid('admin', 'subscriber').optional(),
      has_active_subscription: Joi.boolean().optional(),
      status: Joi.string().valid('active', 'inactive').optional()
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

module.exports = {
  validateNotification,
  validateBulkNotification
};