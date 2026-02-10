const Joi = require('joi');

/**
 * Validation schemas for different endpoints
 */
const schemas = {
    // Auth schemas
    signup: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: Joi.string().min(8).required().messages({
            'string.min': 'Password must be at least 8 characters long',
            'any.required': 'Password is required'
        }),
        fullName: Joi.string().min(2).max(100).required().messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Full name is required'
        })
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    // Topic schemas
    createTopic: Joi.object({
        title: Joi.string().min(3).max(500).required(),
        themeId: Joi.string().uuid().required(),
        rawText: Joi.string().required(),
        summary: Joi.string().max(1000),
        difficultyLevel: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
        tags: Joi.array().items(Joi.string()).max(10)
    }),

    updateTopic: Joi.object({
        title: Joi.string().min(3).max(500),
        rawText: Joi.string(),
        summary: Joi.string().max(1000),
        difficultyLevel: Joi.string().valid('easy', 'medium', 'hard'),
        tags: Joi.array().items(Joi.string()).max(10),
        isVerified: Joi.boolean()
    }),

    // Quiz schemas
    submitQuiz: Joi.object({
        topicId: Joi.string().uuid().required(),
        quizId: Joi.string().uuid().required(),
        answers: Joi.array().items(Joi.number().min(0).max(3)).required().messages({
            'array.base': 'Answers must be an array',
            'any.required': 'Quiz answers are required'
        }),
        timeSpent: Joi.number().min(0).max(7200) // max 2 hours
    }),

    // Translation schema
    translate: Joi.object({
        topicId: Joi.string().uuid().required(),
        targetLanguage: Joi.string().valid('hi', 'pa', 'en', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'ur').required()
    }),

    // User update schema
    updateProfile: Joi.object({
        fullName: Joi.string().min(2).max(100),
        preferredLanguage: Joi.string().valid('hi', 'pa', 'en', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'ur'),
        preferredTheme: Joi.string().max(100)
    })
};

/**
 * Middleware factory to validate request body against schema
 */
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];

        if (!schema) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Validation schema not found'
            });
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid input data',
                errors
            });
        }

        // Replace req.body with validated and sanitized value
        req.body = value;
        next();
    };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid query parameters',
                errors
            });
        }

        req.query = value;
        next();
    };
};

/**
 * Common query validation schemas
 */
const querySchemas = {
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
    }),

    topicQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        theme: Joi.string().uuid(),
        difficulty: Joi.string().valid('easy', 'medium', 'hard'),
        language: Joi.string().valid('hi', 'pa', 'en', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'ur'),
        search: Joi.string().max(200)
    })
};

module.exports = {
    validate,
    validateQuery,
    schemas,
    querySchemas
};
