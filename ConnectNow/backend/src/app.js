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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

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

// Serve uploaded avatars
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);

const start = async () => {
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