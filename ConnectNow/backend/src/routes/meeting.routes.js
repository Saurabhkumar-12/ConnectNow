// Adapted and customized for ConnectNOW
import { Router } from "express";
import { createMeeting, joinMeeting, getMeetingInfo } from "../controllers/meeting.controller.js";
import { protect, optionalProtect } from "../middleware/auth.middleware.js";
import { userRateLimiter } from "../middleware/rateLimiter.middleware.js";
import {
    mongoSanitizer,
    validateCreateMeeting,
    validateJoinMeeting,
    validateGetMeetingInfo
} from "../middleware/validation.middleware.js";

const router = Router();

// Apply Mongo NoSQL injection sanitizer to meeting routes
router.use(mongoSanitizer);

// Support both logged in users and guests for meeting routes
router.route("/create").post(optionalProtect, userRateLimiter, validateCreateMeeting, createMeeting);
router.route("/join").post(optionalProtect, userRateLimiter, validateJoinMeeting, joinMeeting);
router.route("/:id").get(optionalProtect, userRateLimiter, validateGetMeetingInfo, getMeetingInfo);


export default router;

