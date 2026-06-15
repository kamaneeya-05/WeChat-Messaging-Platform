# Real-Time Video Support Platform — ATOMQUEST HACKATHON 1.0 (Grand Finale)

An end-to-end, self-hosted, real-time video support session platform. Built entirely with vanilla technologies and custom socket relays, avoiding third-party video SDK dependencies or direct peer-to-peer NAT traversal issues.

---

## 🚀 Key Features Implemented

### 1. Session Management
- **Agent Dashboard (`/support`)**: Support agents can create new call sessions with one click and copy a unique invite link.
- **Frictionless Customer Join**: Customers join using a simple link (e.g., `/support/session/<token>`) by entering their name. No permanent registration or app download is required.
- **Join History Logs**: Tracks exactly who entered, when they joined/left, and durations in a persisted history record.
- **Session Closure**: Either participant can leave, and agents can terminate the session for everyone, cleanly closing all active web socket media streams.

### 2. Audio & Video Calling (Server-Routed Media)
- **WebSocket Media Relay**: To comply with the strict requirement that media must route through our own server, we built a custom WebSocket media relay. Local video is captured from a canvas (12 FPS JPEG) and relayed as socket payloads. Local audio is captured as Float32 PCM arrays, converted to highly optimized Int16 buffers, and played back using browser Web Audio API queues.
- **Microphone and Camera Toggles**: Both participants can mute their audio and turn off their video dynamically.
- **Stable Under Jitter**: Frame dropping is handled gracefully by design.

### 3. In-Call Chat & File Sharing
- **Real-Time Messages**: Integrated text chat panel within the calling room.
- **File Sharing**: Participants can upload files (images, PDFs, documents up to 15MB) during an active call. File uploads use a secure Multer controller on the server.
- **Chat History**: Persisted in the database and fully retrievable after the call.

### 4. Reconnect Handling
- **15-Second Grace Window**: If a user drops connection unexpectedly, the server holds their spot and starts a 15-second grace window timer.
- **Seamless Re-Entry**: If they reconnect within the window, their UI resets, and the call continues without notifying the other participant. After 15 seconds, they are officially removed.

### 5. Admin Operations Dashboard (`/support/admin`)
- **Real-Time Metrics Grid**: Displays live session counts, active callers, and unexpected socket drops.
- **Live Calls Registry**: Displays active sessions with duration timers and the ability to force-terminate any call.
- **Telemetry endpoint (`/api/support/metrics`)**: Exposes standard Prometheus-compatible telemetry metrics.
- **Historical Logs Auditing**: Allows admins to view detailed event history timelines (joins, leaves, disconnects, ends) for completed calls.

### 6. Call Recording
- **Side-by-Side Composite**: The agent's browser creates a side-by-side composite canvas of both video streams and mixes both local and remote audio.
- **Zero Server Overhead**: The resulting WebM recording is created client-side, avoiding CPU-intensive server encoding.
- **Downloadable File**: Uploaded to the backend uploads directory and made available on the agent's dashboard as a `.webm` file.

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Redux Toolkit, TailwindCSS, Socket.io-client, Lucide Icons.
- **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose), Multer.

---

## 📦 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Setup Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/wechat_app
   PORT=5000
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=super_secret_secret
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

### 2. Setup Frontend
1. Navigate to the frontend directory:
   ```bash
   cd message
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Access the app in your browser at `http://localhost:5173`.
5. Access the **Support Center** from the user settings menu (avatar dropdown) -> **Support Center**.
6. Access the **Admin Dashboard** via `/support/admin` or clicking the dashboard button on the Support Center.

---

## ☁️ Render Deployment Guide

The backend is configured to statically serve the React frontend build (`message/dist`) when run in production mode (`NODE_ENV=production`). This allows the entire project to be deployed as a **single Render Web Service**.

### 1. Configure the Web Service on Render
- **Repository**: Connect your GitHub repository.
- **Environment**: Node
- **Build Command**:
  ```bash
  cd message && npm install && npm run build && cd ../backend && npm install
  ```
- **Start Command**:
  ```bash
  cd backend && NODE_ENV=production npm start
  ```

### 2. Environment Variables on Render
Add these key-value pairs in the **Environment** tab of your Render service:
- `NODE_ENV` = `production`
- `MONGO_URI` = *[Your MongoDB connection string]*
- `JWT_SECRET` = *[A secure random string]*
- `PORT` = `10000` (Render's default)

---

## ⚠️ Known Limitations
1. **Browser Camera/Mic Permissions**: Users must allow browser camera and microphone access.
2. **Playout Context**: Web Audio API requires a user interaction gesture (e.g. clicking "Join Call") to start playing remote audio, which is handled in our join screens.
3. **Format**: Recording outputs are generated as standard WebM files.
