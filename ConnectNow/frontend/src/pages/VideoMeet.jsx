// Adapted and customized for ConnectNOW
import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { 
    Badge, 
    IconButton, 
    Button,
    Card,
    Avatar
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';




import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        { "urls": "stun:stun2.l.google.com:19302" },
        { "urls": "stun:stun3.l.google.com:19302" },
        { "urls": "stun:stun4.l.google.com:19302" }
    ]
};


const LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "cpp", label: "C++" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "java", label: "Java" }
];

const STARTER_TEMPLATES = {
    javascript: `// Start writing JavaScript code collaboratively here..\nconsole.log("Hello ConnectNOW");\n`,
    python: `# Start writing Python code collaboratively here..\nprint("Hello ConnectNOW")\n`,
    cpp: `// Start writing C++ code collaboratively here..\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello ConnectNOW" << endl;\n    return 0;\n}\n`,
    java: `// Start writing Java code collaboratively here..\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello ConnectNOW");\n    }\n}\n`,
    html: `<!-- Start writing HTML code collaboratively here.. -->\n<div style="padding: 20px; color: #f97316; font-family: sans-serif;">\n  <h1>Hello ConnectNOW</h1>\n</div>\n`,
    css: `/* Start writing CSS code collaboratively here.. */\nbody {\n  background-color: #0f172a;\n  color: #ffffff;\n}\n`
};

