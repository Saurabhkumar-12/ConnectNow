// ConnectNOW - User Notes Management Page with .tst Export & Import
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import server from "../environment";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton
} from "@mui/material";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import DownloadIcon from "@mui/icons-material/Download";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";

export default function Notes() {
    const navigate = useNavigate();
    const { handleLogout } = useContext(AuthContext);


    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Active note state
    const [currentNoteId, setCurrentNoteId] = useState(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [importFile, setImportFile] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return { Authorization: `Bearer ${token}` };
    };

    // Fetch notes on mount
    const fetchNotes = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${server}/api/v1/notes`, {
                headers: getAuthHeaders()
            });
            setNotes(response.data);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to load notes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // Show temporary toast message
    const showToast = (msg, isError = false) => {
        if (isError) {
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(""), 4000);
        } else {
            setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(""), 4000);
        }
    };

    // Handle Create Note
    const handleCreateNote = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showToast("Please provide both title and content", true);
            return;
        }

        setActionLoading(true);
        try {
            const response = await axios.post(`${server}/api/v1/notes`, {
                title,
                content
            }, {
                headers: getAuthHeaders()
            });

            setNotes([response.data, ...notes]);
            setCreateModalOpen(false);
            setTitle("");
            setContent("");
            showToast("Note created successfully!");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to create note", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Open Edit Modal
    const openEditModal = (note) => {
        setCurrentNoteId(note._id);
        setTitle(note.title);
        setContent(note.content);
        setEditModalOpen(true);
    };

    // Handle Update Note
    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showToast("Title and content cannot be empty", true);
            return;
        }

        setActionLoading(true);
        try {
            const response = await axios.put(`${server}/api/v1/notes/${currentNoteId}`, {
                title,
                content
            }, {
                headers: getAuthHeaders()
            });

            setNotes(notes.map(n => n._id === currentNoteId ? response.data : n));
            setEditModalOpen(false);
            setCurrentNoteId(null);
            setTitle("");
            setContent("");
            showToast("Note updated successfully!");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update note", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Open Delete Confirmation Modal
    const openDeleteModal = (noteId) => {
        setCurrentNoteId(noteId);
        setDeleteModalOpen(true);
    };

    // Handle Delete Note
    const handleDeleteNote = async () => {
        setActionLoading(true);
        try {
            await axios.delete(`${server}/api/v1/notes/${currentNoteId}`, {
                headers: getAuthHeaders()
            });

            setNotes(notes.filter(n => n._id !== currentNoteId));
            setDeleteModalOpen(false);
            setCurrentNoteId(null);
            showToast("Note deleted");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to delete note", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Export Note as .tst file download
    const handleExportTst = async (note) => {
        try {
            const response = await axios.get(`${server}/api/v1/notes/${note._id}/export`, {
                headers: getAuthHeaders(),
                responseType: "blob"
            });

            const blob = new Blob([response.data], { type: "text/plain;charset=utf-8" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeTitle = note.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "note";
            link.href = url;
            link.setAttribute("download", `${safeTitle}.tst`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast(`.tst file downloaded for "${note.title}"`);
        } catch (err) {
            showToast("Failed to export .tst file", true);
        }
    };

    // Import .tst file
    const handleImportTst = async (e) => {
        e.preventDefault();
        if (!importFile) {
            showToast("Please select a .tst file to import", true);
            return;
        }

        if (!importFile.name.toLowerCase().endsWith(".tst")) {
            showToast("Only .tst files are allowed", true);
            return;
        }

        setActionLoading(true);
        const formData = new FormData();
        formData.append("tstFile", importFile);

        try {
            const response = await axios.post(`${server}/api/v1/notes/import`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "multipart/form-data"
                }
            });

            setNotes([response.data.note, ...notes]);
            setImportModalOpen(false);
            setImportFile(null);
            showToast("Note imported successfully from .tst file!");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to import .tst file", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered notes by search query
    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
            {/* Header / Navbar */}
            <header className="border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/home")}>
                        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-500/30">
                            C
                        </div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent tracking-tight">
                            ConnectNOW <span className="text-xs text-gray-400 font-mono font-normal">/ Notes</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/home")}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
                        >
                            <HomeIcon fontSize="small" />
                            <span>Meetings</span>
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

            {/* Notification Toast */}
            {successMsg && (
                <div className="fixed top-20 right-6 z-50 bg-green-500/20 border border-green-500/40 text-green-300 text-sm px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="fixed top-20 right-6 z-50 bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
                    {errorMsg}
                </div>
            )}

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
                {/* Top Action Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <SearchIcon fontSize="small" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search your notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-gray-300 hover:text-white transition"
                        >
                            <FileUploadIcon fontSize="small" />
                            <span>Import .tst</span>
                        </button>

                        <button
                            onClick={() => {
                                setTitle("");
                                setContent("");
                                setCreateModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-lg shadow-orange-500/20 active:scale-95 text-sm"
                        >
                            <NoteAddIcon fontSize="small" />
                            <span>New Note</span>
                        </button>
                    </div>
                </div>

                {/* Notes Grid Display */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    </div>
                ) : filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map((note) => (
                            <div
                                key={note._id}
                                className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition truncate">
                                            {note.title}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 text-xs text-gray-500">
                                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>

                                    <div className="flex items-center gap-1">
                                        <IconButton
                                            onClick={() => handleExportTst(note)}
                                            title="Export as .tst file"
                                            className="text-gray-400 hover:text-orange-400 size-8"
                                        >
                                            <DownloadIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => openEditModal(note)}
                                            title="Edit Note"
                                            className="text-gray-400 hover:text-white size-8"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => openDeleteModal(note._id)}
                                            title="Delete Note"
                                            className="text-gray-400 hover:text-red-400 size-8"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-4 rounded-2xl border border-white/5 bg-white/5">
                        <p className="text-gray-400 text-lg">No notes found</p>
                        <p className="text-xs text-gray-500">Create a new note or import a .tst file to get started.</p>
                    </div>
                )}
            </main>

            {/* CREATE NOTE DIALOG */}
            <Dialog
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                PaperProps={{
                    style: {
                        background: '#0f172a',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px',
                        maxWidth: '600px',
                        width: '100%'
                    }
                }}
            >
                <DialogTitle className="text-xl font-extrabold text-white">Create New Note</DialogTitle>
                <DialogContent className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Title</label>
                        <input
                            type="text"
                            placeholder="Note title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Content</label>
                        <textarea
                            rows={8}
                            placeholder="Write your note here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>
                </DialogContent>
                <DialogActions className="pt-4 border-t border-white/5 mt-4">
                    <Button onClick={() => setCreateModalOpen(false)} style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateNote}
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
                        Save Note
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EDIT NOTE DIALOG */}
            <Dialog
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                PaperProps={{
                    style: {
                        background: '#0f172a',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px',
                        maxWidth: '600px',
                        width: '100%'
                    }
                }}
            >
                <DialogTitle className="text-xl font-extrabold text-white">Edit Note</DialogTitle>
                <DialogContent className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase">Content</label>
                        <textarea
                            rows={8}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-orange-500/50 text-sm"
                        />
                    </div>
                </DialogContent>
                <DialogActions className="pt-4 border-t border-white/5 mt-4">
                    <Button onClick={() => setEditModalOpen(false)} style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdateNote}
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
                        Update Note
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DELETE CONFIRMATION DIALOG */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
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
                <DialogTitle className="text-lg font-bold text-white">Delete Note</DialogTitle>
                <DialogContent>
                    <p className="text-sm text-gray-300">Are you sure you want to delete this note? This action cannot be undone.</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteModalOpen(false)} style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteNote}
                        disabled={actionLoading}
                        style={{
                            background: '#ef4444',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* IMPORT .TST DIALOG */}
            <Dialog
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
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
                <DialogTitle className="text-xl font-extrabold text-white">Import Note (.tst file)</DialogTitle>
                <DialogContent className="space-y-4 pt-4">
                    <p className="text-xs text-gray-400">Select a valid `.tst` file generated by ConnectNOW to import into your notes.</p>
                    <input
                        type="file"
                        accept=".tst"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="w-full text-xs text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 cursor-pointer"
                    />
                </DialogContent>
                <DialogActions className="pt-4 border-t border-white/5 mt-4">
                    <Button onClick={() => setImportModalOpen(false)} style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImportTst}
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
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
