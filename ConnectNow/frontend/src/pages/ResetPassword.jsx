// Adapted and customized for ConnectNOW
import React, { useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { handleResetPassword } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const successMsg = await handleResetPassword(token, password);
            setMessage(successMsg);
            setTimeout(() => {
                navigate("/auth");
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password");
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
                    <p className="mt-2 text-sm text-gray-400">Set your new account password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="pass" className="block text-sm font-medium text-gray-300">
                            New Password
                        </label>
                        <input
                            id="pass"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-orange/50 focus:bg-white/10"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPass" className="block text-sm font-medium text-gray-300">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPass"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
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
                            {message}. Redirecting to login...
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !!message}
                        className="w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-500 disabled:opacity-50"
                    >
                        {loading ? "Resetting..." : "Save Password"}
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
