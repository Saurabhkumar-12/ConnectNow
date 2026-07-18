// Adapted and customized for ConnectNOW
import { Server } from "socket.io";
import { MeetingSession } from "../models/meetingSession.model.js";

let connections = {};
let messages = {};
let timeOnline = {};
let socketUsers = {}; // Map socket.id -> userDetails { id, name, username, avatar }
let waitingList = {}; // Map roomCode -> Array of socket.ids
let roomHosts = {}; // Map roomCode -> hostSocketId
let emptyRoomTimeouts = {}; // Map roomCode -> Timeout ID

export const connectToSocket = (server) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:3000"
    ].filter(Boolean);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("SOCKET CONNECTED:", socket.id);

        // Client requests to join a call
        socket.on("join-call", async (pathUrl, userDetails) => {
            // Extract the meeting ID from the URL path (e.g. http://localhost:3000/abc-def-ghi -> abc-def-ghi)
            const roomCode = pathUrl.split("/").pop();
            
            // Cancel empty room timeout if any
            if (emptyRoomTimeouts[roomCode]) {
                clearTimeout(emptyRoomTimeouts[roomCode]);
                delete emptyRoomTimeouts[roomCode];
                console.log(`Cancelled empty room timeout for room ${roomCode}`);
            }
            
            // Store user details associated with the socket
            socketUsers[socket.id] = userDetails || {
                id: socket.id,
                name: `Guest-${socket.id.slice(0, 4)}`,
                username: `guest_${socket.id.slice(0, 4)}`,
                avatar: ""
            };

            timeOnline[socket.id] = new Date();

            try {
                // Fetch the meeting from DB to check host status
                const meeting = await MeetingSession.findOne({ meetingId: roomCode, status: "active" });

                if (meeting) {
                    const hostId = meeting.host.toString();
                    const currentUserId = socketUsers[socket.id].id;
                    const isHost = hostId === currentUserId;

                    if (isHost) {
                        // Mark this socket as the active host socket for the room
                        roomHosts[roomCode] = socket.id;
                        console.log(`Host ${socketUsers[socket.id].name} joined room ${roomCode}`);
                        
                        // Accept host immediately
                        acceptUserIntoRoom(socket, roomCode, io);
                        
                        // Notify host about any users already in the waiting list
                        if (waitingList[roomCode] && waitingList[roomCode].length > 0) {
                            const pendingUsers = waitingList[roomCode].map(sid => ({
                                socketId: sid,
                                user: socketUsers[sid]
                            }));
                            io.to(socket.id).emit("waiting-list-update", pendingUsers);
                        }
                    } else {
                        // User is a guest. Is the host already connected?
                        // If host is connected, add to waiting room
                        const hostSocketId = roomHosts[roomCode];

                        if (hostSocketId && io.sockets.sockets.has(hostSocketId)) {
                            console.log(`Guest ${socketUsers[socket.id].name} added to waiting list for room ${roomCode}`);
                            if (!waitingList[roomCode]) waitingList[roomCode] = [];
                            if (!waitingList[roomCode].includes(socket.id)) {
                                waitingList[roomCode].push(socket.id);
                            }

                            // Notify guest they are in the waiting room
                            socket.emit("waiting-room-status", { inWaitingRoom: true });

                            // Notify the host about the new waiting user
                            const pendingUsers = waitingList[roomCode].map(sid => ({
                                socketId: sid,
                                user: socketUsers[sid]
                            }));
                            io.to(hostSocketId).emit("waiting-list-update", pendingUsers);
                        } else {
                            // If the host is not in the room yet, let guests join directly (fallback),
                            // or keep them waiting. Let's let them join directly to ensure the meeting doesn't block.
                            console.log(`Host not present in room ${roomCode}. Letting guest join directly.`);
                            acceptUserIntoRoom(socket, roomCode, io);
                        }
                    }
                } else {
                    // Fallback for ad-hoc rooms not in database: let everyone join directly
                    acceptUserIntoRoom(socket, roomCode, io);
                }
            } catch (err) {
                console.error("Error in join-call handler:", err.message);
                // Fallback join if DB query fails
                acceptUserIntoRoom(socket, roomCode, io);
            }
        });

        // Host approves a waiting user
        socket.on("approve-user", (roomCode, guestSocketId) => {
            // Verify if sender is the host
            if (roomHosts[roomCode] !== socket.id) {
                return socket.emit("error-message", "Only the host can approve participants");
            }

            console.log(`Host approved guest ${guestSocketId} in room ${roomCode}`);

            // Remove from waiting list
            if (waitingList[roomCode]) {
                waitingList[roomCode] = waitingList[roomCode].filter(sid => sid !== guestSocketId);
            }

            const guestSocket = io.sockets.sockets.get(guestSocketId);
            if (guestSocket) {
                // Notify guest they are approved
                guestSocket.emit("waiting-room-status", { inWaitingRoom: false, approved: true });
                
                // Formally join the guest into the call
                acceptUserIntoRoom(guestSocket, roomCode, io);
            }

            // Update host's waiting list UI
            const pendingUsers = (waitingList[roomCode] || []).map(sid => ({
                socketId: sid,
                user: socketUsers[sid]
            }));
            socket.emit("waiting-list-update", pendingUsers);
        });

        // Host rejects a waiting user
        socket.on("reject-user", (roomCode, guestSocketId) => {
            if (roomHosts[roomCode] !== socket.id) {
                return socket.emit("error-message", "Only the host can reject participants");
            }

            console.log(`Host rejected guest ${guestSocketId} in room ${roomCode}`);

            if (waitingList[roomCode]) {
                waitingList[roomCode] = waitingList[roomCode].filter(sid => sid !== guestSocketId);
            }

            const guestSocket = io.sockets.sockets.get(guestSocketId);
            if (guestSocket) {
                guestSocket.emit("waiting-room-status", { inWaitingRoom: false, approved: false, message: "Host rejected your join request." });
            }

            // Update host's waiting list UI
            const pendingUsers = (waitingList[roomCode] || []).map(sid => ({
                socketId: sid,
                user: socketUsers[sid]
            }));
            socket.emit("waiting-list-update", pendingUsers);
        });

        // WebRTC Signaling
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // Chat messages
        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    sender: sender,
                    data: data,
                    "socket-id-sender": socket.id
                });
                console.log("Message in room", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // Host Control: Mute participant microphone
        socket.on("mute-participant", (roomCode, targetSocketId) => {
            if (roomHosts[roomCode] !== socket.id) {
                return socket.emit("error-message", "Only the host can mute participants");
            }
            console.log(`Host requested to mute ${targetSocketId} in room ${roomCode}`);
            io.to(targetSocketId).emit("force-mute-mic");
        });

        // Host Control: Kick participant
        socket.on("kick-participant", (roomCode, targetSocketId) => {
            if (roomHosts[roomCode] !== socket.id) {
                return socket.emit("error-message", "Only the host can kick participants");
            }
            console.log(`Host kicked ${targetSocketId} from room ${roomCode}`);
            io.to(targetSocketId).emit("force-kicked-out");
        });

        // Host Control: End meeting for everyone
        socket.on("end-meeting-for-everyone", async (roomCode) => {
            if (roomHosts[roomCode] !== socket.id) {
                return socket.emit("error-message", "Only the host can end the meeting");
            }
            console.log(`Host ended meeting ${roomCode} for everyone`);

            try {
                // Update status in DB
                await MeetingSession.findOneAndUpdate(
                    { meetingId: roomCode, status: "active" },
                    { status: "ended", endedAt: new Date() }
                );
            } catch (e) {
                console.error("Error setting meeting ended in DB:", e.message);
            }

            // Notify everyone in the room
            if (connections[roomCode]) {
                connections[roomCode].forEach((sid) => {
                    io.to(sid).emit("meeting-ended-by-host");
                });
            }
        });

        // Collaborative Code Editor updates
        socket.on("code-update", (roomCode, data) => {
            if (connections[roomCode]) {
                connections[roomCode].forEach((sid) => {
                    if (sid !== socket.id) {
                        io.to(sid).emit("code-update", data);
                    }
                });
            }
        });

        socket.on("request-code-sync", (roomCode) => {
            const hostSocketId = roomHosts[roomCode];
            if (hostSocketId) {
                io.to(hostSocketId).emit("request-code-sync", socket.id);
            }
        });

        socket.on("send-code-sync", (guestSocketId, data) => {
            io.to(guestSocketId).emit("code-update", data);
        });

        // Clean up on disconnect
        socket.on("disconnect", () => {
            console.log("SOCKET DISCONNECTED:", socket.id);

            let diffTime = Math.abs(timeOnline[socket.id] - new Date());
            let roomCodeKey = null;

            // Search connections map to find which room this socket belonged to
            for (const [k, v] of Object.entries(connections)) {
                const index = v.indexOf(socket.id);
                if (index !== -1) {
                    roomCodeKey = k;
                    
                    // Remove user from the room roster
                    v.splice(index, 1);
                    console.log(`User ${socketUsers[socket.id]?.name} left room ${roomCodeKey}`);

                    // Notify remaining users in the room
                    v.forEach((sid) => {
                        io.to(sid).emit("user-left", socket.id);
                    });

                    // Broadcast the updated participant list
                    broadcastParticipantList(roomCodeKey, io);

                    if (v.length === 0) {
                        delete connections[roomCodeKey];
                        delete messages[roomCodeKey];
                        delete waitingList[roomCodeKey];
                        delete roomHosts[roomCodeKey];

                        // Start empty room timeout of 5 minutes
                        if (!emptyRoomTimeouts[roomCodeKey]) {
                            emptyRoomTimeouts[roomCodeKey] = setTimeout(async () => {
                                try {
                                    await MeetingSession.findOneAndUpdate(
                                        { meetingId: roomCodeKey, status: "active" },
                                        { status: "ended", endedAt: new Date() }
                                    );
                                    console.log(`Meeting ${roomCodeKey} ended due to empty room timeout`);
                                } catch (err) {
                                    console.error(`Error ending meeting ${roomCodeKey} on empty room timeout:`, err.message);
                                } finally {
                                    delete emptyRoomTimeouts[roomCodeKey];
                                }
                            }, 5 * 60 * 1000); // 5 minutes
                            console.log(`Scheduled empty room timeout for room ${roomCodeKey}`);
                        }
                    }
                    break;
                }
            }

            // Remove host reference if host disconnected
            for (const [roomCode, hostSid] of Object.entries(roomHosts)) {
                if (hostSid === socket.id) {
                    delete roomHosts[roomCode];
                    console.log(`Host disconnected from room ${roomCode}`);
                    break;
                }
            }

            // Remove from any waiting list
            for (const [roomCode, plist] of Object.entries(waitingList)) {
                const windex = plist.indexOf(socket.id);
                if (windex !== -1) {
                    plist.splice(windex, 1);
                    
                    // Update host waiting list UI
                    const hostSocketId = roomHosts[roomCode];
                    if (hostSocketId) {
                        const pendingUsers = plist.map(sid => ({
                            socketId: sid,
                            user: socketUsers[sid]
                        }));
                        io.to(hostSocketId).emit("waiting-list-update", pendingUsers);
                    }
                    break;
                }
            }

            delete timeOnline[socket.id];
            delete socketUsers[socket.id];
        });
    });

    return io;
};

