const { Router } = require('express');
const multer = require('multer');
const { protectRoute } = require('../middleware/authMiddleware');
const {
  createSession,
  joinSession,
  getSessionByToken,
  endSession,
  uploadRecording,
  getSessions,
  getMetrics
} = require('../controllers/supportController');

const router = Router();

// Configure Multer for recording file upload in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB recording limit
});

// Support session API routes
router.post('/session', protectRoute, createSession);
router.get('/sessions', protectRoute, getSessions);
router.post('/join', joinSession); // Public: customers use this to obtain guest JWT
router.get('/session/:token', getSessionByToken); // Public: details to show join screen
router.post('/session/:id/end', protectRoute, endSession);
router.post('/session/:id/recording', protectRoute, upload.single('recording'), uploadRecording);
router.get('/metrics', getMetrics); // Public Prometheus observability metrics

module.exports = router;
