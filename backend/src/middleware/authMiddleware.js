const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

const protectRoute = (req, res, next) => {
  try {
    // 2. Get the token from the Authorization header (Format: "Bearer <token>")
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 3. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Attach the decoded user payload to the request object
    req.user = decoded;

    // 5. Move to the next middleware or controller
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = { protectRoute };
