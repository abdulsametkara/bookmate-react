import jwt from 'jsonwebtoken';
import config from '../config/config';

interface UserPayload {
  id: string;
  email: string;
}

export const generateToken = (user: UserPayload): string => {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): UserPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}; 