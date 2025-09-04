const Joi = require('joi');

const validateMealConfirmation = (req, res, next) => {
  const schema = Joi.object({
    meal_date: Joi.date().iso().required(),
    meal_type: Joi.string().valid('breakfast', 'lunch', 'dinner').required()
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

const validateBulkConfirmation = (req, res, next) => {
  const schema = Joi.object({
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
    meal_types: Joi.array()
      .items(Joi.string().valid('breakfast', 'lunch', 'dinner'))
      .min(1)
      .required()
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
  validateMealConfirmation,
  validateBulkConfirmation
};