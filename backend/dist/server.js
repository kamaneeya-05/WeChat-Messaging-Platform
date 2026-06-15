"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./config/db"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const chatSocket_1 = require("./sockets/chatSocket");
dotenv_1.default.config();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: CLIENT_URL }));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// 1. Connect to Database
(0, db_1.default)();
// 2. Setup Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/chats', chatRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
});
// Configure Socket.io events
(0, chatSocket_1.configureSockets)(io);
app.get('/', (req, res) => {
    res.send('Messaging API is running');
});
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
