// ConnectNOW - Code Execution Controller
import httpStatus from "http-status";
import { executeCode } from "../services/codeExecutor.service.js";

/**
 * Handle Code Execution Request
 */
export const runCodeExecution = async (req, res, next) => {
    const { language, code, stdin } = req.body || {};

    try {
        const result = await executeCode({
            language,
            code,
            stdin: stdin || ""
        });

        // Return clean status and output payload
        return res.status(httpStatus.OK).json(result);
    } catch (e) {
        next(e);
    }
};
