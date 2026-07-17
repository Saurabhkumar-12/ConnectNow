// Adapted and customized for ConnectNOW
import httpStatus from "http-status";
import { Meeting } from "../models/meeting.model.js";
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
const createMeeting = async (req, res) => {
    const { password } = req.body;

    try {
        let meetingId = generateMeetingId();
        
        // Ensure uniqueness
        let existing = await Meeting.findOne({ meetingId });
        while (existing) {
            meetingId = generateMeetingId();
            existing = await Meeting.findOne({ meetingId });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

        const newMeeting = new Meeting({
            meetingId,
            host: req.user._id,
            password: hashedPassword,
            participants: [req.user._id],
            status: "active",
            // Backwards compatibility fields
            user_id: req.user.username,
            meetingCode: meetingId
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            message: "Meeting created successfully",
            meetingId,
            passwordProtected: !!password
        });
    } catch (e) {
        return res.status(500).json({ message: `Failed to create meeting: ${e.message}` });
    }
};

// Join a meeting
const joinMeeting = async (req, res) => {
    const { meetingId, password } = req.body;

    if (!meetingId) {
        return res.status(400).json({ message: "Meeting ID is required" });
    }

    try {
        const meeting = await Meeting.findOne({ meetingId, status: "active" }).populate("host", "name username avatar");
        
        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Meeting not found or has already ended" });
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
        if (req.user && !meeting.participants.includes(req.user._id)) {
            meeting.participants.push(req.user._id);
            await meeting.save();
        }

        return res.status(httpStatus.OK).json({
            message: "Successfully joined meeting",
            meetingId: meeting.meetingId,
            host: meeting.host,
            isHost: req.user ? meeting.host._id.toString() === req.user._id.toString() : false
        });
    } catch (e) {
        return res.status(500).json({ message: `Failed to join meeting: ${e.message}` });
    }
};

// Get active meeting details
const getMeetingInfo = async (req, res) => {
    const { id } = req.params;

    try {
        const meeting = await Meeting.findOne({ meetingId: id, status: "active" })
            .populate("host", "name username email avatar")
            .populate("participants", "name username email avatar");

        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Active meeting not found" });
        }

        return res.status(httpStatus.OK).json({
            meetingId: meeting.meetingId,
            host: meeting.host,
            participants: meeting.participants,
            isHost: req.user ? meeting.host._id.toString() === req.user._id.toString() : false,
            passwordProtected: !!meeting.password
        });
    } catch (e) {
        return res.status(500).json({ message: `Failed to get meeting info: ${e.message}` });
    }
};

export { createMeeting, joinMeeting, getMeetingInfo };
