const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access token gerekli',
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar
    
    const decoded = verifyToken(token);
    
    // Kullanıcıyı veritabanından al
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Kullanıcı bulunamadı',
        error: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      message: 'Geçersiz token',
      error: error.message
    });
  }
};

module.exports = authenticateToken; 