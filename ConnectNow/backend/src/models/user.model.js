import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        avatar: { type: String, default: "" },
        resetPasswordToken: { type: String },
        resetPasswordExpire: { type: Date },
        token: { type: String } // kept for backward compatibility if needed
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userScheme);

export { User };