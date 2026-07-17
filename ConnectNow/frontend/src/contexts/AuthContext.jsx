// Adapted and customized for ConnectNOW
import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Automatically attach Authorization token if it exists in localStorage
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useNavigate();

    // Load user on mount if token exists
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const response = await client.get("/profile");
                    setUser(response.data);
                } catch (error) {
                    console.error("Failed to load user profile:", error.message);
                    localStorage.removeItem("token");
                    setUser(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const handleRegister = async (name, username, email, password) => {
        try {
            const request = await client.post("/register", {
                name,
                username,
                email: email.toLowerCase(),
                password
            });
            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (usernameOrEmail, password) => {
        try {
            // Support passing username or email as the payload
            const payload = usernameOrEmail.includes("@") 
                ? { email: usernameOrEmail, password } 
                : { username: usernameOrEmail, password };

            const request = await client.post("/login", payload);

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                setUser(request.data.user);
                router("/home");
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleForgotPassword = async (email) => {
        try {
            const request = await client.post("/forgot-password", { email: email.toLowerCase() });
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const handleResetPassword = async (token, password) => {
        try {
            const request = await client.post(`/reset-password/${token}`, { password });
            return request.data.message;
        } catch (err) {
            throw err;
        }
    };

    const handleUpdateProfile = async (formData) => {
        try {
            const request = await client.put("/profile", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            if (request.status === 200) {
                setUser(request.data.user);
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setUser(null);
        router("/auth");
    };

    const getHistoryOfUser = async () => {
        try {
            const request = await client.get("/get_all_activity");
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            const request = await client.post("/add_to_activity", {
                meeting_code: meetingCode
            });
            return request.data;
        } catch (e) {
            throw e;
        }
    };

    const data = {
        user,
        loading,
        handleRegister,
        handleLogin,
        handleForgotPassword,
        handleResetPassword,
        handleUpdateProfile,
        handleLogout,
        getHistoryOfUser,
        addToUserHistory
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};
