import { Router } from 'express';
import { Request, Response } from 'express';
import { Partnership, User } from '../models';
import { PartnershipType, PartnershipStatus } from '../models/Partnership';
import { authenticate } from '../middleware/auth';
import { Op } from 'sequelize';

const router = Router();

// Partner arama - @username ile
router.get('/search/:query', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.params;
    const userId = req.user?.id;

    // Kullanıcı adına göre ara (@ işareti varsa kaldır)
    const searchQuery = query.startsWith('@') ? query.slice(1) : query;

    const users = await User.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { username: { [Op.iLike]: `%${searchQuery}%` } },
              { displayName: { [Op.iLike]: `%${searchQuery}%` } }
            ]
          },
          { id: { [Op.ne]: userId } } // Kendisini hariç tut
        ]
      },
      attributes: ['id', 'username', 'displayName', 'photoURL'],
      limit: 10
    });

    // Mevcut partnership durumlarını kontrol et
    const userIds = users.map(user => user.id);
    const existingPartnerships = await Partnership.findAll({
      where: {
        [Op.or]: [
          { requesterId: userId, receiverId: { [Op.in]: userIds } },
          { receiverId: userId, requesterId: { [Op.in]: userIds } }
        ]
      }
    });

    const usersWithStatus = users.map(user => {
      const partnership = existingPartnerships.find(p => 
        (p.requesterId === userId && p.receiverId === user.id) ||
        (p.receiverId === userId && p.requesterId === user.id)
      );

      return {
        ...user.toJSON(),
        partnershipStatus: partnership?.status || 'NONE',
        partnershipType: partnership?.type || null
      };
    });

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Partner arama hatası:', error);
    res.status(500).json({ message: 'Partner arama sırasında hata oluştu' });
  }
});

// Partner daveti gönder
router.post('/invite', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiverId, type, message } = req.body;
    const requesterId = req.user?.id;

    // Parametreleri kontrol et
    if (!receiverId || !type) {
      res.status(400).json({ message: 'Alıcı ID ve ilişki türü gerekli' });
      return;
    }

    if (!Object.values(PartnershipType).includes(type)) {
      res.status(400).json({ message: 'Geçersiz ilişki türü' });
      return;
    }

    // Alıcının varlığını kontrol et
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      return;
    }

    // Gönderen kullanıcı bilgilerini al
    const requester = await User.findByPk(requesterId);
    if (!requester) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      return;
    }

    // Mevcut partnership kontrolü
    const existingPartnership = await Partnership.findOne({
      where: {
        [Op.or]: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existingPartnership) {
      res.status(400).json({ 
        message: 'Bu kullanıcı ile zaten bir partner ilişkiniz mevcut',
        status: existingPartnership.status
      });
      return;
    }

    // Yeni partnership oluştur
    const partnership = await Partnership.create({
      requesterId,
      receiverId,
      type,
      message: message || `${requester.displayName} sizinle ${type} olarak partner olmak istiyor!`,
      status: PartnershipStatus.PENDING
    });

    // Partner bilgilerini dahil ederek yanıtla
    const partnershipWithUsers = await Partnership.findByPk(partnership.id, {
      include: [
        { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'photoURL'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'photoURL'] }
      ]
    });

    res.status(201).json({
      message: 'Partner daveti gönderildi',
      partnership: partnershipWithUsers
    });
  } catch (error) {
    console.error('Partner daveti gönderme hatası:', error);
    res.status(500).json({ message: 'Partner daveti gönderilirken hata oluştu' });
  }
});

// Mevcut partnerleri listele
router.get('/list', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const partnerships = await Partnership.findAll({
      where: {
        [Op.or]: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: PartnershipStatus.ACCEPTED
      },
      include: [
        { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'photoURL'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'photoURL'] }
      ],
      order: [['acceptedAt', 'DESC']]
    });

    // Partner bilgilerini düzenle (kendisi olmayan kullanıcıyı göster)
    const partnersWithInfo = partnerships.map(partnership => {
      const isRequester = partnership.requesterId === userId;
      const partner = isRequester ? partnership.receiver : partnership.requester;
      
      return {
        partnershipId: partnership.id,
        type: partnership.type,
        acceptedAt: partnership.acceptedAt,
        partner: partner
      };
    });

    res.json(partnersWithInfo);
  } catch (error) {
    console.error('Partnerleri listeleme hatası:', error);
    res.status(500).json({ message: 'Partnerler listelenirken hata oluştu' });
  }
});

export default router; 