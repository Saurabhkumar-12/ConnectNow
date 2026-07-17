// Adapted and customized for ConnectNOW
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
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

const router = Router();

// Configure Multer for Avatar Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        // Ensure folder exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Please upload an image file (JPG/PNG)"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Auth Routes
router.route("/login").post(login);
router.route("/register").post(register);

// Password Recovery Routes
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

// Profile Routes (Protected by JWT)
router.route("/profile")
    .get(protect, getUserProfile)
    .put(protect, upload.single("avatar"), updateUserProfile);

// Activity History Routes (Backwards compatible)
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);

export default router;