# ConnectNOW - Video Conferencing App

ConnectNOW is a full-stack real-time video conferencing web application (similar to Zoom) that allows users to register, log in, view their call history, and start or join high-quality video and audio call sessions. It utilizes WebRTC for peer-to-peer media streams and Socket.io for WebRTC signaling and real-time messaging.

---

## Features
- **User Authentication**: Secure Sign Up and Sign In.
- **Dynamic Meeting Rooms**: Create or join meetings with unique room codes.
- **Audio & Video Control**: Easily toggle microphone and camera.
- **Screen Sharing**: Share your screen with other meeting participants.
- **In-Call Real-Time Chat**: Send messages to all users in the room.
- **Activity History**: Keeps track of previous meetings.

---

## Tech Stack
- **Frontend**: React, Material-UI (MUI), Socket.io-client, Axios, HTML5, CSS3.
- **Backend**: Node.js, Express, Socket.io (Signaling Server), MongoDB & Mongoose.

---

## Local Setup & Run Instructions

Ensure you have [Node.js](https://nodejs.org/) installed (v16+ recommended) and a running instance of MongoDB (locally or on MongoDB Atlas).

### 1. Clone & Folder Structure
```bash
ConnectNow/
├── backend/      # Express API & Socket.io server
└── frontend/     # React Client
```

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   *Modify the `MONGO_URL` in `.env` to point to your MongoDB instance if necessary.*
4. Start the backend server in development mode:
   ```bash
   npm run dev
   ```
   *The server will start listening on port `8000` (or the port defined in your `.env`).*

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
   *The client will open automatically at [http://localhost:3000](http://localhost:3000).*

---

## License & Attribution
Adapted and customized for ConnectNOW.
Original project developed for video conferencing functionality using React and Express.
