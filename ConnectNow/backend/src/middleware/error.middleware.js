// ConnectNOW - Centralized Production Error Handling Middleware
import httpStatus from "http-status";

/**
 * Custom Operational Error Class
 */
export class AppError extends Error {
    constructor(message, statusCode = httpStatus.INTERNAL_SERVER_ERROR) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Sanitizes object keys to redact sensitive parameters from logs
 */
const sanitizeForLog = (data) => {
    if (!data || typeof data !== "object") return data;
    const sanitized = { ...data };
    const sensitiveKeys = ["password", "token", "resetPasswordToken", "authorization", "secret"];
    
    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = "[REDACTED]";
        } else if (typeof sanitized[key] === "object") {
            sanitized[key] = sanitizeForLog(sanitized[key]);
        }
    }
    return sanitized;
};

/**
 * Centralized Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : httpStatus.INTERNAL_SERVER_ERROR);
    const isProduction = process.env.NODE_ENV === "production";

    // Safe logging server-side
    console.error(`[ERROR] ${req.method} ${req.originalUrl} - Status: ${statusCode}`);
    console.error(`[ERROR DETAILS] ${err.stack || err.message}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.error(`[REQUEST BODY]`, JSON.stringify(sanitizeForLog(req.body)));
    }

    // Response formatting
    const responsePayload = {
        message: err.isOperational || !isProduction
            ? err.message
            : "An unexpected server error occurred. Please try again later."
    };

    if (!isProduction && err.stack) {
        responsePayload.stack = err.stack;
    }

    res.status(statusCode).json(responsePayload);
};

/**
 * 404 Not Found Handler for Unmatched Routes
 */
export const notFoundHandler = (req, res, next) => {
    res.status(httpStatus.NOT_FOUND).json({
        message: `Route not found: ${req.originalUrl}`
    });
};