// Formal helper to join user into the room
const acceptUserIntoRoom = (socket, roomCode, io) => {
    if (connections[roomCode] === undefined) {
        connections[roomCode] = [];
    }

    if (!connections[roomCode].includes(socket.id)) {
        connections[roomCode].push(socket.id);
    }

    // Notify all active users in the room about the new participant
    for (let a = 0; a < connections[roomCode].length; a++) {
        io.to(connections[roomCode][a]).emit(
            "user-joined", 
            socket.id, 
            connections[roomCode]
        );
    }

    // Broadcast the updated participant list
    broadcastParticipantList(roomCode, io);

    // Send previous chat messages to the newly joined user
    if (messages[roomCode] !== undefined) {
        for (let a = 0; a < messages[roomCode].length; ++a) {
            io.to(socket.id).emit(
                "chat-message",
                messages[roomCode][a]["data"],
                messages[roomCode][a]["sender"],
                messages[roomCode][a]["socket-id-sender"]
            );
        }
    }
};

// Helper to broadcast active participants list details (socket ID, name, avatar)
const broadcastParticipantList = (roomCode, io) => {
    if (connections[roomCode]) {
        const participantDetails = connections[roomCode].map(sid => ({
            socketId: sid,
            user: socketUsers[sid] || { name: "Guest", avatar: "" }
        }));
        
        connections[roomCode].forEach((sid) => {
            io.to(sid).emit("participant-list-update", participantDetails);
        });
    }
};
