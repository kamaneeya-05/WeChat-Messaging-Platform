"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All chat routes should be protected
router.use(authMiddleware_1.protectRoute);
router.post('/', chatController_1.createOrFetchChat);
router.get('/', chatController_1.getUserChats);
router.put('/group/remove', chatController_1.removeFromGroup);
router.post('/group', chatController_1.createGroupChat);
exports.default = router;
