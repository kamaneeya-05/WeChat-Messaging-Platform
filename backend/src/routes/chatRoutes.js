const { Router } = require('express');
const { createOrFetchChat, getUserChats, removeFromGroup, createGroupChat } = require('../controllers/chatController');
const { protectRoute } = require('../middleware/authMiddleware');

const router = Router();

// All chat routes should be protected
router.use(protectRoute);

router.post('/', createOrFetchChat);
router.get('/', getUserChats);
router.put('/group/remove', removeFromGroup)
router.post('/group', createGroupChat)

module.exports = router;
