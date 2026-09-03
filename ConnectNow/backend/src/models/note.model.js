// ConnectNOW - Note Model Schema
import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        content: { type: String, required: true, maxlength: 50000 }
    },
    {
        timestamps: true
    }
);

noteSchema.index({ user: 1, updatedAt: -1 });

const Note = mongoose.model("Note", noteSchema);


export { Note };