export default function VideoMeetComponent() {
    const { url } = useParams(); // URL matches the meeting ID (e.g. abc-def-ghi)
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // In-Meeting Notes States
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [inMeetingNotes, setInMeetingNotes] = useState([]);
    const [noteTitleInput, setNoteTitleInput] = useState("");
    const [noteContentInput, setNoteContentInput] = useState("");
    const [guestNoteContent, setGuestNoteContent] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);


    // Refs
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    const videoRef = useRef([]);

    // States for meeting details & checks
    const [meetingDetails, setMeetingDetails] = useState(null);
    const [password, setPassword] = useState("");
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [authError, setAuthError] = useState("");
    const [meetingLoading, setMeetingLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");

    // Waiting Room States
    const [inWaitingRoom, setInWaitingRoom] = useState(false);
    const [waitingMessage, setWaitingMessage] = useState("Waiting for the host to let you in...");
    const [waitingList, setWaitingList] = useState([]); // Array of { socketId, user }

    // Roster / Participant States
    const [participantsList, setParticipantsList] = useState([]); // Array of { socketId, user }
    const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);
    const [isHost, setIsHost] = useState(false);

    // Audio/Video control states
    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    let [screenAvailable, setScreenAvailable] = useState();

    // Collaborative Monaco Code Editor States
    const [showEditor, setShowEditor] = useState(false);
    const [editorCode, setEditorCode] = useState("// Start writing code collaboratively here...");
    const [editorLanguage, setEditorLanguage] = useState("javascript");
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);

    // Refs to bypass stale closures in Socket event handlers
    const editorCodeRef = useRef("// Start writing code collaboratively here...");
    const editorLanguageRef = useRef("javascript");
    const isSyncEnabledRef = useRef(true);
    const iceCandidatesQueue = useRef({});


    useEffect(() => {
        editorCodeRef.current = editorCode;
    }, [editorCode]);

    useEffect(() => {
        editorLanguageRef.current = editorLanguage;
    }, [editorLanguage]);

    useEffect(() => {
        isSyncEnabledRef.current = isSyncEnabled;
    }, [isSyncEnabled]);

    // Chat & Guest states
    let [showModal, setModal] = useState(false);
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true); // true = lobby, false = active meeting
    let [videos, setVideos] = useState([]);
    let [guestName, setGuestName] = useState("");

    useEffect(() => {
        if (user && user.name && !guestName) {
            setGuestName(user.name);
        }
    }, [user, guestName]);


    // Code execution states
    let [stdinInput, setStdinInput] = useState("");
    let [codeOutput, setCodeOutput] = useState(null);
    let [isExecutingCode, setIsExecutingCode] = useState(false);
    let [showConsoleTab, setShowConsoleTab] = useState("stdin");

    const handleRunCode = async () => {
        setIsExecutingCode(true);
        setShowConsoleTab("output");
        setCodeOutput(null);

        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.post(`${server_url}/api/v1/code/execute`, {
                language: editorLanguage,
                code: editorCode,
                stdin: stdinInput
            }, { headers });

            setCodeOutput(response.data);
        } catch (err) {
            setCodeOutput({
                status: "runtime_error",
                stdout: "",
                stderr: err.response?.data?.message || err.response?.data?.errors?.[0] || "Code execution request failed",
                executionTime: 0
            });
        } finally {
            setIsExecutingCode(false);
        }
    };

    // Check meeting status on mount
    useEffect(() => {
        const checkMeeting = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await axios.get(`${server_url}/api/v1/meetings/${url}`, { headers });
                
                setMeetingDetails(response.data);
                setIsHost(response.data.isHost);
                setPasswordRequired(response.data.passwordProtected && !response.data.isHost);
            } catch (err) {
                console.error("Failed to load meeting details:", err);
                setMeetingDetails({ meetingId: url, isHost: false, passwordProtected: false });
                setIsHost(false);
            } finally {
                setMeetingLoading(false);
            }
        };


        checkMeeting();
        getPermissions();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
            } else {
                setVideoAvailable(false);
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
            } else {
                setAudioAvailable(false);
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            if (!window.localStream) {
                getUserMedia();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, audio]);

    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
        }
    }, [askForUsername]);

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e); }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Add tracks to existing peer connections
        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            const senders = connections[id].getSenders ? connections[id].getSenders() : [];
            stream.getTracks().forEach(track => {
                const existingSender = senders.find(s => s.track && s.track.kind === track.kind);
                if (existingSender) {
                    existingSender.replaceTrack(track);
                } else if (connections[id].addTrack) {
                    try { connections[id].addTrack(track, stream); } catch(e){}
                }
            });
        }
    };


    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { }
        }
    };

    // Robust Screen Sharing via RTCRtpSender.replaceTrack
    let getDisplayMediaSuccess = (stream) => {
        window.screenStream = stream;
        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in local video element
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Dynamically replace track for all active WebRTC connections
        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            const senders = connections[id].getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === "video");
            if (videoSender) {
                videoSender.replaceTrack(screenTrack);
            }
        }

        // Handle user stopping screen share via browser default overlay bar
        screenTrack.onended = () => {
            setScreen(false);
            stopScreenSharing();
        };
    };

    let stopScreenSharing = async () => {
        try {
            // Stop screen sharing tracks
            if (window.screenStream) {
                window.screenStream.getTracks().forEach(t => t.stop());
                window.screenStream = null;
            }

            // Get new webcam stream
            const cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: videoAvailable ? video : false, 
                audio: audioAvailable ? audio : false 
            });

            window.localStream = cameraStream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = cameraStream;
            }

            const cameraTrack = cameraStream.getVideoTracks()[0];

            // Re-swap track back to camera for all peers
            for (let id in connections) {
                if (id === socketIdRef.current) continue;

                const senders = connections[id].getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === "video");
                if (videoSender && cameraTrack) {
                    videoSender.replaceTrack(cameraTrack);
                }
            }
        } catch (e) {
            console.error("Failed to restore webcam:", e);
        }
    };

    let getDisplayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDisplayMediaSuccess)
                    .catch((e) => {
                        console.log(e);
                        setScreen(false);
                    });
            }
        } else {
            stopScreenSharing();
        }
    };

    const createPeerConnection = (remoteSocketId) => {
        if (connections[remoteSocketId]) {
            return connections[remoteSocketId];
        }

        console.log(`[WebRTC] Creating RTCPeerConnection for peer: ${remoteSocketId}`);
        const pc = new RTCPeerConnection(peerConfigConnections);

        // Add local tracks to peer connection
        if (window.localStream) {
            window.localStream.getTracks().forEach((track) => {
                try {
                    pc.addTrack(track, window.localStream);
                } catch (e) {
                    console.log("Error adding track to peer:", e);
                }
            });
        }

        // ICE candidate handler
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('signal', remoteSocketId, JSON.stringify({ ice: event.candidate }));
            }
        };

        // Remote track handler (Audio & Video)
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received remote track (${event.track.kind}) from ${remoteSocketId}`);
            const remoteStream = (event.streams && event.streams[0])
                ? event.streams[0]
                : new MediaStream([event.track]);

            setVideos((prevVideos) => {
                const index = prevVideos.findIndex((v) => v.socketId === remoteSocketId);
                if (index !== -1) {
                    const updated = [...prevVideos];
                    updated[index] = { ...updated[index], stream: remoteStream };
                    videoRef.current = updated;
                    return updated;
                }
                const updated = [...prevVideos, { socketId: remoteSocketId, stream: remoteStream, autoplay: true, playsinline: true }];
                videoRef.current = updated;
                return updated;
            });
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] State [${remoteSocketId}]:`, pc.connectionState);
        };

        connections[remoteSocketId] = pc;
        return pc;
    };

    let gotMessageFromServer = async (fromId, message) => {
        let signal;
        try {
            signal = JSON.parse(message);
        } catch (e) {
            return;
        }

        if (fromId === socketIdRef.current) return;

        const pc = createPeerConnection(fromId);

        if (signal.sdp) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                // Process queued ICE candidates
                if (iceCandidatesQueue.current[fromId]) {
                    for (const cand of iceCandidatesQueue.current[fromId]) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (err) {
                            console.error("Error adding queued ICE candidate:", err);
                        }
                    }
                    delete iceCandidatesQueue.current[fromId];
                }

                if (signal.sdp.type === 'offer') {
                    if (window.localStream) {
                        window.localStream.getTracks().forEach((track) => {
                            try { pc.addTrack(track, window.localStream); } catch(e){}
                        });
                    }
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    if (socketRef.current) {
                        socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }));
                    }
                }
            } catch (err) {
                console.error("Error handling SDP signal:", err);
            }
        }

        if (signal.ice) {
            const candidate = new RTCIceCandidate(signal.ice);
            if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            } else {
                if (!iceCandidatesQueue.current[fromId]) {
                    iceCandidatesQueue.current[fromId] = [];
                }
                iceCandidatesQueue.current[fromId].push(signal.ice);
            }
        }
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            const userPayload = user ? {
                id: user._id || user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar || ""
            } : {
                id: socketRef.current.id,
                name: (guestName || "").trim() || `Guest-${socketRef.current.id.slice(0, 4)}`,
                username: `guest_${socketRef.current.id.slice(0, 4)}`,
                avatar: ""
            };
            socketRef.current.emit('join-call', window.location.href, userPayload);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            if (meetingDetails && !meetingDetails.isHost) {
                socketRef.current.emit("request-code-sync", url);
            }

            socketRef.current.on('code-update', (data) => {
                if (data.code !== undefined) setEditorCode(data.code);
                if (data.language !== undefined) setEditorLanguage(data.language);
            });

            socketRef.current.on('request-code-sync', (guestSocketId) => {
                socketRef.current.emit('send-code-sync', guestSocketId, {
                    code: editorCodeRef.current,
                    language: editorLanguageRef.current
                });
            });

            socketRef.current.on('waiting-room-status', (status) => {
                if (status.inWaitingRoom) {
                    setInWaitingRoom(true);
                    setWaitingMessage(status.message || "Waiting for the host to let you in...");
                } else {
                    setInWaitingRoom(false);
                    if (status.approved) {
                        setAskForUsername(false);
                    } else {
                        setAuthError(status.message || "Host declined your join request.");
                        socketRef.current.disconnect();
                    }
                }
            });

            socketRef.current.on('waiting-list-update', (list) => {
                setWaitingList(list);
            });

            socketRef.current.on('participant-list-update', (list) => {
                setParticipantsList(list);
            });

            socketRef.current.on('force-mute-mic', () => {
                setAudio(false);
                if (window.localStream) {
                    window.localStream.getAudioTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                alert("The host has muted your microphone");
            });

            socketRef.current.on('force-kicked-out', () => {
                alert("You have been removed from the meeting by the host");
                handleEndCall();
            });

            socketRef.current.on('meeting-ended-by-host', () => {
                alert("The host has ended the meeting for everyone");
                handleEndCall();
            });

            socketRef.current.on('user-left', (id) => {
                if (connections[id]) {
                    try { connections[id].close(); } catch(e){}
                    delete connections[id];
                }
                delete iceCandidatesQueue.current[id];
                setVideos((prevVideos) => prevVideos.filter((video) => video.socketId !== id));
            });

            socketRef.current.on('user-joined', (joinedSocketId, clients) => {
                clients.forEach((socketListId) => {
                    if (socketListId !== socketIdRef.current) {
                        createPeerConnection(socketListId);
                    }
                });

                if (joinedSocketId === socketIdRef.current) {
                    clients.forEach(async (peerId) => {
                        if (peerId !== socketIdRef.current) {
                            const pc = createPeerConnection(peerId);
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                if (socketRef.current) {
                                    socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: pc.localDescription }));
                                }
                            } catch (err) {
                                console.error("Error creating WebRTC offer:", err);
                            }
                        }
                    });
                }
            });
        });
    };




    let handleVideo = () => {
        const newValue = !video;
        setVideo(newValue);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => {
                track.enabled = newValue;
            });
        }
    };
    
    let handleAudio = () => {
        const newValue = !audio;
        setAudio(newValue);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => {
                track.enabled = newValue;
            });
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);
    
    let handleScreen = () => {
        setScreen(!screen);
    };

    // End call triggers (local client)
    let handleEndCall = () => {
        try {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
            if (window.screenStream) {
                window.screenStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { }
        navigate("/home");
    };

    // Host trigger: End meeting for everyone
    let handleEndMeetingForEveryone = () => {
        if (window.confirm("Are you sure you want to end this meeting for everyone?")) {
            socketRef.current.emit("end-meeting-for-everyone", url);
        }
    };

    // Host trigger: Approve guest
    const handleApproveUser = (guestSocketId) => {
        socketRef.current.emit("approve-user", url, guestSocketId);
    };

    // Host trigger: Reject guest
    const handleRejectUser = (guestSocketId) => {
        socketRef.current.emit("reject-user", url, guestSocketId);
    };

    // Host trigger: Mute participant
    const handleMuteParticipant = (targetSocketId) => {
        socketRef.current.emit("mute-participant", url, targetSocketId);
    };

    // Host trigger: Kick participant
    const handleKickParticipant = (targetSocketId) => {
        if (window.confirm("Are you sure you want to remove this participant?")) {
            socketRef.current.emit("kick-participant", url, targetSocketId);
        }
    };

    const handleShareLink = async () => {
        const inviteLink = `${window.location.origin}/${url}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join my ConnectNOW Meeting',
                    text: `Join meeting ${url} on ConnectNOW:`,
                    url: inviteLink
                });
                return;
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Native share failed, copying instead:", err);
                } else {
                    return; // User cancelled
                }
            }
        }

        try {
            await navigator.clipboard.writeText(inviteLink);
            setToastMessage("Invite link copied!");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            try {
                const el = document.createElement('textarea');
                el.value = inviteLink;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setToastMessage("Invite link copied!");
                setTimeout(() => setToastMessage(""), 3000);
            } catch (e) {
                setToastMessage("Failed to copy link");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };

    // In-Meeting Notes Handlers
    const fetchInMeetingNotes = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const response = await axios.get(`${server_url}/api/v1/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInMeetingNotes(response.data);
        } catch (err) {
            console.error("Failed to fetch in-meeting notes:", err);
        }
    };

    const handleCreateInMeetingNote = async (e) => {
        e.preventDefault();
        if (!noteTitleInput.trim() || !noteContentInput.trim()) return;

        setNoteSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${server_url}/api/v1/notes`, {
                title: noteTitleInput,
                content: noteContentInput
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInMeetingNotes([response.data, ...inMeetingNotes]);
            setNoteTitleInput("");
            setNoteContentInput("");
            setToastMessage("Note saved to account!");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            setToastMessage(err.response?.data?.message || "Failed to save note");
            setTimeout(() => setToastMessage(""), 3000);
        } finally {
            setNoteSaving(false);
        }
    };

    const handleDownloadGuestNote = () => {
        if (!guestNoteContent.trim()) return;
        const noteText = [
            "--- CONNECTNOW NOTE (.tst) ---",
            "VERSION: 1.0",
            `TITLE: Meeting Note (${url})`,
            `CREATED: ${new Date().toISOString()}`,
            "--- CONTENT ---",
            guestNoteContent
        ].join("\n");

        const blob = new Blob([noteText], { type: "text/plain;charset=utf-8" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", `meeting_note_${url}.tst`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        setToastMessage(".tst note file downloaded!");
        setTimeout(() => setToastMessage(""), 3000);
    };

    // Monaco Code Editor triggers

    const handleEditorChange = (value) => {
        setEditorCode(value);
        if (isSyncEnabledRef.current && socketRef.current) {
            socketRef.current.emit("code-update", url, {
                code: value,
                language: editorLanguageRef.current
            });
        }
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setEditorLanguage(newLang);

        const currentCode = (editorCodeRef.current || "").trim();
        const isDefaultCode = !currentCode || 
            currentCode.startsWith("// Start writing code") || 
            currentCode.startsWith("# Start writing code") ||
            currentCode.startsWith("<!-- Start writing code") ||
            currentCode.startsWith("/* Start writing code") ||
            Object.values(STARTER_TEMPLATES).some(t => t.trim() === currentCode);

        let newCode = editorCodeRef.current;
        if (isDefaultCode && STARTER_TEMPLATES[newLang]) {
            newCode = STARTER_TEMPLATES[newLang];
            setEditorCode(newCode);
        }

        if (isSyncEnabledRef.current && socketRef.current) {
            socketRef.current.emit("code-update", url, {
                code: newCode,
                language: newLang
            });
        }
    };



    
    let handleMessage = (e) => {
        setMessage(e.target.value);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        const senderName = user?.name || (guestName.trim() || "Guest");
        socketRef.current.emit('chat-message', message, senderName);
        setMessage("");
    };

    // Pre-join Connect trigger
    let handleConnect = async () => {
        setAuthError("");

        // If meeting is password protected, verify password first
        if (passwordRequired) {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                await axios.post(`${server_url}/api/v1/meetings/join`, {
                    meetingId: url,
                    password: password
                }, { headers });
            } catch (err) {
                setAuthError(err.response?.data?.message || "Incorrect password");
                return;
            }
        }


        setAskForUsername(false);
        getMedia();
    };


    // Loading State
    if (meetingLoading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent mb-4"></div>
                <p className="text-gray-400">Loading meeting configuration...</p>
            </div>
        );
    }

    // Auth / Password / Expired errors
    if (authError && askForUsername) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
                <Card className="w-full max-w-md border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md text-center text-white">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Meeting Connection Failed</h2>
                    <p className="text-gray-400 mb-6">{authError}</p>
                    <Button variant="contained" className="bg-brand-orange hover:bg-orange-500" onClick={() => navigate("/home")}>
                        Back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    // Waiting Room View
    if (inWaitingRoom) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-white">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md shadow-2xl">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-brand-orange/20 border-2 border-brand-orange flex items-center justify-center mx-auto mb-6">
                        <PeopleIcon className="text-brand-orange" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Waiting Room</h2>
                    <p className="text-sm text-gray-400 mb-6">{waitingMessage}</p>
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span>Meeting ID: {url}</span>
                        <span>•</span>
                        <span>Host: {meetingDetails?.host?.name}</span>
                    </div>
                    <Button variant="outlined" className="mt-8 text-gray-400 border-white/10 hover:bg-white/5" onClick={handleEndCall}>
                        Leave Waiting Room
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-950 text-white select-none font-sans">
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-brand-orange/30 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-orange"></span>
                    {toastMessage}
                </div>
            )}
            {/* LOBBY / PRE-JOIN ROOM VIEW */}
            {askForUsername === true ? (
                <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 px-4">
                    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row gap-8">
                        {/* Video Preview */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4">
                            <div className="aspect-video w-full rounded-xl bg-black border border-white/5 overflow-hidden relative">
                                <video ref={localVideoref} autoPlay muted className="w-full h-full object-cover"></video>
                                <div className="absolute bottom-2 left-2 flex gap-2">
                                    <IconButton onClick={handleVideo} className="bg-black/60 text-white hover:bg-black/80 size-8">
                                        {video ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                                    </IconButton>
                                    <IconButton onClick={handleAudio} className="bg-black/60 text-white hover:bg-black/80 size-8">
                                        {audio ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                    </IconButton>
                                </div>
                            </div>
                            <span className="text-xs text-center text-gray-400">Preview camera and microphone before joining</span>
                        </div>

                        {/* Join Controls */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold">Lobby</h2>
                                <div className="flex items-center justify-between mt-1 gap-2">
                                    <p className="text-xs text-gray-400">Join Meeting: <span className="font-mono text-brand-orange">{url}</span></p>
                                    <button 
                                        onClick={handleShareLink}
                                        className="text-[10px] text-brand-orange hover:text-orange-400 font-bold bg-brand-orange/10 px-2.5 py-1 rounded border border-brand-orange/20 transition active:scale-95"
                                    >
                                        Share Invite Link
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Display Name / Identity</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Enter your name to identify (e.g. Alex)"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10 text-sm font-medium"
                                    />
                                    {user && (
                                        <span className="block text-[11px] text-gray-400 mt-1">Logged in as {user.username}. You can customize your display name above.</span>
                                    )}
                                </div>



                                {passwordRequired && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Meeting Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10 text-sm"
                                        />
                                    </div>
                                )}

                                {authError && (
                                    <p className="text-xs font-medium text-red-400">{authError}</p>
                                )}

                                <Button 
                                    variant="contained" 
                                    onClick={handleConnect} 
                                    className="w-full bg-brand-orange py-3 font-bold hover:bg-orange-500 text-white shadow-lg rounded-xl text-sm animate-none"
                                >
                                    {isHost ? "Start Meeting (Host)" : "Request to Join"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ACTIVE MEETING ROOM VIEW */
                <div className="relative h-full flex flex-col">
                    
                    {/* Top Status Header */}
                    <div className="absolute top-4 left-4 z-40 bg-black/60 border border-white/10 px-4 py-2 rounded-xl text-xs backdrop-blur flex items-center gap-3">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="font-mono">Meeting: {url}</span>
                        {isHost && <span className="bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded text-[10px] font-bold border border-brand-orange/30">HOST</span>}
                    </div>

                    {/* Main Layout Grid */}
                    <div className="flex-1 flex overflow-hidden relative">
                        
                        {/* LEFT SIDE: COLLABORATIVE MONACO CODE EDITOR (SPLIT VIEW) */}
                        {showEditor && (
                            <div className="w-[60%] border-r border-white/10 bg-slate-950 flex flex-col z-10 relative">
                                <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
                                    <div className="flex items-center gap-3">
                                        <CodeIcon className="text-brand-orange" />
                                        <h2 className="text-sm font-bold tracking-tight">CodeNOW Sandbox</h2>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Language Dropdown Selector */}
                                        <select
                                            value={editorLanguage}
                                            onChange={handleLanguageChange}
                                            className="bg-white/5 border border-white/10 text-white rounded-lg text-xs font-semibold px-2.5 py-1.5 outline-none focus:border-brand-orange"
                                        >
                                            {LANGUAGES.map((lang) => (
                                                <option key={lang.value} value={lang.value} className="bg-slate-900 text-white">
                                                    {lang.label}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Toggle Sync Switch */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Collab Sync</span>
                                            <button
                                                onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                                                className={`h-5 w-9 rounded-full relative transition duration-300 ${isSyncEnabled ? 'bg-orange-500' : 'bg-gray-800'}`}
                                            >
                                                <span className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition duration-300 ${isSyncEnabled ? 'right-0.5' : 'left-0.5'}`}></span>
                                            </button>
                                        </div>

                                        {/* Run Code Execution Button */}
                                        <button
                                            onClick={handleRunCode}
                                            disabled={isExecutingCode}
                                            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg transition active:scale-95 cursor-pointer"
                                        >
                                            {isExecutingCode ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            ) : (
                                                <PlayArrowIcon fontSize="small" />
                                            )}
                                            <span>{isExecutingCode ? "Running..." : "Run Code"}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        language={editorLanguage}
                                        value={editorCode}
                                        theme="vs-dark"
                                        onChange={handleEditorChange}
                                        options={{
                                            fontSize: 14,
                                            minimap: { enabled: false },
                                            fontFamily: "Fira Code, Source Code Pro, monospace",
                                            fontLigatures: true,
                                            automaticLayout: true
                                        }}
                                    />
                                </div>

                                {/* Console & Stdin Input Panel */}
                                <div className="h-48 border-t border-white/10 bg-slate-900/90 flex flex-col">
                                    <div className="h-9 border-b border-white/10 flex items-center justify-between px-4 bg-slate-950/50">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowConsoleTab("stdin")}
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition ${showConsoleTab === "stdin" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                                            >
                                                Stdin Input
                                            </button>
                                            <button
                                                onClick={() => setShowConsoleTab("output")}
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${showConsoleTab === "output" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                                            >
                                                <span>Output Console</span>
                                                {codeOutput && (
                                                    <span className={`h-2 w-2 rounded-full ${codeOutput.status === "success" ? "bg-green-400" : "bg-red-400"}`}></span>
                                                )}
                                            </button>
                                        </div>

                                        {codeOutput && (
                                            <button
                                                onClick={() => setCodeOutput(null)}
                                                className="text-[10px] text-gray-400 hover:text-white"
                                            >
                                                Clear Console
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
                                        {showConsoleTab === "stdin" ? (
                                            <textarea
                                                value={stdinInput}
                                                onChange={(e) => setStdinInput(e.target.value)}
                                                placeholder="Enter standard input (stdin) to pass to program execution..."
                                                className="w-full h-full bg-transparent text-gray-200 placeholder-gray-600 outline-none resize-none"
                                            />
                                        ) : (
                                            <div className="space-y-2">
                                                {codeOutput ? (
                                                    <>
                                                        {/* Execution Status Badge */}
                                                        <div className="flex items-center gap-3">
                                                            {codeOutput.status === "success" && (
                                                                <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">
                                                                    SUCCESS ({codeOutput.executionTime}ms)
                                                                </span>
                                                            )}
                                                            {codeOutput.status === "compile_error" && (
                                                                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30">
                                                                    COMPILATION ERROR
                                                                </span>
                                                            )}
                                                            {codeOutput.status === "runtime_error" && (
                                                                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30">
                                                                    RUNTIME ERROR
                                                                </span>
                                                            )}
                                                            {codeOutput.status === "timeout" && (
                                                                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                                                                    EXECUTION TIMEOUT (5s Limit Exceeded)
                                                                </span>
                                                            )}
                                                            {codeOutput.status === "invalid_input" && (
                                                                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30">
                                                                    INVALID INPUT
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Output Stream Content */}
                                                        {codeOutput.stdout && (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">stdout:</span>
                                                                <pre className="text-emerald-300 whitespace-pre-wrap">{codeOutput.stdout}</pre>
                                                            </div>
                                                        )}

                                                        {codeOutput.stderr && (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">stderr / output:</span>
                                                                <pre className="text-red-400 whitespace-pre-wrap">{codeOutput.stderr}</pre>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-500 py-4 text-center">Click 'Run Code' to execute your program in the isolated sandbox environment.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* RIGHT SIDE: VIDEOS GRID */}
                        <div className="flex-1 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                            
                            {/* FLOATING HOST ADMISSION BANNER */}
                            {isHost && waitingList.length > 0 && (
                                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg bg-slate-900/95 border-2 border-brand-orange text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4 animate-bounce">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-9 rounded-full bg-brand-orange/20 border border-brand-orange flex items-center justify-center shrink-0">
                                            <PeopleIcon className="text-brand-orange text-sm" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">
                                                {waitingList[0]?.user?.name || "Guest"} is requesting to join
                                            </p>
                                            <span className="text-[10px] text-gray-400">
                                                {waitingList.length > 1 ? `+${waitingList.length - 1} more waiting` : "Waiting for host approval"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleApproveUser(waitingList[0].socketId)}
                                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md active:scale-95"
                                        >
                                            <CheckIcon fontSize="small" /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectUser(waitingList[0].socketId)}
                                            className="bg-red-600/30 border border-red-500/50 hover:bg-red-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95"
                                        >
                                            <CloseIcon fontSize="small" /> Reject
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Local User Video (Always floating or part of the roster) */}
                            <div className="absolute bottom-24 right-4 z-30 h-28 md:h-36 aspect-video rounded-xl bg-black border border-white/10 overflow-hidden shadow-2xl">
                                <video ref={localVideoref} autoPlay muted className="w-full h-full object-cover"></video>
                                <span className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-medium border border-white/5">You</span>
                            </div>

                            {/* Participant Videos Grid */}
                            <div className="w-full h-full flex items-center justify-center">
                                {videos.length === 0 ? (
                                    <div className="text-center space-y-4">
                                        <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                                            <PeopleIcon fontSize="large" />
                                        </div>
                                        <p className="text-gray-400 font-medium">Waiting for other participants to join...</p>
                                    </div>
                                ) : (
                                    <div className="grid w-full h-full gap-4 max-w-5xl" style={{
                                        gridTemplateColumns: videos.length === 1 ? '1fr' : videos.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr',
                                        gridTemplateRows: videos.length <= 2 ? '1fr' : '1fr 1fr'
                                    }}>
                                        {videos.map((vid) => {
                                            const participantData = participantsList.find(p => p.socketId === vid.socketId);
                                            const participantName = participantData?.user?.name || `Guest-${vid.socketId.slice(0, 4)}`;
                                            return (
                                                <div key={vid.socketId} className="relative rounded-2xl bg-black border border-white/5 overflow-hidden group shadow-lg">
                                                    <video
                                                        data-socket={vid.socketId}
                                                        ref={ref => {
                                                            if (ref && vid.stream && ref.srcObject !== vid.stream) {
                                                                ref.srcObject = vid.stream;
                                                                ref.play().catch(err => console.log("Remote video play error:", err));
                                                            }
                                                        }}
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    ></video>
                                                    <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-lg text-xs font-semibold border border-white/5">
                                                        {participantName}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PARTICIPANTS & WAITING ROOM SIDEBAR */}
                        {showParticipantsSidebar && (
                            <div className="w-80 border-l border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col z-40 relative">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <PeopleIcon /> Participants ({participantsList.length})
                                    </h2>
                                    <IconButton onClick={() => setShowParticipantsSidebar(false)} className="text-gray-400 hover:text-white">
                                        <CloseIcon />
                                    </IconButton>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6">
                                    {/* Waiting List Requests (Host Only) */}
                                    {isHost && waitingList.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-brand-orange uppercase tracking-wider">Waiting Approval ({waitingList.length})</h3>
                                            {waitingList.map((item) => (
                                                <div key={item.socketId} className="flex items-center justify-between bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-3 text-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-7 w-7 text-xs bg-brand-orange">{item.user?.name?.[0]}</Avatar>
                                                        <span className="font-medium text-white truncate max-w-[100px]">{item.user?.name}</span>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <IconButton onClick={() => handleApproveUser(item.socketId)} className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white size-7">
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton onClick={() => handleRejectUser(item.socketId)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white size-7">
                                                            <CloseIcon fontSize="small" />
                                                        </IconButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Roster List */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Meeting</h3>
                                        {participantsList.map((item) => {
                                            const participantIsHost = meetingDetails?.host?._id === item.user?.id;
                                            const isMe = item.socketId === socketIdRef.current;
                                            return (
                                                <div key={item.socketId} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 text-sm hover:bg-white/10 transition">
                                                    <div className="flex items-center gap-2.5">
                                                        {item.user?.avatar ? (
                                                            <img src={`${server_url}/${item.user.avatar}`} className="h-7 w-7 rounded-full object-cover" alt="" />
                                                        ) : (
                                                            <Avatar className="h-7 w-7 text-xs bg-gray-700">{item.user?.name?.[0]}</Avatar>
                                                        )}
                                                        <span className="font-semibold truncate max-w-[110px]">
                                                            {item.user?.name} {isMe && "(You)"}
                                                        </span>
                                                    </div>

                                                    {/* Moderator controls */}
                                                    {isHost && !isMe && !participantIsHost && (
                                                        <div className="flex gap-1">
                                                            <IconButton onClick={() => handleMuteParticipant(item.socketId)} title="Mute Participant" className="text-gray-400 hover:text-white size-7">
                                                                <VolumeMuteIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton onClick={() => handleKickParticipant(item.socketId)} title="Kick Participant" className="text-red-400 hover:text-red-500 size-7">
                                                                <GroupRemoveIcon fontSize="small" />
                                                            </IconButton>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CHAT PANEL SIDEBAR */}
                        {showModal && (
                            <div className="w-80 border-l border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col z-40 relative">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <ChatIcon /> Chat
                                    </h2>
                                    <IconButton onClick={() => setModal(false)} className="text-gray-400 hover:text-white">
                                        <CloseIcon />
                                    </IconButton>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div className="text-sm bg-white/5 p-3 rounded-xl border border-white/5" key={index}>
                                            <p className="font-bold text-xs text-brand-orange">{item.sender}</p>
                                            <p className="text-gray-300 mt-1 break-all">{item.data}</p>
                                        </div>
                                    )) : (
                                        <p className="text-center text-xs text-gray-500 py-10">No messages yet</p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={handleMessage}
                                        placeholder="Send a message"
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 outline-none text-sm focus:border-brand-orange/50"
                                    />
                                    <Button variant="contained" onClick={sendMessage} className="bg-brand-orange hover:bg-orange-500 rounded-xl px-4 text-xs font-semibold py-2">
                                        Send
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* IN-MEETING NOTES SIDEBAR */}
                        {showNotesModal && (
                            <div className="w-80 border-l border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col z-40 relative">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                                        <DescriptionIcon className="text-brand-orange" /> Meeting Notes
                                    </h2>
                                    <IconButton onClick={() => setShowNotesModal(false)} className="text-gray-400 hover:text-white">
                                        <CloseIcon />
                                    </IconButton>
                                </div>

                                {user ? (
                                    <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                                        {/* Save Quick Note Form */}
                                        <form onSubmit={handleCreateInMeetingNote} className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Save Note to Account</span>
                                            <input
                                                type="text"
                                                placeholder="Note Title"
                                                value={noteTitleInput}
                                                onChange={(e) => setNoteTitleInput(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-brand-orange"
                                            />
                                            <textarea
                                                rows={3}
                                                placeholder="Write note details..."
                                                value={noteContentInput}
                                                onChange={(e) => setNoteContentInput(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-brand-orange resize-none"
                                            />
                                            <Button
                                                type="submit"
                                                disabled={noteSaving}
                                                variant="contained"
                                                className="w-full bg-brand-orange hover:bg-orange-500 text-white font-bold text-xs py-1.5 rounded-lg"
                                            >
                                                {noteSaving ? "Saving..." : "Save Note"}
                                            </Button>
                                        </form>

                                        {/* Notes List */}
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Your Saved Notes</span>
                                            {inMeetingNotes.length > 0 ? (
                                                inMeetingNotes.map((note) => (
                                                    <div key={note._id} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-white truncate max-w-[160px]">{note.title}</h4>
                                                            <IconButton
                                                                onClick={async () => {
                                                                    const token = localStorage.getItem("token");
                                                                    const res = await axios.get(`${server_url}/api/v1/notes/${note._id}/export`, {
                                                                        headers: { Authorization: `Bearer ${token}` },
                                                                        responseType: "blob"
                                                                    });
                                                                    const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
                                                                    const downloadUrl = window.URL.createObjectURL(blob);
                                                                    const link = document.createElement("a");
                                                                    link.href = downloadUrl;
                                                                    link.setAttribute("download", `${note.title}.tst`);
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    link.parentNode.removeChild(link);
                                                                }}
                                                                title="Export .tst"
                                                                className="text-gray-400 hover:text-orange-400 size-6"
                                                            >
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </div>
                                                        <p className="text-[11px] text-gray-300 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-500 text-center py-6">No saved notes yet</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Guest Quick Notepad */
                                    <div className="flex-1 flex flex-col space-y-3">
                                        <span className="block text-xs font-bold text-gray-400 uppercase">In-Call Quick Notepad</span>
                                        <textarea
                                            rows={12}
                                            value={guestNoteContent}
                                            onChange={(e) => setGuestNoteContent(e.target.value)}
                                            placeholder="Take notes during the call... Click Download .tst to export your notes."
                                            className="flex-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-brand-orange resize-none font-mono"
                                        />
                                        <Button
                                            onClick={handleDownloadGuestNote}
                                            disabled={!guestNoteContent.trim()}
                                            variant="contained"
                                            className="bg-brand-orange hover:bg-orange-500 text-white font-bold text-xs py-2 rounded-xl flex items-center gap-1.5 justify-center"
                                        >
                                            <DownloadIcon fontSize="small" />
                                            <span>Download .tst Note</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONTROL BAR (Bottom) */}
                    <div className="h-20 border-t border-white/10 bg-white/5 backdrop-blur flex items-center justify-between px-3 md:px-6 z-50">
                        {/* Left section: Info */}
                        <div className="hidden md:flex flex-col gap-1 w-1/4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{meetingDetails?.meetingId}</span>
                                <button 
                                    onClick={handleShareLink}
                                    className="text-[9px] text-brand-orange hover:text-orange-400 font-bold bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20 transition active:scale-95"
                                >
                                    Share Link
                                </button>
                            </div>
                            <span className="text-[10px] text-gray-500">Host: {meetingDetails?.host?.name}</span>
                        </div>

                        {/* Center section: Media & Session buttons */}
                        <div className="flex items-center justify-center gap-2 md:gap-3 flex-1 md:flex-initial">
                            <button 
                                onClick={handleVideo} 
                                className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl border transition-all duration-200 ${video ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'}`}
                                title="Toggle Video"
                            >
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </button>
                            
                            <button 
                                onClick={handleAudio} 
                                className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl border transition-all duration-200 ${audio ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'}`}
                                title="Toggle Mute"
                            >
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </button>

                            {screenAvailable && (
                                <button 
                                    onClick={handleScreen} 
                                    className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl border border-white/10 transition-all duration-200 ${screen ? 'bg-brand-orange/20 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/30' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                    title="Toggle Screen Share"
                                >
                                    {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                </button>
                            )}

                            {isHost ? (
                                <button 
                                    onClick={handleEndMeetingForEveryone} 
                                    className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl bg-red-600 border border-red-700 text-white hover:bg-red-700 transition-all duration-200" 
                                    title="End Meeting for Everyone"
                                >
                                    <CallEndIcon />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleEndCall} 
                                    className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl bg-red-600 border border-red-700 text-white hover:bg-red-700 transition-all duration-200" 
                                    title="Leave Meeting"
                                >
                                    <CallEndIcon />
                                </button>
                            )}
                        </div>

                        {/* Right section: Sidebars Toggles */}
                        <div className="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-1/4">
                            {/* Toggle In-Meeting Notes */}
                            <button 
                                onClick={() => { 
                                    const nextState = !showNotesModal;
                                    setShowNotesModal(nextState); 
                                    if (nextState && user) fetchInMeetingNotes();
                                    setShowEditor(false); 
                                    setShowParticipantsSidebar(false); 
                                    setModal(false); 
                                }} 
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${showNotesModal ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                title="In-Meeting Notes"
                            >
                                <DescriptionIcon />
                            </button>

                            {/* Toggle Monaco Code Editor */}
                            <button 
                                onClick={() => { setShowEditor(!showEditor); setShowNotesModal(false); setShowParticipantsSidebar(false); setModal(false); }} 
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${showEditor ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`} 
                                title="Toggle Code Sandbox"
                            >
                                <CodeIcon />
                            </button>

                            <button 
                                onClick={() => { setShowParticipantsSidebar(!showParticipantsSidebar); setShowNotesModal(false); setShowEditor(false); setModal(false); }} 
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${showParticipantsSidebar ? 'bg-white/10 text-white border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                title="Participants"
                            >
                                <Badge badgeContent={waitingList.length > 0 ? waitingList.length : null} color="error">
                                    <PeopleIcon />
                                </Badge>
                            </button>

                            <button 
                                onClick={() => { setModal(!showModal); setShowNotesModal(false); setShowEditor(false); setShowParticipantsSidebar(false); setNewMessages(0); }} 
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${showModal ? 'bg-white/10 text-white border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                title="Chat"
                            >
                                <Badge badgeContent={newMessages > 0 ? newMessages : null} color="warning">
                                    <ChatIcon />
                                </Badge>
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
