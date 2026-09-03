// ConnectNOW - Notes Controller with IDOR Defense & .tst Export/Import
import httpStatus from "http-status";
import { Note } from "../models/note.model.js";

/**
 * Create a new Note for authenticated user
 */
export const createNote = async (req, res, next) => {
    const { title, content } = req.body;

    try {
        const newNote = new Note({
            user: req.user._id,
            title: title.trim(),
            content: content
        });

        await newNote.save();
        return res.status(httpStatus.CREATED).json(newNote);
    } catch (e) {
        next(e);
    }
};

/**
 * List all notes belonging strictly to the authenticated user
 */
export const getNotes = async (req, res, next) => {
    try {
        const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 });
        return res.status(httpStatus.OK).json(notes);
    } catch (e) {
        next(e);
    }
};

/**
 * Get a single note by ID with strict ownership validation (IDOR Defense)
 */
export const getNoteById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const note = await Note.findOne({ _id: id, user: req.user._id });
        if (!note) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Note not found or access denied" });
        }
        return res.status(httpStatus.OK).json(note);
    } catch (e) {
        next(e);
    }
};

/**
 * Update an existing note with strict ownership validation
 */
export const updateNote = async (req, res, next) => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
        const note = await Note.findOne({ _id: id, user: req.user._id });
        if (!note) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Note not found or access denied" });
        }

        if (title !== undefined) note.title = title.trim();
        if (content !== undefined) note.content = content;

        await note.save();
        return res.status(httpStatus.OK).json(note);
    } catch (e) {
        next(e);
    }
};

/**
 * Delete a note with strict ownership validation
 */
export const deleteNote = async (req, res, next) => {
    const { id } = req.params;

    try {
        const note = await Note.findOneAndDelete({ _id: id, user: req.user._id });
        if (!note) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Note not found or access denied" });
        }
        return res.status(httpStatus.OK).json({ message: "Note deleted successfully", id });
    } catch (e) {
        next(e);
    }
};

/**
 * Export Note as structured .tst file
 */
export const exportNoteTst = async (req, res, next) => {
    const { id } = req.params;

    try {
        const note = await Note.findOne({ _id: id, user: req.user._id });
        if (!note) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Note not found or access denied" });
        }

        // Format .tst file body
        const tstContent = [
            "--- CONNECTNOW NOTE (.tst) ---",
            "VERSION: 1.0",
            `TITLE: ${note.title}`,
            `CREATED: ${note.createdAt.toISOString()}`,
            `MODIFIED: ${note.updatedAt.toISOString()}`,
            "--- CONTENT ---",
            note.content
        ].join("\n");

        // Sanitize filename for HTTP header
        const safeFilename = note.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "note";

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.tst"`);
        return res.status(httpStatus.OK).send(tstContent);
    } catch (e) {
        next(e);
    }
};

/**
 * Import Note from uploaded .tst file content
 */
export const importNoteTst = async (req, res, next) => {
    try {
        let tstText = "";

        if (req.file) {
            tstText = req.file.buffer.toString("utf8");
        } else if (req.body && typeof req.body.tstText === "string") {
            tstText = req.body.tstText;
        } else {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide a valid .tst file or content" });
        }

        if (tstText.length > 100000) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: ".tst file exceeds maximum size limit of 100KB" });
        }

        // Validate Header Format
        if (!tstText.includes("--- CONNECTNOW NOTE (.tst) ---") || !tstText.includes("--- CONTENT ---")) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Invalid .tst file format. Missing required ConnectNOW headers."
            });
        }

        // Parse Title from header
        let title = "Imported Note";
        const titleMatch = tstText.match(/^TITLE:\s*(.+)$/m);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim().slice(0, 200);
        }

        // Parse Content section
        const contentParts = tstText.split("--- CONTENT ---");
        const rawContent = contentParts.slice(1).join("--- CONTENT ---").trim();

        if (!rawContent) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Imported .tst note content cannot be empty" });
        }

        if (rawContent.length > 50000) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Imported note content exceeds 50,000 characters limit" });
        }

        // Create Note assigned strictly to current authenticated user
        const newNote = new Note({
            user: req.user._id,
            title,
            content: rawContent
        });

        await newNote.save();
        return res.status(httpStatus.CREATED).json({
            message: "Note imported successfully",
            note: newNote
        });
    } catch (e) {
        next(e);
    }
};
