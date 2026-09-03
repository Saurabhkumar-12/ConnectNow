// Adapted and customized for ConnectNOW
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
    login,
    register,
    forgotPassword,
    resetPassword,
    getUserProfile,
    updateUserProfile,
    getUserHistory,
    addToHistory
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
    authIpRateLimiter,
    authAccountRateLimiter,
    userRateLimiter
} from "../middleware/rateLimiter.middleware.js";
import {
    mongoSanitizer,
    validateLogin,
    validateRegister,
    validateForgotPassword,
    validateResetPassword,
    validateUpdateProfile,
    validateAddToHistory
} from "../middleware/validation.middleware.js";

const router = Router();

// Apply Mongo NoSQL injection sanitizer globally to all user routes
router.use(mongoSanitizer);

// Configure Multer for Avatar Uploads with Security Restrictions
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
        const randomName = crypto.randomBytes(16).toString("hex");
        cb(null, `avatar-${randomName}${safeExt}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
    const isAllowedMime = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);

    if (isAllowedExt && isAllowedMime) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, and WEBP image formats are allowed."), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Middleware to handle multer file upload errors gracefully
const handleAvatarUpload = (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ message: "File size exceeds 2MB limit" });
                }
                return res.status(400).json({ message: `Upload error: ${err.message}` });
            }
            return res.status(400).json({ message: err.message || "File upload failed" });
        }
        next();
    });
};

// Auth Routes (Protected by IP + Account Rate Limiting and Strict Input Validation)
router.route("/login").post(authIpRateLimiter, authAccountRateLimiter, validateLogin, login);
router.route("/register").post(authIpRateLimiter, validateRegister, register);

// Password Recovery Routes
router.route("/forgot-password").post(authIpRateLimiter, validateForgotPassword, forgotPassword);
router.route("/reset-password/:token").post(authIpRateLimiter, validateResetPassword, resetPassword);

// Profile Routes (Protected by JWT Auth & User Rate Limit)
router.route("/profile")
    .get(protect, userRateLimiter, getUserProfile)
    .put(protect, userRateLimiter, handleAvatarUpload, validateUpdateProfile, updateUserProfile);

// Activity History Routes (Strictly Protected by JWT Auth)
router.route("/add_to_activity").post(protect, userRateLimiter, validateAddToHistory, addToHistory);
router.route("/get_all_activity").get(protect, userRateLimiter, getUserHistory);

export default router;