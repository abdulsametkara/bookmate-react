import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../utils/jwt';

// Username müsaitlik kontrolü
export const checkUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    console.log(`🔍 checkUsername called with username: ${username}`);

    // Username formatını kontrol et
    if (!username || username.length < 3 || username.length > 20) {
      console.log(`❌ Invalid username length: ${username?.length || 0}`);
      res.status(400).json({ 
        available: false, 
        message: 'Kullanıcı adı 3-20 karakter olmalıdır' 
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.log(`❌ Invalid username format: ${username}`);
      res.status(400).json({ 
        available: false, 
        message: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir' 
      });
      return;
    }

    // Username kullanımda mı kontrol et
    const existingUser = await User.findOne({ where: { username } });
    const isAvailable = !existingUser;
    
    console.log(`✅ Username ${username} availability: ${isAvailable}`);
    
    res.status(200).json({
      available: isAvailable,
      message: isAvailable ? 'Kullanıcı adı müsait' : 'Bu kullanıcı adı zaten alınmış'
    });
  } catch (error) {
    console.error('❌ Check username error:', error);
    res.status(500).json({ 
      available: false,
      message: 'Server error' 
    });
  }
};

// Kullanıcı kaydı
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName, username } = req.body;

    // Email formatını kontrol et
    if (!email || !email.includes('@') || !email.includes('.')) {
      res.status(400).json({ message: 'Geçerli bir email adresi giriniz' });
      return;
    }

    // Şifre uzunluğunu kontrol et
    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
      return;
    }

    // Username kontrolü
    if (!username || username.length < 3 || username.length > 20) {
      res.status(400).json({ message: 'Kullanıcı adı 3-20 karakter olmalıdır' });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ message: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir' });
      return;
    }

    // Aynı email ile kayıtlı kullanıcı var mı kontrol et
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
      return;
    }

    // Aynı username ile kayıtlı kullanıcı var mı kontrol et
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      res.status(400).json({ message: 'Bu kullanıcı adı zaten alınmış' });
      return;
    }

    // Yeni kullanıcı oluştur
    const user = await User.create({
      email,
      password,
      displayName: displayName || username,
      username
    });

    // Kullanıcı verilerinden şifreyi çıkar
    const userData = user.toJSON();
    delete userData.password;

    // Token oluştur
    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: userData,
      token
    });
  } catch (error: any) {
    console.error('Register error:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Bu kullanıcı adı veya email zaten kullanılıyor' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Kullanıcı girişi
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Email ve şifre kontrol et
    if (!email || !password) {
      res.status(400).json({ message: 'Email ve şifre gereklidir' });
      return;
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Geçersiz email veya şifre' });
      return;
    }

    // Şifreyi doğrula
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Geçersiz email veya şifre' });
      return;
    }

    // Son aktivite zamanını güncelle
    user.lastActive = new Date();
    await user.save();

    // Kullanıcı verilerinden şifreyi çıkar
    const userData = user.toJSON();
    delete userData.password;

    // Token oluştur
    const token = generateToken({ id: user.id, email: user.email });

    res.status(200).json({
      message: 'Giriş başarılı',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Kullanıcı bilgilerini getir
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Yetkilendirme gerekli' });
      return;
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      return;
    }

    res.status(200).json({
      message: 'Profil bilgileri',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Username ile kullanıcı ara
export const searchByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      res.status(400).json({ message: 'Arama için en az 3 karakter giriniz' });
      return;
    }

    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'displayName', 'photoURL']
    });

    if (!user) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      return;
    }

    res.status(200).json({
      message: 'Kullanıcı bulundu',
      user
    });
  } catch (error) {
    console.error('Search username error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 