// Adapted and customized for ConnectNOW
import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [resetLink, setResetLink] = useState("");
    const [loading, setLoading] = useState(false);
    
    const { handleForgotPassword } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setResetLink("");
        
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            const data = await handleForgotPassword(email);
            setMessage(data.message);
            if (data.resetUrl) {
                // Store the simulated URL so local developer can click it
                const localUrlPath = data.resetUrl.replace("http://localhost:3000", "");
                setResetLink(localUrlPath);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to process request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                        Connect<span className="text-brand-orange">NOW</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">Recover your account password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
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

                    {resetLink && (
                        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-300 space-y-2">
                            <p className="font-semibold">Simulated Email Output (Local Dev):</p>
                            <p className="text-xs text-gray-400 font-mono break-all">http://localhost:3000{resetLink}</p>
                            <Link
                                to={resetLink}
                                className="inline-block w-full text-center rounded-xl bg-brand-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
                            >
                                Click here to Reset Password
                            </Link>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-500 disabled:opacity-50"
                    >
                        {loading ? "Sending..." : "Generate Reset Link"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    <Link to="/auth" className="text-brand-orange hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
