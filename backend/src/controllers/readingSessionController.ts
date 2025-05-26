import { Request, Response } from 'express';
import { ReadingSession, Book } from '../models';
import { ReadingStatus } from '../models/Book';

// Yeni okuma seansı başlat
export const startSession = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'Kitap ID\'si gereklidir' });
    }

    // Kitabın varlığını ve kullanıcıya ait olduğunu kontrol et
    const book = await Book.findOne({
      where: { id: bookId, userId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    // Kitap durumunu güncelle
    if (book.status === ReadingStatus.TO_READ) {
      await book.update({ status: ReadingStatus.READING });
    }

    // Yeni okuma seansı oluştur
    const session = await ReadingSession.create({
      userId: req.user.id,
      bookId,
      startTime: new Date(),
      duration: 0,
      pagesRead: 0
    });

    res.status(201).json({
      message: 'Okuma seansı başlatıldı',
      session
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Okuma seansını bitir
export const endSession = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { sessionId, pagesRead } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Seans ID\'si gereklidir' });
    }

    // Seansın varlığını ve kullanıcıya ait olduğunu kontrol et
    const session = await ReadingSession.findOne({
      where: { id: sessionId, userId: req.user.id },
      include: [Book]
    });

    if (!session) {
      return res.status(404).json({ message: 'Okuma seansı bulunamadı' });
    }

    // Seans zaten bitmiş mi kontrol et
    if (session.endTime) {
      return res.status(400).json({ message: 'Bu okuma seansı zaten sona ermiş' });
    }

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    
    // Saniye cinsinden süre hesapla
    const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Seansı güncelle
    await session.update({
      endTime,
      duration: durationInSeconds,
      pagesRead: pagesRead || 0
    });

    // Kitabı yeniden yükle ve güncelle
    const book = await Book.findByPk(session.bookId);
    
    if (book && pagesRead) {
      const newCurrentPage = Math.min(book.currentPage + pagesRead, book.pageCount);
      const newProgress = book.pageCount > 0 ? (newCurrentPage / book.pageCount) * 100 : 0;
      
      // Kitap durumunu güncelle
      let newStatus = book.status;
      if (newCurrentPage >= book.pageCount) {
        newStatus = ReadingStatus.COMPLETED;
      } else if (newCurrentPage > 0) {
        newStatus = ReadingStatus.READING;
      }
      
      await book.update({
        currentPage: newCurrentPage,
        progress: newProgress,
        status: newStatus,
        lastReadingDate: endTime
      });
    }

    // Güncellenmiş seansı getir
    await session.reload({ include: [Book] });

    res.status(200).json({
      message: 'Okuma seansı tamamlandı',
      session,
      book: session.book
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Kullanıcının okuma seanslarını getir
export const getSessions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { bookId } = req.query;

    // Sorgu parametreleri
    const whereClause: any = { userId: req.user.id };
    
    // Belirli bir kitap için filtrele
    if (bookId) {
      whereClause.bookId = bookId;
    }

    const sessions = await ReadingSession.findAll({
      where: whereClause,
      include: [Book],
      order: [['startTime', 'DESC']]
    });

    res.status(200).json({
      message: 'Okuma seansları başarıyla getirildi',
      sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 