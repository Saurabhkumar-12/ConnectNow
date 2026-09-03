// ConnectNOW - Isolated Code Execution Sandbox Service
import { spawn, execFile } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_EXECUTION_TIME_MS = 5000; // 5 seconds hard cap
const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB max stdout/stderr limit

/**
 * Minimal environment object for sandboxed processes
 * Strips all sensitive application environment variables (MONGO_URL, JWT_SECRET, etc.)
 */
const getSanitizedEnv = () => {
    return {
        PATH: process.env.PATH || "/usr/bin:/bin:/usr/local/bin",
        SYSTEMROOT: process.env.SYSTEMROOT || "C:\\Windows",
        TEMP: process.env.TEMP || "/tmp",
        TMP: process.env.TMP || "/tmp"
    };
};

/**
 * Ensures temporary sandbox directory exists
 */
const getSandboxDir = () => {
    const sandboxDir = path.join(process.cwd(), "scratch", "sandboxes");
    if (!fs.existsSync(sandboxDir)) {
        fs.mkdirSync(sandboxDir, { recursive: true });
    }
    return sandboxDir;
};

/**
 * Safely removes a directory and all contained temporary files
 */
const cleanupSandbox = (dirPath) => {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (err) {
        console.error(`Sandbox cleanup failed for ${dirPath}:`, err.message);
    }
};

/**
 * Execute a command with strict timeout, stdin, stdout, stderr, and resource caps
 */
const runProcess = ({ command, args, cwd, stdinText = "", timeoutMs = MAX_EXECUTION_TIME_MS }) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const child = spawn(command, args, {
            cwd,
            env: getSanitizedEnv(),
            windowsHide: true
        });

        // Kill process tree if execution exceeds timeout limit
        const timer = setTimeout(() => {
            timedOut = true;
            try {
                child.kill("SIGKILL");
            } catch (e) { }
        }, timeoutMs);

        // Feed optional stdin input and close stdin stream so child process doesn't block on read
        if (child.stdin) {
            if (stdinText) {
                child.stdin.write(stdinText);
            }
            child.stdin.end();
        }


        // Capture stdout with size limit
        child.stdout?.on("data", (data) => {
            if (stdout.length < MAX_OUTPUT_BYTES) {
                stdout += data.toString();
            }
        });

        // Capture stderr with size limit
        child.stderr?.on("data", (data) => {
            if (stderr.length < MAX_OUTPUT_BYTES) {
                stderr += data.toString();
            }
        });

        child.on("error", (err) => {
            clearTimeout(timer);
            resolve({
                status: "runtime_error",
                stdout,
                stderr: err.message || "Failed to start execution process",
                executionTime: Date.now() - startTime,
                exitCode: 1
            });
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            const executionTime = Date.now() - startTime;

            if (timedOut) {
                return resolve({
                    status: "timeout",
                    stdout,
                    stderr: `Execution timed out after ${timeoutMs / 1000} seconds. Maximum execution limit exceeded.`,
                    executionTime,
                    exitCode: 124
                });
            }

            if (code !== 0) {
                return resolve({
                    status: "runtime_error",
                    stdout,
                    stderr: stderr || `Process exited with code ${code}`,
                    executionTime,
                    exitCode: code
                });
            }

            return resolve({
                status: "success",
                stdout,
                stderr,
                executionTime,
                exitCode: 0
            });
        });
    });
};

/**
 * Main Code Execution Sandbox Engine
 */
export const executeCode = async ({ language, code, stdin = "" }) => {
    const lang = (language || "").toLowerCase().trim();
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const sandboxDir = path.join(getSandboxDir(), `box_${uniqueId}`);

    fs.mkdirSync(sandboxDir, { recursive: true });

    try {
        if (lang === "javascript") {
            const filePath = path.join(sandboxDir, "script.js");
            fs.writeFileSync(filePath, code, "utf8");

            const nodeCmd = process.platform === "win32" ? "node.exe" : "node";
            return await runProcess({
                command: nodeCmd,
                args: ["script.js"],
                cwd: sandboxDir,
                stdinText: stdin
            });
        }

        if (lang === "python") {
            const filePath = path.join(sandboxDir, "script.py");
            fs.writeFileSync(filePath, code, "utf8");

            const pythonCmd = process.platform === "win32" ? "python" : "python3";
            return await runProcess({
                command: pythonCmd,
                args: ["script.py"],
                cwd: sandboxDir,
                stdinText: stdin
            });
        }

        if (lang === "cpp") {
            const sourcePath = path.join(sandboxDir, "main.cpp");
            const exePath = path.join(sandboxDir, process.platform === "win32" ? "main.exe" : "main");
            fs.writeFileSync(sourcePath, code, "utf8");

            // Step 1: Compile C++ with g++
            const compileResult = await runProcess({
                command: "g++",
                args: ["main.cpp", "-o", exePath],
                cwd: sandboxDir,
                timeoutMs: 10000 // 10s compile window
            });

            if (compileResult.status !== "success" || compileResult.exitCode !== 0) {
                return {
                    status: "compile_error",
                    stdout: "",
                    stderr: compileResult.stderr || compileResult.stdout || "C++ Compilation failed",
                    executionTime: compileResult.executionTime
                };
            }

            // Step 2: Run compiled executable
            return await runProcess({
                command: exePath,
                args: [],
                cwd: sandboxDir,
                stdinText: stdin
            });
        }

        if (lang === "java") {
            const sourcePath = path.join(sandboxDir, "Main.java");
            fs.writeFileSync(sourcePath, code, "utf8");

            // Step 1: Compile Java with javac
            const compileResult = await runProcess({
                command: "javac",
                args: ["Main.java"],
                cwd: sandboxDir,
                timeoutMs: 10000
            });

            if (compileResult.status !== "success" || compileResult.exitCode !== 0) {
                return {
                    status: "compile_error",
                    stdout: "",
                    stderr: compileResult.stderr || compileResult.stdout || "Java Compilation failed",
                    executionTime: compileResult.executionTime
                };
            }

            // Step 2: Run Java class
            return await runProcess({
                command: "java",
                args: ["Main"],
                cwd: sandboxDir,
                stdinText: stdin
            });
        }

        if (lang === "html") {
            // HTML Static Preview Output
            return {
                status: "success",
                stdout: code,
                stderr: "",
                executionTime: 5
            };
        }

        if (lang === "css") {
            // CSS Static Preview Output
            return {
                status: "success",
                stdout: `/* CSS Compiled Style Output */\n${code}`,
                stderr: "",
                executionTime: 5
            };
        }

        return {
            status: "invalid_input",
            stdout: "",
            stderr: `Unsupported programming language: '${language}'. Allowed languages: javascript, python, cpp, java, html, css.`,
            executionTime: 0
        };
    } finally {
        cleanupSandbox(sandboxDir);
    }
};
