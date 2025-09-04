const Joi = require('joi');

const validateMenuItem = (req, res, next) => {
  const schema = Joi.object({
    day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    meal_type: Joi.string().valid('breakfast', 'lunch', 'dinner').required(),
    items: Joi.array().items(Joi.string()).min(1).required(),
    special_note: Joi.string().max(500).optional(),
    week_start_date: Joi.date().iso().optional()
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

const validateWeeklyMenu = (req, res, next) => {
  const schema = Joi.object({
    menu: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.object().pattern(
        Joi.string().valid('breakfast', 'lunch', 'dinner'),
        Joi.object({
          items: Joi.array().items(Joi.string()).min(1).required(),
          special_note: Joi.string().max(500).optional()
        })
      )
    ).required(),
    week_start_date: Joi.date().iso().optional()
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
  validateMenuItem,
  validateWeeklyMenu
};