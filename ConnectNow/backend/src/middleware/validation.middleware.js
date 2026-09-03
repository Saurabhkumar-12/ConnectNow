// ConnectNOW - Strict Input Validation & NoSQL Injection Defense Middleware
import httpStatus from "http-status";

/**
 * Sanitizes input data against NoSQL query operator injection (keys starting with '$' or containing '.')
 */
export const sanitizeNoSQL = (obj) => {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeNoSQL);
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        // Reject or strip MongoDB operators like $gt, $ne, $where, or keys with dots
        if (key.startsWith("$") || key.includes(".")) {
            continue; // Strip key
        }
        sanitized[key] = sanitizeNoSQL(obj[key]);
    }
    return sanitized;
};

/**
 * Express middleware to sanitize body, query, and params against NoSQL injection
 */
export const mongoSanitizer = (req, res, next) => {
    if (req.body) req.body = sanitizeNoSQL(req.body);
    if (req.query) req.query = sanitizeNoSQL(req.query);
    if (req.params) req.params = sanitizeNoSQL(req.params);
    next();
};

/**
 * Helper to construct standardized 400 Bad Request error
 */
const sendValidationError = (res, errors) => {
    return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid input provided",
        errors: errors
    });
};

/**
 * Validate Registration Payload
 */
export const validateRegister = (req, res, next) => {
    const { name, username, email, password } = req.body || {};
    const errors = [];

    // Name validation
    if (typeof name !== "string" || !name.trim()) {
        errors.push("Full name is required");
    } else if (name.trim().length < 2 || name.trim().length > 100) {
        errors.push("Full name must be between 2 and 100 characters");
    }

    // Username validation
    if (typeof username !== "string" || !username.trim()) {
        errors.push("Username is required");
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        errors.push("Username must be 3-30 characters long and contain only letters, numbers, and underscores");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !email.trim()) {
        errors.push("Email address is required");
    } else if (!emailRegex.test(email.trim().toLowerCase())) {
        errors.push("Invalid email format");
    }

    // Password validation
    if (typeof password !== "string" || !password) {
        errors.push("Password is required");
    } else if (password.length < 8 || password.length > 128) {
        errors.push("Password must be between 8 and 128 characters long");
    }

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    // Normalize inputs
    req.body.name = name.trim();
    req.body.username = username.trim();
    req.body.email = email.trim().toLowerCase();

    next();
};

/**
 * Validate Login Payload
 */
export const validateLogin = (req, res, next) => {
    const { email, username, password } = req.body || {};
    const errors = [];

    if (!email && !username) {
        errors.push("Username or email is required");
    }

    if (email !== undefined && (typeof email !== "string" || !email.trim())) {
        errors.push("Invalid email format");
    }

    if (username !== undefined && (typeof username !== "string" || !username.trim())) {
        errors.push("Invalid username format");
    }

    if (typeof password !== "string" || !password) {
        errors.push("Password is required");
    }

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    if (email) req.body.email = email.trim().toLowerCase();
    if (username) req.body.username = username.trim();

    next();
};

/**
 * Validate Forgot Password Payload
 */
export const validateForgotPassword = (req, res, next) => {
    const { email } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (typeof email !== "string" || !email.trim() || !emailRegex.test(email.trim().toLowerCase())) {
        return sendValidationError(res, ["Please provide a valid email address"]);
    }

    req.body.email = email.trim().toLowerCase();
    next();
};

/**
 * Validate Reset Password Payload
 */
export const validateResetPassword = (req, res, next) => {
    const { token } = req.params || {};
    const { password } = req.body || {};
    const errors = [];

    if (typeof token !== "string" || !/^[a-f0-9]{40}$/i.test(token)) {
        errors.push("Invalid reset token format");
    }

    if (typeof password !== "string" || !password || password.length < 8 || password.length > 128) {
        errors.push("Password must be between 8 and 128 characters long");
    }

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    next();
};

/**
 * Validate User Profile Update
 */
