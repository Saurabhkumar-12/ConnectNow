// Adapted and customized for ConnectNOW
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error("SECURITY ERROR: JWT_SECRET environment variable is missing!");
                return res.status(500).json({ message: "Server authentication configuration error" });
            }

            // Verify token
            const decoded = jwt.verify(token, secret);

            // Get user from the token, exclude password
            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            return next();
        } catch (error) {
            console.error("JWT Auth Middleware Error:", error.message);
            return res.status(401).json({ message: "Not authorized, invalid or expired token" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }
};

const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const secret = process.env.JWT_SECRET;
            if (secret && token) {
                const decoded = jwt.verify(token, secret);
                req.user = await User.findById(decoded.id).select("-password");
            }
        } catch (error) {
            console.error("Optional JWT Auth Error:", error.message);
            return res.status(401).json({ message: "Not authorized, invalid or expired token" });
        }
    }
    return next();
};

export { protect, optionalProtect };


