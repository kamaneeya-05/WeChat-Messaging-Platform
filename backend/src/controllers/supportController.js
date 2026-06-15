const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Chat = require('../models/Chat');
const SupportSession = require('../models/SupportSession');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

// Keep track of errors and active connections globally for metrics
let globalErrorCount = 0;
let globalDisconnectCount = 0;

const createSession = async (req, res) => {
  try {
    const agentId = req.user?.userId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = uuidv4();

    // 1. Create a support chat room
    const chat = new Chat({
      type: 'support',
      chatName: `Support Call - ${token.substring(0, 8)}`,
      participants: [agentId],
      groupAdmins: [agentId]
    });
    await chat.save();

    // 2. Create Support Session
    const session = new SupportSession({
      token,
      agentId,
      chatId: chat._id,
      status: 'created',
      history: [{
        event: 'Support session created by agent',
        userId: agentId,
        userName: req.user.username
      }]
    });
    await session.save();

    res.status(201).json({ session, chat });
  } catch (error) {
    globalErrorCount++;
    console.error('Error creating support session:', error);
    res.status(500).json({ message: 'Server error creating support session', error });
  }
};

const joinSession = async (req, res) => {
  try {
    const { name, token } = req.body;
    if (!name || !token) {
      return res.status(400).json({ message: 'Name and token are required' });
    }

    const session = await SupportSession.findOne({ token }).populate('agentId', 'username');
    if (!session) {
      return res.status(404).json({ message: 'Support session not found' });
    }

    if (session.status === 'ended') {
      return res.status(400).json({ message: 'This support session has already ended' });
    }

    // 1. Register temporary customer guest user
    const guestUsername = `${name.replace(/\s+/g, '_')}_guest_${uuidv4().substring(0, 6)}`;
    const guestEmail = `${guestUsername.toLowerCase()}@temporary.wechat.support`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(uuidv4(), salt);

    const guestUser = new User({
      username: guestUsername,
      email: guestEmail,
      password: hashedPassword,
      status: 'online',
      role: 'customer',
      isTemporary: true
    });
    await guestUser.save();

    // 2. Add customer to session & chat
    session.customerId = guestUser._id;
    session.customerName = name;
    
    if (session.status === 'created') {
      session.status = 'active';
      session.startedAt = new Date();
    }
    
    session.history.push({
      event: `Customer '${name}' joined call`,
      userId: guestUser._id,
      userName: name
    });
    await session.save();

    // Add to chat participants
    await Chat.findByIdAndUpdate(session.chatId, {
      $addToSet: { participants: guestUser._id }
    });

    // 3. Generate JWT
    const jwtToken = jwt.sign(
      { userId: guestUser._id, username: name, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token: jwtToken,
      user: {
        id: guestUser._id,
        username: name,
        email: guestEmail,
        role: 'customer',
        status: 'online'
      },
      session
    });
  } catch (error) {
    globalErrorCount++;
    console.error('Error joining support session:', error);
    res.status(500).json({ message: 'Server error joining support session', error });
  }
};

const getSessionByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const session = await SupportSession.findOne({ token })
      .populate('agentId', 'username email status')
      .populate('customerId', 'username status');
    
    if (!session) {
      return res.status(404).json({ message: 'Support session not found' });
    }
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving session', error });
  }
};

const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const username = req.user?.username || 'Unknown';

    const session = await SupportSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Support session not found' });
    }

    session.status = 'ended';
    session.endedAt = new Date();
    session.history.push({
      event: 'Session ended',
      userId,
      userName: username
    });
    await session.save();

    res.status(200).json({ message: 'Session ended successfully', session });
  } catch (error) {
    globalErrorCount++;
    res.status(500).json({ message: 'Error ending session', error });
  }
};

const uploadRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await SupportSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Support session not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No recording file uploaded' });
    }

    // Save to E:\WeChat\WeChat\Whatsup-main\backend\uploads\recordings
    const uploadDir = path.join(__dirname, '../../uploads/recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFilename = `recording_${id}_${Date.now()}.webm`;
    const filePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(filePath, req.file.buffer);

    session.recordingUrl = `/uploads/recordings/${uniqueFilename}`;
    session.recordingStatus = 'ready';
    session.history.push({
      event: 'Recording file ready and uploaded',
      userName: 'System'
    });
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    globalErrorCount++;
    console.error('Error uploading recording:', error);
    res.status(500).json({ message: 'Error uploading recording', error });
  }
};

const getSessions = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    const role = req.user?.role;

    let query = {};
    // If user is agent and not admin, only show sessions they created
    if (role === 'agent') {
      query.agentId = currentUserId;
    }

    const sessions = await SupportSession.find(query)
      .populate('agentId', 'username email')
      .populate('customerId', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sessions', error });
  }
};

const getMetrics = async (req, res) => {
  try {
    const totalSessions = await SupportSession.countDocuments();
    const activeSessions = await SupportSession.countDocuments({ status: 'active' });
    const endedSessions = await SupportSession.countDocuments({ status: 'ended' });
    const totalRecordings = await SupportSession.countDocuments({ recordingStatus: 'ready' });

    // Calculate currently connected users (participants) in active rooms
    // We will query this directly from the Live Session manager in the sockets logic
    // For simplicity, we can fetch active sockets directly or reference a local count
    const liveCount = require('../sockets/supportSocket').getConnectedParticipantsCount?.() || 0;

    const metricsText = `# HELP support_active_sessions Number of active support sessions
# TYPE support_active_sessions gauge
support_active_sessions ${activeSessions}

# HELP support_connected_participants Number of active participants connected to support sessions
# TYPE support_connected_participants gauge
support_connected_participants ${liveCount}

# HELP support_session_errors_total Total number of session errors encountered
# TYPE support_session_errors_total counter
support_session_errors_total ${globalErrorCount}

# HELP support_total_sessions_created Total support sessions created since startup
# TYPE support_total_sessions_created counter
support_total_sessions_created ${totalSessions}

# HELP support_total_recordings_saved Total completed call recordings stored
# TYPE support_total_recordings_saved counter
support_total_recordings_saved ${totalRecordings}

# HELP support_disconnects_total Total unexpected socket drops
# TYPE support_disconnects_total counter
support_disconnects_total ${globalDisconnectCount}
`;
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsText);
  } catch (error) {
    res.status(500).send('Error compiling metrics');
  }
};

const recordDisconnect = () => {
  globalDisconnectCount++;
};

module.exports = {
  createSession,
  joinSession,
  getSessionByToken,
  endSession,
  uploadRecording,
  getSessions,
  getMetrics,
  recordDisconnect
};