export const validateUpdateProfile = (req, res, next) => {
    const { name } = req.body || {};

    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
            return sendValidationError(res, ["Name must be a string between 2 and 100 characters"]);
        }
        req.body.name = name.trim();
    }

    next();
};

/**
 * Validate Meeting Creation
 */
export const validateCreateMeeting = (req, res, next) => {
    const { password } = req.body || {};

    if (password !== undefined && password !== null && password !== "") {
        if (typeof password !== "string" || password.length > 128) {
            return sendValidationError(res, ["Meeting password must be a string up to 128 characters"]);
        }
    }

    next();
};

/**
 * Validate Meeting Join
 */
export const validateJoinMeeting = (req, res, next) => {
    const { meetingId, password } = req.body || {};
    const errors = [];

    const meetingIdRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/i;
    if (typeof meetingId !== "string" || !meetingIdRegex.test(meetingId.trim())) {
        errors.push("Invalid meeting code format (expected format: xxx-xxx-xxx)");
    }

    if (password !== undefined && password !== null && password !== "") {
        if (typeof password !== "string" || password.length > 128) {
            errors.push("Meeting password must be a string up to 128 characters");
        }
    }

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    req.body.meetingId = meetingId.trim().toLowerCase();
    next();
};

/**
 * Validate Meeting Info Parameter
 */
export const validateGetMeetingInfo = (req, res, next) => {
    const { id } = req.params || {};
    const meetingIdRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/i;

    if (typeof id !== "string" || !meetingIdRegex.test(id.trim())) {
        return sendValidationError(res, ["Invalid meeting code parameter format"]);
    }

    req.params.id = id.trim().toLowerCase();
    next();
};

/**
 * Validate Activity History Payload
 */
export const validateAddToHistory = (req, res, next) => {
    const { meeting_code } = req.body || {};
    const meetingIdRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/i;

    if (typeof meeting_code !== "string" || !meetingIdRegex.test(meeting_code.trim())) {
        return sendValidationError(res, ["Invalid meeting code format"]);
    }

    req.body.meeting_code = meeting_code.trim().toLowerCase();
    next();
};

/**
 * Validate Code Execution Payload
 */
export const validateCodeExecution = (req, res, next) => {
    const { language, code, stdin } = req.body || {};
    const errors = [];

    const allowedLangs = ["javascript", "python", "cpp", "java", "html", "css"];
    if (typeof language !== "string" || !allowedLangs.includes(language.toLowerCase().trim())) {
        errors.push(`Invalid language. Must be one of: ${allowedLangs.join(", ")}`);
    }

    if (typeof code !== "string" || !code.trim()) {
        errors.push("Source code cannot be empty");
    } else if (code.length > 50000) {
        errors.push("Source code exceeds maximum length of 50,000 characters");
    }

    if (stdin !== undefined && typeof stdin !== "string") {
        errors.push("stdin input must be a string");
    } else if (stdin && stdin.length > 10000) {
        errors.push("stdin input exceeds maximum length of 10,000 characters");
    }

    if (errors.length > 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Invalid code execution payload",
            errors
        });
    }

    req.body.language = language.toLowerCase().trim();
    next();
};

/**
 * Validate Note Payload (Create & Update)
 */
export const validateNotePayload = (req, res, next) => {
    const { title, content } = req.body || {};
    const errors = [];

    if (req.method === "POST" || title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
            errors.push("Note title is required");
        } else if (title.trim().length > 200) {
            errors.push("Note title cannot exceed 200 characters");
        }
    }

    if (req.method === "POST" || content !== undefined) {
        if (typeof content !== "string" || !content.trim()) {
            errors.push("Note content cannot be empty");
        } else if (content.length > 50000) {
            errors.push("Note content cannot exceed 50,000 characters");
        }
    }

    if (errors.length > 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Invalid note payload",
            errors
        });
    }

    if (title) req.body.title = title.trim();
    next();
};

/**
 * Validate MongoDB ObjectId Parameter for Note ID
 */
export const validateNoteId = (req, res, next) => {
    const { id } = req.params || {};
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Invalid note ID format"
        });
    }
    next();
};


