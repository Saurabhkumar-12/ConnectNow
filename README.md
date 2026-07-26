# 📹 ConnectNOW – Real-Time Video Conferencing Platform

ConnectNOW is a full-stack real-time video conferencing web application inspired by Zoom that enables users to securely create, join, and manage online meetings with high-quality video and audio communication.

The application uses **WebRTC** for peer-to-peer media streaming and **Socket.io** for signaling, ensuring low-latency real-time communication. Users can authenticate, create meeting rooms, join meetings using a unique Meeting ID, and access their meeting history through an intuitive dashboard.

🌐 **Live Demo:** https://connectnow-meet.vercel.app/

---

# ✨ Features

- 🔐 Secure User Authentication (JWT)
- 📹 HD Video & Audio Calling
- 👥 Create & Join Meeting Rooms
- ⚡ WebRTC Peer-to-Peer Streaming
- 🔄 Socket.io Real-Time Signaling
- 🕒 Meeting History
- 🎤 Mute / Unmute Microphone
- 📷 Camera On / Off
- 📱 Responsive UI
- ⚙️ Fast & Scalable Architecture

---

# 🏗️ System Architecture

```text
                    ┌───────────────────────┐
                    │      React Client     │
                    │ (Frontend - Vercel)   │
                    └──────────┬────────────┘
                               │
                     REST APIs │
                               │
                    Socket.io  │
                               ▼
                 ┌──────────────────────────┐
                 │     Express Server       │
                 │      Node.js Backend     │
                 └──────────┬───────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
      JWT Authentication  Socket.io     MongoDB
            │             Signaling      Database
            │               │
            └───────────────┘
                    │
                    ▼
             WebRTC Connection
        (Peer-to-Peer Media Stream)
                    │
          Audio • Video • Screen
```

---

# 🔄 Application Workflow

```text
User Login/Register
        │
        ▼
Authentication (JWT)
        │
        ▼
Dashboard
        │
        ▼
Create Meeting / Join Meeting
        │
        ▼
Socket.io Signaling
        │
        ▼
WebRTC Peer Connection
        │
        ▼
Video & Audio Communication
        │
        ▼
Meeting Ends
        │
        ▼
Meeting History Saved
```

---

# 🧩 Tech Stack

## Frontend

- React.js
- Tailwind CSS
- React Router
- Axios
- Socket.io Client

## Backend

- Node.js
- Express.js
- Socket.io
- WebRTC Signaling

## Database

- MongoDB
- Mongoose

## Authentication

- JWT
- bcrypt.js

## Deployment

- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

# 📂 Project Structure

```text
ConnectNOW
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── assets/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── sockets/
│   ├── config/
│   └── utils/
│
├── public/
├── package.json
└── README.md
```

---

# 🔐 Authentication Flow

```text
User
 │
 ▼
Login/Register
 │
 ▼
Express API
 │
 ▼
JWT Generated
 │
 ▼
Token Stored
 │
 ▼
Authenticated Routes
```

---

# 📡 Video Call Flow

```text
User A
   │
   │ Offer
   ▼
Socket.io Server
   │
   ▼
User B
   │
Answer
   │
   ▼
Socket.io
   │
ICE Candidates
   │
   ▼
WebRTC Connection
   │
   ▼
Direct Peer-to-Peer Media Stream
```

---

# 💻 Tech Highlights

- WebRTC Peer-to-Peer Communication
- Socket.io Real-Time Signaling
- JWT Authentication
- MongoDB Data Persistence
- RESTful API Architecture
- Responsive React UI
- Secure Password Hashing
- Meeting History Management
- Scalable Full-Stack Design

---

# 🚀 Future Improvements

- Screen Sharing
- Chat During Meetings
- Meeting Recording
- Virtual Background
- Waiting Room
- Host Controls
- Multiple Participants Grid View
- File Sharing
- Raise Hand Feature
- Live Captions

---

# 📸 Screenshots

Add screenshots of:

- Home Page
- Login & Register
- Dashboard
- Meeting Room
- Meeting History
- Mobile View

---

# ⚙️ Installation

```bash
# Clone Repository
git clone <repository-url>

# Install Frontend
cd client
npm install

# Install Backend
cd ../server
npm install

# Start Backend
npm run dev

# Start Frontend
npm start
```

---

# 🌍 Live Demo

**Application:** https://connectnow-meet.vercel.app/

---

# 👨‍💻 Developer

## Saurabh Kumar

**Full Stack Developer | UI/UX Designer | Problem Solver**

### Skills

- React.js
- Node.js
- Express.js
- MongoDB
- JavaScript
- Socket.io
- WebRTC
- REST APIs
- Tailwind CSS
- Git & GitHub

---

# ⭐ Support

If you found this project useful, please consider giving it a **⭐ Star** on GitHub.

It motivates me to build more open-source projects!

---

# 📄 License

This project is licensed under the **MIT License**.
