// Adapted and customized for ConnectNOW
import httpStatus from "http-status";
import { MeetingSession } from "../models/meetingSession.model.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";

// Generate clean 9-digit ID formatted as xxx-xxx-xxx
const generateMeetingId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let part1 = "";
    let part2 = "";
    let part3 = "";
    for (let i = 0; i < 3; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length));
        part2 += chars.charAt(Math.floor(Math.random() * chars.length));
        part3 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${part1}-${part2}-${part3}`;
};

// Create a new meeting
const createMeeting = async (req, res, next) => {
    const { password } = req.body;

    try {
        let meetingId = generateMeetingId();
        
        // Ensure uniqueness
        let existing = await MeetingSession.findOne({ meetingId });
        while (existing) {
            meetingId = generateMeetingId();
            existing = await MeetingSession.findOne({ meetingId });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

        const newMeeting = new MeetingSession({
            meetingId,
            host: req.user ? req.user._id : null,
            password: hashedPassword,
            participants: req.user ? [req.user._id] : [],
            status: "active"
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            message: "Meeting created successfully",
            meetingId,
            passwordProtected: !!password
        });
    } catch (e) {
        next(e);
    }
};

// Join a meeting
const joinMeeting = async (req, res, next) => {
    const { meetingId, password } = req.body;

    if (!meetingId) {
        return res.status(400).json({ message: "Meeting ID is required" });
    }

    const cleanId = meetingId.toLowerCase().trim();

    try {
        let meeting = await MeetingSession.findOne({ meetingId: cleanId })
            .populate("host", "name username avatar");
        
        if (!meeting) {
            // Auto-create active meeting session if joined directly
            meeting = new MeetingSession({
                meetingId: cleanId,
                host: req.user ? req.user._id : null,
                participants: req.user ? [req.user._id] : [],
                status: "active"
            });
            await meeting.save();
        } else if (meeting.status === "ended") {
            meeting.status = "active";
            meeting.endedAt = undefined;
            await meeting.save();
        }

        // Check password if set
        if (meeting.password) {
            if (!password) {
                return res.status(httpStatus.UNAUTHORIZED).json({ 
                    message: "Password required", 
                    passwordRequired: true 
                });
            }
            const isPasswordCorrect = await bcrypt.compare(password, meeting.password);
            if (!isPasswordCorrect) {
                return res.status(httpStatus.UNAUTHORIZED).json({ 
                    message: "Incorrect meeting password",
                    passwordRequired: true
                });
            }
        }

        // Add user to participants if they are logged in and not already listed
        if (req.user && !meeting.participants.some(p => p && p.toString() === req.user._id.toString())) {
            meeting.participants.push(req.user._id);
            await meeting.save();
        }

        return res.status(httpStatus.OK).json({
            message: "Successfully joined meeting",
            meetingId: meeting.meetingId,
            host: meeting.host,
            isHost: req.user && meeting.host ? meeting.host._id.toString() === req.user._id.toString() : false
        });
    } catch (e) {
        next(e);
    }
};

// Get active meeting details
const getMeetingInfo = async (req, res, next) => {
    const { id } = req.params;
    const cleanId = (id || "").toLowerCase().trim();

    try {
        let meeting = await MeetingSession.findOne({ meetingId: cleanId })
            .populate("host", "name username email avatar")
            .populate("participants", "name username email avatar");

        if (!meeting) {
            // Auto-create active meeting session for valid room codes so guest joins never fail
            meeting = new MeetingSession({
                meetingId: cleanId,
                host: req.user ? req.user._id : null,
                participants: req.user ? [req.user._id] : [],
                status: "active"
            });
            await meeting.save();
        } else if (meeting.status === "ended") {
            // Reactivate meeting if users or guests join
            meeting.status = "active";
            meeting.endedAt = undefined;
            await meeting.save();
        }

        // Add user to participants if they are logged in and not already listed
        if (req.user && !meeting.participants.some(p => p && p._id && p._id.toString() === req.user._id.toString())) {
            meeting.participants.push(req.user._id);
            await meeting.save();
            await meeting.populate("participants", "name username email avatar");
        }

        return res.status(httpStatus.OK).json({
            meetingId: meeting.meetingId,
            host: meeting.host,
            participants: meeting.participants,
            isHost: req.user && meeting.host ? meeting.host._id.toString() === req.user._id.toString() : false,
            passwordProtected: !!meeting.password
        });
    } catch (e) {
        next(e);
    }
};



export { createMeeting, joinMeeting, getMeetingInfo };

