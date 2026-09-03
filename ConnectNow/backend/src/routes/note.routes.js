// ConnectNOW - Notes Routes with IDOR Protection & .tst File Import
import { Router } from "express";
import multer from "multer";
import {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
    exportNoteTst,
    importNoteTst
} from "../controllers/note.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { userRateLimiter } from "../middleware/rateLimiter.middleware.js";
import {
    mongoSanitizer,
    validateNotePayload,
    validateNoteId
} from "../middleware/validation.middleware.js";

const router = Router();

// Apply NoSQL injection sanitizer
router.use(mongoSanitizer);

// Configure Multer for in-memory .tst file import processing
const uploadTst = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 } // 100KB limit
});

// All note endpoints strictly require user authentication
router.use(protect);
router.use(userRateLimiter);

router.route("/")
    .get(getNotes)
    .post(validateNotePayload, createNote);

router.route("/import")
    .post(uploadTst.single("tstFile"), importNoteTst);

router.route("/:id")
    .get(validateNoteId, getNoteById)
    .put(validateNoteId, validateNotePayload, updateNote)
    .delete(validateNoteId, deleteNote);

router.route("/:id/export")
    .get(validateNoteId, exportNoteTst);

export default router;
