import { Request, Response } from 'express';
import { Book, Note } from '../models';
import { ReadingStatus } from '../models/Book';

// Kitapları Listele
export const getBooks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const books = await Book.findAll({
      where: { userId: req.user.id },
      include: [Note],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      message: 'Kitaplar başarıyla getirildi',
      books
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Kitap Detayı Getir
export const getBookById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { id } = req.params;
    
    const book = await Book.findOne({
      where: { id, userId: req.user.id },
      include: [Note]
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    res.status(200).json({
      message: 'Kitap detayları',
      book
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Yeni Kitap Ekle
export const addBook = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const {
      title,
      author,
      genre,
      publishYear,
      publisher,
      isbn,
      coverURL,
      pageCount,
      description
    } = req.body;

    // Gerekli alanları kontrol et
    if (!title || !author) {
      return res.status(400).json({ message: 'Kitap adı ve yazar bilgisi zorunludur' });
    }

    // Kitap oluştur
    const book = await Book.create({
      userId: req.user.id,
      title,
      author,
      genre,
      publishYear,
      publisher,
      isbn,
      coverURL,
      pageCount: pageCount || 0,
      currentPage: 0,
      progress: 0,
      status: ReadingStatus.TO_READ,
      description,
      isSharedWithPartner: false
    });

    res.status(201).json({
      message: 'Kitap başarıyla eklendi',
      book
    });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Kitap Güncelle
export const updateBook = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Önce kitabın var olduğunu ve kullanıcıya ait olduğunu kontrol et
    const book = await Book.findOne({
      where: { id, userId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    // İlerleme hesaplaması
    if (updateData.currentPage !== undefined && book.pageCount > 0) {
      updateData.progress = (updateData.currentPage / book.pageCount) * 100;

      // Kitap tamamlandıysa
      if (updateData.currentPage >= book.pageCount) {
        updateData.status = ReadingStatus.COMPLETED;
      } 
      // Kitap okunmaya başlandıysa
      else if (updateData.currentPage > 0 && book.status === ReadingStatus.TO_READ) {
        updateData.status = ReadingStatus.READING;
      }

      // Son okuma tarihini güncelle
      updateData.lastReadingDate = new Date();
    }

    // Kitabı güncelle
    await book.update(updateData);
    await book.reload();

    res.status(200).json({
      message: 'Kitap başarıyla güncellendi',
      book
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Kitap Sil
export const deleteBook = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    const { id } = req.params;

    // Önce kitabın var olduğunu ve kullanıcıya ait olduğunu kontrol et
    const book = await Book.findOne({
      where: { id, userId: req.user.id }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    // Kitaba ait notları da sil
    await Note.destroy({
      where: { bookId: id }
    });

    // Kitabı sil
    await book.destroy();

    res.status(200).json({
      message: 'Kitap başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 