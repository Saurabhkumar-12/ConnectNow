// Adapted and customized for ConnectNOW
import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
    recordFailedAuthAttempt,
    clearFailedAuthAttempt
} from "../middleware/rateLimiter.middleware.js";

// Generate JWT Helper
const generateToken = (id) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is missing!");
    }
    return jwt.sign({ id }, secret, {
        expiresIn: "30d"
    });
};

// Login User
const login = async (req, res, next) => {
    const { email, username, password } = req.body;

    // Support logging in with email OR username
    const loginQuery = email ? { email: email.toLowerCase() } : { username: username.trim() };

    try {
        const user = await User.findOne(loginQuery);
        if (!user) {
            recordFailedAuthAttempt(req);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            clearFailedAuthAttempt(req);
            const token = generateToken(user._id);

            return res.status(httpStatus.OK).json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        } else {
            recordFailedAuthAttempt(req);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });
        }
    } catch (e) {
        next(e);
    }
};

// Register User
const register = async (req, res, next) => {
    const { name, username, email, password } = req.body;

    try {
        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            return res.status(httpStatus.CONFLICT).json({ message: "Username or email already exists" });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            return res.status(httpStatus.CONFLICT).json({ message: "Username or email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        next(e);
    }
};

// Forgot Password Flow (Prevents Account Enumeration)
const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        const isDev = process.env.NODE_ENV === "development";
        let resetUrl;

        if (user) {
            // Generate raw token
            const resetToken = crypto.randomBytes(20).toString("hex");

            // Hash and set in DB with 10-minute expiry
            user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
            user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await user.save();

            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;
            
            console.log(`[SIMULATED EMAIL] Password reset URL for ${normalizedEmail}: ${resetUrl}`);
        }

        // Return generic success message regardless of account existence to prevent enumeration
        const responseData = {
            message: "If an account with that email exists, password reset instructions have been sent."
        };

        if (isDev && resetUrl) {
            responseData.resetUrl = resetUrl;
        }

        return res.status(httpStatus.OK).json(responseData);
    } catch (e) {
        next(e);
    }
};

// Reset Password Flow
const resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Hash token to search
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired reset token" });
        }

        // Set new password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        return res.status(httpStatus.OK).json({ message: "Password updated successfully" });
    } catch (e) {
        next(e);
    }
};

// Get User Profile
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        return res.status(httpStatus.OK).json(user);
    } catch (e) {
        next(e);
    }
};

// Update User Profile & Avatar
const updateUserProfile = async (req, res, next) => {
    const { name } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        if (name) user.name = name.trim();

        // If file was uploaded via Multer, update avatar path safely
        if (req.file) {
            // Delete old avatar if it exists locally, using path.basename to prevent path traversal
            if (user.avatar && user.avatar.startsWith("uploads/")) {
                const safeFilename = path.basename(user.avatar);
                const oldPath = path.join(process.cwd(), "uploads", safeFilename);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                    } catch (unlinkErr) {
                        console.error("Failed to delete old avatar file:", unlinkErr.message);
                    }
                }
            }
            user.avatar = `uploads/${req.file.filename}`;
        }

        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (e) {
        next(e);
    }
};

// Get User History
const getUserHistory = async (req, res, next) => {
    try {
        if (!req.user || !req.user.username) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Not authorized to retrieve history" });
        }

        const meetings = await Meeting.find({ user_id: req.user.username }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        next(e);
    }
};

// Add Meeting to History
const addToHistory = async (req, res, next) => {
    const { meeting_code } = req.body;

    try {
        if (!req.user || !req.user.username) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Not authorized to add to history" });
        }

        const newMeeting = new Meeting({
            user_id: req.user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        next(e);
    }
};

export {
    login,
    register,
    forgotPassword,
    resetPassword,
    getUserProfile,
    updateUserProfile,
    getUserHistory,
    addToHistory
};