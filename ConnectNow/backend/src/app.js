// Adapted and customized for ConnectNOW
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import codeRoutes from "./routes/code.routes.js";
import noteRoutes from "./routes/note.routes.js";
import { publicRateLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// Enable reverse proxy trust for IP rate limiting & security headers behind proxies/load balancers
app.set("trust proxy", process.env.TRUST_PROXY || 1);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000"
].filter(Boolean);

const isOriginAllowed = (origin, allowed) => {
    if (!origin) return true;
    if (allowed.includes(origin)) return true;
    if (origin.endsWith(".vercel.app") && origin.includes("saurabh-kumar")) return true;
    return false;
};

app.set("port", (process.env.PORT || 8000));

// Basic Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin, allowedOrigins)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Serve uploaded avatars securely (rate limited, no script execution)
app.use("/uploads", publicRateLimiter, (req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self' data:;");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
}, express.static(path.join(process.cwd(), "uploads")));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);
app.use("/api/v1/code", codeRoutes);
app.use("/api/v1/notes", noteRoutes);


// Catch 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
    if (!process.env.JWT_SECRET) {
        console.warn("WARNING: JWT_SECRET environment variable is not defined! Using fallback secret in non-production.");
        if (process.env.NODE_ENV === "production") {
            console.error("FATAL ERROR: JWT_SECRET must be configured in production!");
            process.exit(1);
        }
    }

    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/connectnow";
    console.log("Connecting to Database...", mongoUrl.replace(/:([^@]+)@/, ":****@"));
    try {
        const connectionDb = await mongoose.connect(mongoUrl);
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
    } catch (err) {
        console.error("MONGO Connection Failed! Video/audio signaling will work, but database features (login/history) will be disabled. Error:", err.message);
    }

    server.listen(app.get("port"), () => {
        console.log(`Server listening on port ${app.get("port")}`);
    });
};

start();