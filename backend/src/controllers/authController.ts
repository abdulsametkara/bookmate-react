import { Request, Response } from 'express';
import { User } from '../models';
import { generateToken } from '../utils/jwt';

// Kullanıcı kaydı
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

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

    // Aynı email ile kayıtlı kullanıcı var mı kontrol et
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
      return;
    }

    // Yeni kullanıcı oluştur
    const user = await User.create({
      email,
      password,
      displayName: displayName || email.split('@')[0], // displayName yoksa email'den üret
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
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