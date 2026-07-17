import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
    {
        meetingId: { type: String, required: true, unique: true },
        host: { type: Schema.Types.ObjectId, ref: "User", required: true },
        password: { type: String }, // Hashed optional password
        participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
        status: { type: String, enum: ["active", "ended"], default: "active" },
        endedAt: { type: Date },
        // Legacy support
        user_id: { type: String },
        meetingCode: { type: String },
        date: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };