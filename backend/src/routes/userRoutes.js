const { Router } = require('express');
const multer = require('multer');
const { searchUsers, getProfile, updateProfilePicture, deleteProfilePicture, updateProfileDetails } = require('../controllers/userController');
const { protectRoute } = require('../middleware/authMiddleware');

const router = Router();

// Configure Multer for profile picture upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for profile pictures
});

// Protect this route so only logged-in users can search
router.get('/', protectRoute, searchUsers);

// Get current user's profile
router.get('/profile/me', protectRoute, getProfile);

// Update profile details
router.put('/profile', protectRoute, updateProfileDetails);

// Update profile picture
router.post('/profile/picture', protectRoute, upload.single('profilePicture'), updateProfilePicture);

// Delete profile picture
router.delete('/profile/picture', protectRoute, deleteProfilePicture);

module.exports = router;
