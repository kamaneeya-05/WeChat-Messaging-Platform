const { Router } = require('express');
const { register, login, logout } = require('../controllers/authController');
const { protectRoute } = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protectRoute, logout);

module.exports = router;
