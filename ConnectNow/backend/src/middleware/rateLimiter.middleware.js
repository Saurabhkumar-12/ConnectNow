// ConnectNOW - Production Security Rate Limiter Middleware
import httpStatus from "http-status";

// In-memory sliding window store
const ipStores = new Map();
const accountStores = new Map();
const failedAttempts = new Map();

/**
 * Get client IP address respecting reverse proxies
 */
export const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        // Return first IP if comma-separated
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "127.0.0.1";
};

/**
 * Clean up expired rate limit entries every 5 minutes to prevent memory leaks
 */
setInterval(() => {
    const now = Date.now();
    const cleanupMap = (map) => {
        for (const [key, record] of map.entries()) {
            if (record.resetTime < now) {
                map.delete(key);
            }
        }
    };
    cleanupMap(ipStores);
    cleanupMap(accountStores);
    
    // Clean up failed attempts older than 1 hour
    for (const [key, record] of failedAttempts.entries()) {
        if (record.resetTime < now) {
            failedAttempts.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Rate Limiter Factory
 */
export const createRateLimiter = ({
    windowMsEnv = "AUTH_RATE_LIMIT_WINDOW_MS",
    maxEnv = "AUTH_RATE_LIMIT_MAX",
    defaultWindowMs = 15 * 60 * 1000, // 15 mins
    defaultMax = 10,
    prefix = "general"
}) => {
    return (req, res, next) => {
        const windowMs = parseInt(process.env[windowMsEnv], 10) || defaultWindowMs;
        const max = parseInt(process.env[maxEnv], 10) || defaultMax;
        
        const ip = getClientIp(req);
        const key = `${prefix}:${ip}`;
        const now = Date.now();

        let record = ipStores.get(key);
        if (!record || record.resetTime < now) {
            record = { count: 1, resetTime: now + windowMs };
            ipStores.set(key, record);
        } else {
            record.count += 1;
        }

        const remaining = Math.max(0, max - record.count);
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        res.setHeader("RateLimit-Limit", max);
        res.setHeader("RateLimit-Remaining", remaining);
        res.setHeader("RateLimit-Reset", Math.ceil(record.resetTime / 1000));

        if (record.count > max) {
            res.setHeader("Retry-After", retryAfter);
            return res.status(httpStatus.TOO_MANY_REQUESTS).json({
                message: "Too many requests. Please try again later."
            });
        }

        next();
    };
};

/**
 * Authentication Per-Account Rate Limiter & Exponential Backoff Tracker
 */
export const authAccountRateLimiter = (req, res, next) => {
    const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
    const maxAccountAttempts = parseInt(process.env.AUTH_ACCOUNT_RATE_LIMIT_MAX, 10) || 5;

    const identifier = (req.body?.email || req.body?.username || "").toLowerCase().trim();
    if (!identifier) {
        return next();
    }

    const ip = getClientIp(req);
    const key = `auth_account:${identifier}:${ip}`;
    const now = Date.now();

    // Check exponential backoff delay from past failures
    const failedRecord = failedAttempts.get(key);
    if (failedRecord && failedRecord.lockUntil > now) {
        const waitSeconds = Math.ceil((failedRecord.lockUntil - now) / 1000);
        res.setHeader("Retry-After", waitSeconds);
        return res.status(httpStatus.TOO_MANY_REQUESTS).json({
            message: `Account temporarily locked due to multiple failed login attempts. Try again in ${waitSeconds} seconds.`
        });
    }

    let record = accountStores.get(key);
    if (!record || record.resetTime < now) {
        record = { count: 1, resetTime: now + windowMs };
        accountStores.set(key, record);
    } else {
        record.count += 1;
    }

    if (record.count > maxAccountAttempts) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfter);
        return res.status(httpStatus.TOO_MANY_REQUESTS).json({
            message: "Too many login attempts for this account. Please try again later."
        });
    }

    next();
};

/**
 * Helper to record failed login attempts and calculate exponential backoff
 */
export const recordFailedAuthAttempt = (req) => {
    const identifier = (req.body?.email || req.body?.username || "").toLowerCase().trim();
    const ip = getClientIp(req);
    const key = `auth_account:${identifier}:${ip}`;
    const now = Date.now();

    const baseBackoffMs = parseInt(process.env.BACKOFF_BASE_MS, 10) || 2000; // 2 seconds
    const maxBackoffMs = parseInt(process.env.BACKOFF_MAX_MS, 10) || 300000; // 5 minutes

    let record = failedAttempts.get(key);
    if (!record || record.resetTime < now) {
        record = { count: 1, lockUntil: 0, resetTime: now + 30 * 60 * 1000 };
    } else {
        record.count += 1;
    }

    // Apply exponential backoff starting from 3rd failure
    if (record.count >= 3) {
        const exponent = record.count - 2;
        const delay = Math.min(baseBackoffMs * Math.pow(2, exponent), maxBackoffMs);
        record.lockUntil = now + delay;
    }

    failedAttempts.set(key, record);
};

/**
 * Helper to clear failed login attempts on successful authentication
 */
export const clearFailedAuthAttempt = (req) => {
    const identifier = (req.body?.email || req.body?.username || "").toLowerCase().trim();
    const ip = getClientIp(req);
    const key = `auth_account:${identifier}:${ip}`;
    failedAttempts.delete(key);
    accountStores.delete(key);
};

// Pre-configured limiters for different route tiers
export const authIpRateLimiter = createRateLimiter({
    windowMsEnv: "AUTH_RATE_LIMIT_WINDOW_MS",
    maxEnv: "AUTH_RATE_LIMIT_MAX",
    defaultWindowMs: 15 * 60 * 1000,
    defaultMax: 15,
    prefix: "auth_ip"
});

export const userRateLimiter = createRateLimiter({
    windowMsEnv: "USER_RATE_LIMIT_WINDOW_MS",
    maxEnv: "USER_RATE_LIMIT_MAX",
    defaultWindowMs: 60 * 1000,
    defaultMax: 100,
    prefix: "user"
});

export const publicRateLimiter = createRateLimiter({
    windowMsEnv: "PUBLIC_RATE_LIMIT_WINDOW_MS",
    maxEnv: "PUBLIC_RATE_LIMIT_MAX",
    defaultWindowMs: 60 * 1000,
    defaultMax: 200,
    prefix: "public"
});
