// Adapted and customized for ConnectNOW
import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { 
    Button, 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    const navigate = useNavigate();
    const { addToUserHistory, handleLogout, user } = useContext(AuthContext);
    
    const [meetingCode, setMeetingCode] = useState("");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [meetingPassword, setMeetingPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) {
            setErrorMsg("Please enter a meeting code");
            return;
        }
        setActionLoading(true);
        try {
            await addToUserHistory(meetingCode);
            navigate(`/${meetingCode}`);
        } catch (err) {
            setErrorMsg(err.message || "Failed to join meeting");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateMeeting = async () => {
        setActionLoading(true);
        setErrorMsg("");
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${server}/api/v1/meetings/create`, {
                password: meetingPassword || undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { meetingId } = response.data;
            await addToUserHistory(meetingId);
            setCreateModalOpen(false);
            navigate(`/${meetingId}`);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to create meeting");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 select-none">
            
            {/* Header / Navbar */}
            <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/30">
                            C
                        </div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent tracking-tight">
                            ConnectNOW
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate("/history")}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
                        >
                            <RestoreIcon fontSize="small" />
                            <span>History</span>
                        </button>

                        <button 
                            onClick={() => navigate("/profile")}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
                        >
                            {user?.avatar ? (
                                <img 
                                    src={`${server}/${user.avatar}`} 
                                    className="h-6 w-6 rounded-full object-cover border border-white/10" 
                                    alt="" 
                                />
                            ) : (
                                <AccountCircleIcon fontSize="small" />
                            )}
                            <span className="max-w-[100px] truncate">{user?.name || "Profile"}</span>
                        </button>

                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                        >
                            <LogoutIcon fontSize="small" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid md:grid-cols-12 gap-12 items-center">
                
                {/* Left controls panel */}
                <div className="md:col-span-7 space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                            Providing Quality Video Calls <br/>
                            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                                Anytime, Anywhere.
                            </span>
                        </h2>
                        <p className="text-gray-400 text-base md:text-lg max-w-lg leading-relaxed">
                            ConnectNOW brings raw high-definition WebRTC video conferencing, chat rooms, and presentation screens straight to your browser.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-md">
                        <button 
                            onClick={() => setCreateModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-orange-500/20 active:scale-95"
                        >
                            <VideoCallIcon />
                            <span>New Meeting</span>
                        </button>

                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <KeyboardIcon fontSize="small" />
                            </div>
                            <input
                                type="text"
                                placeholder="Enter meeting code"
                                value={meetingCode}
                                onChange={(e) => { setMeetingCode(e.target.value); setErrorMsg(""); }}
                                className="w-full pl-10 pr-20 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 outline-none transition focus:border-orange-500/50 focus:bg-white/10 text-sm"
                            />
                            <button
                                onClick={handleJoinVideoCall}
                                disabled={actionLoading}
                                className="absolute right-2 top-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition text-white hover:text-orange-400"
                            >
                                Join
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <p className="text-sm font-semibold text-red-400">{errorMsg}</p>
                    )}
                </div>

                {/* Right decorative visual panel */}
                <div className="hidden md:col-span-5 md:flex justify-center">
                    <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-white/10 p-8 shadow-2xl flex flex-col justify-between overflow-hidden group">
                        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-all duration-700"></div>
                        
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">Secure WebRTC Node</span>
                            <h3 className="text-xl font-bold text-white">Direct Peer Connection</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                No intermediaries. Connections are negotiated via local server sockets and piped directly between browsers.
                            </p>
                        </div>

                        <div className="flex justify-between items-end border-t border-white/5 pt-6 mt-6">
                            <div>
                                <span className="block text-[10px] text-gray-500">Latency Avg</span>
                                <span className="font-mono text-sm text-green-400 font-bold">~ 20-50ms</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500">Encryption</span>
                                <span className="font-mono text-sm text-amber-400 font-bold">DTLS / SRTP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* CREATE MEETING CONFIG DIALOG */}
            <Dialog 
                open={createModalOpen} 
                onClose={() => setCreateModalOpen(false)}
                PaperProps={{
                    style: {
                        background: '#0f172a',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px'
                    }
                }}
            >
                <DialogTitle className="text-xl font-extrabold pb-2 text-white">Configure New Meeting</DialogTitle>
                <DialogContent className="space-y-4 pt-4">
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        Generate a secure meeting room. You can optionally add a password to restrict access to approved guests.
                    </p>
                    
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Optional Password</label>
                        <input
                            type="password"
                            placeholder="Keep empty for no password"
                            value={meetingPassword}
                            onChange={(e) => setMeetingPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>
                </DialogContent>
                <DialogActions className="pt-4 border-t border-white/5 mt-4">
                    <Button onClick={() => setCreateModalOpen(false)} style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreateMeeting}
                        disabled={actionLoading}
                        style={{
                            background: '#f97316',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    >
                        Create & Join
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default withAuth(HomeComponent);