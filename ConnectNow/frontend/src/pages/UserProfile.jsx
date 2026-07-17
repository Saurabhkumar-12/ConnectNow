// Adapted and customized for ConnectNOW
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import server from "../environment";

export default function UserProfile() {
    const { user, handleUpdateProfile, handleLogout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            if (user.avatar) {
                setPreviewUrl(`${server}/${user.avatar}`);
            }
        }
    }, [user]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.type.startsWith("image/")) {
                setError("Please select an image file (JPG/PNG)");
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!name.trim()) {
            setError("Name cannot be empty");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        if (file) {
            formData.append("avatar", file);
        }

        try {
            const successMsg = await handleUpdateProfile(formData);
            setMessage(successMsg);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    // Generate initials for default avatar
    const getInitials = (n) => {
        return n ? n.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2) : "CN";
    };

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 text-white font-sans">
            {/* Simple Top Navigation Bar */}
            <nav className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/home")}>
                    <span className="text-xl font-extrabold tracking-tight text-white">
                        Connect<span className="text-brand-orange">NOW</span>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate("/home")} 
                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                    >
                        Back to Meetings
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/30 transition hover:bg-red-500 hover:text-white"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Profile Editing Form */}
            <div className="flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold">User Profile Settings</h2>
                        <p className="text-sm text-gray-400 mt-1">Manage your identity and avatar settings</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar Upload Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                {previewUrl ? (
                                    <img 
                                        src={previewUrl} 
                                        alt="Avatar Preview" 
                                        className="h-28 w-28 rounded-full object-cover border-4 border-brand-orange/50 shadow-lg"
                                    />
                                ) : (
                                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-orange text-3xl font-extrabold text-white border-4 border-white/10 shadow-lg">
                                        {getInitials(user.name)}
                                    </div>
                                )}
                                <label 
                                    htmlFor="avatar-upload" 
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs font-bold text-white border border-brand-orange/40"
                                >
                                    Change Photo
                                </label>
                                <input 
                                    id="avatar-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                />
                            </div>
                            <span className="text-xs text-gray-400">Click the circle to upload a custom JPG/PNG</span>
                        </div>

                        {/* User Details Details */}
                        <div className="grid grid-cols-2 gap-4 rounded-xl bg-white/5 border border-white/5 p-4 text-sm text-gray-300">
                            <div>
                                <span className="block text-xs text-gray-500">Username</span>
                                <span className="font-semibold text-white">{user.username}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500">Email</span>
                                <span className="font-semibold text-white break-all">{user.email}</span>
                            </div>
                        </div>

                        {/* Edit fields */}
                        <div>
                            <label htmlFor="name-input" className="block text-sm font-medium text-gray-300">
                                Full Name
                            </label>
                            <input
                                id="name-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-500 disabled:opacity-50"
                        >
                            {loading ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
