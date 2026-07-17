// Adapted and customized for ConnectNOW
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white font-sans">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent mb-4"></div>
                <p className="text-gray-400">Loading ConnectNOW...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return children;
};

export default ProtectedRoute;
