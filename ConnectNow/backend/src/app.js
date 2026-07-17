// Adapted and customized for ConnectNOW
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT || 8000));
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Serve uploaded avatars
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);

const start = async () => {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/connectnow";
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