// ConnectNOW - Code Execution Routes
import { Router } from "express";
import { runCodeExecution } from "../controllers/code.controller.js";
import { userRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { mongoSanitizer, validateCodeExecution } from "../middleware/validation.middleware.js";
import { optionalProtect } from "../middleware/auth.middleware.js";

const router = Router();

// Apply NoSQL injection sanitizer
router.use(mongoSanitizer);

// Rate-limited and validated code execution endpoint (supports both authenticated users & guests in call)
router.route("/execute").post(optionalProtect, userRateLimiter, validateCodeExecution, runCodeExecution);

export default router;
