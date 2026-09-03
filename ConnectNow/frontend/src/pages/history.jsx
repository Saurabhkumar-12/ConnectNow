// ConnectNOW - Meeting History Page with Consistent App Dark Theme
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import RestoreIcon from '@mui/icons-material/Restore';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const history = await getHistoryOfUser();
                setMeetings(history || []);
            } catch (err) {
                console.error("Failed to fetch meeting history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
            {/* Header Navbar */}
            <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => routeTo("/home")}>
                        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/30">
                            C
                        </div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent tracking-tight">
                            ConnectNOW <span className="text-xs text-gray-400 font-mono font-normal">/ History</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => routeTo("/home")}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition border border-transparent hover:border-white/10"
                        >
                            <HomeIcon fontSize="small" />
                            <span>Dashboard</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold flex items-center gap-2.5 text-white tracking-tight">
                            <RestoreIcon className="text-orange-500" />
                            <span>Meeting History</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">View your previous meeting sessions and codes.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    </div>
                ) : meetings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {meetings.map((e, i) => (
                            <div
                                key={e._id || i}
                                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md hover:border-orange-500/40 transition-all duration-300 space-y-4 shadow-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono text-orange-400 font-bold bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                                        {e.meetingCode}
                                    </span>
                                    <span className="text-xs text-gray-400">{formatDate(e.date)}</span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Meeting Code</p>
                                    <p className="text-lg font-bold text-white font-mono tracking-wide group-hover:text-orange-400 transition">
                                        {e.meetingCode}
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-white/5 flex justify-end">
                                    <button
                                        onClick={() => routeTo(`/${e.meetingCode}`)}
                                        className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition"
                                    >
                                        Rejoin Meeting →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
                        <RestoreIcon style={{ fontSize: 48 }} className="text-gray-600 mx-auto" />
                        <p className="text-gray-300 text-lg font-bold">No meeting history found</p>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            Your past meeting sessions will be automatically logged here whenever you join or create a call.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
