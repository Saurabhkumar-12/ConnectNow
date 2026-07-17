// Adapted and customized for ConnectNOW
import mongoose, { Schema } from "mongoose";

const meetingSessionSchema = new Schema(
    {
        meetingId: { type: String, required: true, unique: true },
        host: { type: Schema.Types.ObjectId, ref: "User", required: true },
        password: { type: String }, // Hashed optional password
        participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
        status: { type: String, enum: ["active", "ended"], default: "active" },
        endedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

const MeetingSession = mongoose.model("MeetingSession", meetingSessionSchema);

export { MeetingSession };
