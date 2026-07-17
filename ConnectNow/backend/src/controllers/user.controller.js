// Adapted and customized for ConnectNOW
import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Generate JWT Helper
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "connectnow_secret_key_12345", {
        expiresIn: "30d"
    });
};

// Login User
const login = async (req, res) => {
    const { email, username, password } = req.body;

    // Support logging in with email OR username
    const loginQuery = email ? { email } : { username };

    if ((!email && !username) || !password) {
        return res.status(400).json({ message: "Please provide credentials and password" });
    }

    try {
        const user = await User.findOne(loginQuery);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const token = generateToken(user._id);
            // Sync with old token if any legacy logic checks it
            user.token = token;
            await user.save();

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
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });
        }
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Register User
const register = async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    try {
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(httpStatus.FOUND).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(httpStatus.FOUND).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Forgot Password Flow
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "No user found with that email" });
        }

        // Generate raw token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash and set in DB with 10-minute expiry
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // Local development response: Return the reset URL directly in the payload
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        return res.status(httpStatus.OK).json({
            message: "Password reset link generated successfully (Simulated Email)",
            resetUrl // Returned directly so user can click it in local dev
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Reset Password Flow
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "Please provide a new password" });
    }

    try {
        // Hash token to search
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Set new password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        return res.status(httpStatus.OK).json({ message: "Password updated successfully" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Get User Profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(user);
    } catch (e) {
        return res.status(500).json({ message: `Error retrieving profile: ${e.message}` });
    }
};

// Update User Profile & Avatar
const updateUserProfile = async (req, res) => {
    const { name } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name) user.name = name;

        // If file was uploaded via Multer, update avatar path
        if (req.file) {
            // Delete old avatar if it exists locally
            if (user.avatar && user.avatar.startsWith("uploads/")) {
                const oldPath = path.join(process.cwd(), user.avatar);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            user.avatar = `uploads/${req.file.filename}`;
        }

        await user.save();

        return res.status(200).json({
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
        return res.status(500).json({ message: `Error updating profile: ${e.message}` });
    }
};

// Get User History (Backwards compatible)
const getUserHistory = async (req, res) => {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    try {
        let username;
        if (req.user) {
            username = req.user.username;
        } else if (token) {
            const user = await User.findOne({ token: token });
            if (user) username = user.username;
        }

        if (!username) {
            return res.status(401).json({ message: "Not authorized to retrieve history" });
        }

        const meetings = await Meeting.find({ user_id: username });
        return res.json(meetings);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Add Meeting to History (Backwards compatible)
const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    const token = req.body.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    try {
        let username;
        if (req.user) {
            username = req.user.username;
        } else if (token) {
            const user = await User.findOne({ token: token });
            if (user) username = user.username;
        }

        if (!username) {
            return res.status(401).json({ message: "Not authorized to add to history" });
        }

        const newMeeting = new Meeting({
            user_id: username,
            meetingCode: meeting_code
        });

        await newMeeting.save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
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