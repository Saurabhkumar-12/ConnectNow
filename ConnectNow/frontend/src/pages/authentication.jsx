// Adapted and customized for ConnectNOW
import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function Authentication() {
    const navigate = useNavigate();
    const { handleRegister, handleLogin } = useContext(AuthContext);

    // Form states
    const [formState, setFormState] = useState(0); // 0 = Sign In, 1 = Sign Up
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (formState === 0) {
            // Sign In
            if (!username || !password) {
                setError("Please fill in all fields");
                return;
            }
            setLoading(true);
            try {
                await handleLogin(username, password);
            } catch (err) {
                setError(err.response?.data?.message || "Login failed. Check your credentials.");
            } finally {
                setLoading(false);
            }
        } else {
            // Sign Up
            if (!name || !username || !email || !password) {
                setError("Please fill in all fields");
                return;
            }
            setLoading(true);
            try {
                const result = await handleRegister(name, username, email, password);
                setMessage(result || "Registration successful! You can now log in.");
                
                // Clear fields and switch to login tab
                setName("");
                setUsername("");
                setEmail("");
                setPassword("");
                setFormState(0);
            } catch (err) {
                setError(err.response?.data?.message || "Registration failed. Try a different username/email.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                
                {/* Logo / Header */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                        Connect<span className="text-brand-orange">NOW</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {formState === 0 ? "Sign in to your account" : "Create your free account"}
                    </p>
                </div>

                {/* Tab Controls */}
                <div className="mb-6 flex rounded-xl bg-white/5 p-1 border border-white/5">
                    <button
                        onClick={() => {
                            setFormState(0);
                            setError("");
                            setMessage("");
                        }}
                        className={`w-1/2 rounded-lg py-2.5 text-sm font-medium transition duration-200 ${
                            formState === 0 
                                ? "bg-brand-orange text-white shadow" 
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            setFormState(1);
                            setError("");
                            setMessage("");
                        }}
                        className={`w-1/2 rounded-lg py-2.5 text-sm font-medium transition duration-200 ${
                            formState === 1 
                                ? "bg-brand-orange text-white shadow" 
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">
                    {formState === 1 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            {formState === 0 ? "Username or Email" : "Username"}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={formState === 0 ? "username or you@example.com" : "johndoe"}
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
                        />
                    </div>

                    {formState === 1 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
                            />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                            {formState === 0 && (
                                <Link to="/forgot-password" className="text-xs text-brand-orange hover:underline">
                                    Forgot password?
                                </Link>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
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
                        className="mt-2 w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-500 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : formState === 0 ? "Sign In" : "Sign Up"}
                    </button>
                </form>
            </div>
        </div>
    );
}