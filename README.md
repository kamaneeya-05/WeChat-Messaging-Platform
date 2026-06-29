# 💬 Real-Time Chat & Customer Support Platform

A full-stack real-time communication platform that enables secure messaging, voice/video support sessions, file sharing, and live customer assistance. The application provides dedicated interfaces for customers, support agents, and administrators while maintaining persistent chat history and session analytics.

---

## ✨ Features

### 🔐 User Authentication
- Secure user registration and login using JWT authentication
- Protected routes and session management
- User profile management

### 💬 Real-Time Messaging
- One-to-one instant messaging
- Live typing indicators
- Online/offline user status
- Read receipts
- Persistent chat history

### 📎 Media & File Sharing
- Share images, PDFs, and documents
- Secure file uploads using Multer
- Downloadable message attachments

### 📞 Voice & Video Support
- Real-time audio and video communication
- Camera and microphone controls
- Built-in customer support sessions
- Unique invite links for customers
- Automatic reconnection handling
- Client-side call recording

### 🛠️ Support Center
- Create and manage support sessions
- Invite customers using secure session links
- Integrated in-call chat
- Session history and participant tracking

### 📊 Admin Dashboard
- Monitor active support sessions
- Live system statistics
- Session history and audit logs
- Force terminate active sessions
- Telemetry endpoint for monitoring

---

## 🏗️ Tech Stack

### Frontend
- React (Vite)
- Redux Toolkit
- Tailwind CSS
- Socket.IO Client
- Axios
- Lucide React

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- JWT Authentication
- Multer

---

## 📁 Project Structure

```text
wechat-application/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── uploads/
│   └── server.js
│
├── message/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wechat-application
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the **backend** folder.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_key
```

Start the backend server.

```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd message
npm install
npm run dev
```

Open your browser and visit:

```
http://localhost:5173
```

---

## ☁️ Deployment (Render)

### Build Command

```bash
cd message && npm install && npm run build && cd ../backend && npm install
```

### Start Command

```bash
cd backend && NODE_ENV=production npm start
```

### Environment Variables

```env
NODE_ENV=production
PORT=10000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
```

---

## 🚀 Key Highlights

- 💬 Real-time one-to-one messaging
- 📞 Voice and video support sessions
- 📂 File and document sharing
- 🔐 JWT-based authentication
- 📊 Live admin dashboard
- 📝 Persistent chat history
- 🔄 Automatic reconnection support
- 🎥 Client-side call recording
- 📡 Socket.IO powered communication
- 📱 Responsive React interface

---

## 📄 License

This project was developed for educational and learning purposes.
