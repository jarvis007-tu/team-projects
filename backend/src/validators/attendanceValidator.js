const Joi = require('joi');

const validateQRScan = (req, res, next) => {
  const schema = Joi.object({
    qr_code: Joi.string().required(),
    geo_location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().optional()
    }).optional(),
    device_id: Joi.string().optional()
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

const validateManualAttendance = (req, res, next) => {
  const schema = Joi.object({
    user_id: Joi.number().integer().positive().required(),
    meal_type: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
    scan_date: Joi.date().iso().optional(),
    reason: Joi.string().max(500).optional()
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
  validateQRScan,
  validateManualAttendance
};