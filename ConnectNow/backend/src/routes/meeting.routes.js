// Adapted and customized for ConnectNOW
import { Router } from "express";
import { createMeeting, joinMeeting, getMeetingInfo } from "../controllers/meeting.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all meeting configuration/joining operations
router.route("/create").post(protect, createMeeting);
router.route("/join").post(protect, joinMeeting);
router.route("/:id").get(protect, getMeetingInfo);

export default router;
