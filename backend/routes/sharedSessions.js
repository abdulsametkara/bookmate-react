const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'bookmate_secret_key_2025';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ message: 'Geçersiz token' });
    }
    
    req.userId = user.userId || user.id;
    req.userEmail = user.email;
    next();
  });
};

// Database initialization - tables için
const initializeTables = async () => {
  try {
    // Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        initiator_id UUID NOT NULL,
        partner_ids UUID[], -- JSON array of partner IDs
        reading_mode VARCHAR(50) NOT NULL DEFAULT 'same_book',
        book_id UUID,
        book_title VARCHAR(255),
        book_author VARCHAR(255),
        book_total_pages INTEGER DEFAULT 300,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiator_id) REFERENCES users(id)
      )
    `);

    // Session messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_session_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Session progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_session_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        user_id UUID NOT NULL,
        book_id UUID,
        current_page INTEGER NOT NULL DEFAULT 0,
        total_pages INTEGER NOT NULL DEFAULT 300,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(session_id, user_id)
      )
    `);

    console.log('✅ Shared reading tables initialized successfully');
  } catch (error) {
    console.error('❌ Table initialization error:', error);
  }
};

// Initialize tables on startup
initializeTables();

// 📚 Aktif oturumlar listesi - GERÇEK VERİ
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    console.log(`📚 Getting sessions for user: ${req.userId}`);
    
    const sessionsQuery = `
      SELECT 
        srs.*,
        u."displayName" as initiator_name
      FROM shared_reading_sessions srs
      LEFT JOIN users u ON srs.initiator_id = u.id
      WHERE srs.initiator_id = $1 
         OR $1 = ANY(srs.partner_ids)
      ORDER BY srs.created_at DESC
    `;
    
    const result = await pool.query(sessionsQuery, [req.userId]);
    
    const sessions = result.rows.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      initiator_id: session.initiator_id,
      partner_ids: session.partner_ids || [],
      reading_mode: session.reading_mode,
      book_id: session.book_id,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
      participants: [], // Will be populated by separate query if needed
      book: session.book_id ? {
        id: session.book_id,
        title: session.book_title,
        author: session.book_author,
        totalPages: session.book_total_pages
      } : null
    }));
    
    console.log(`✅ Found ${sessions.length} sessions for user ${req.userId}`);
    res.json(sessions);
    
  } catch (error) {
    console.error('❌ Sessions fetch error:', error);
    res.status(500).json({ 
      message: 'Oturumlar yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📖 Tek session detayı - GERÇEK VERİ
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📖 Getting session details for: ${sessionId}`);
    
    const sessionQuery = `
      SELECT 
        srs.*,
        u."displayName" as initiator_name,
        b.title as real_book_title,
        b.author as real_book_author,
        b."pageCount" as real_book_pages,
        b.cover_image_url as real_book_cover
      FROM shared_reading_sessions srs
      LEFT JOIN users u ON srs.initiator_id = u.id
      LEFT JOIN books b ON srs.book_id = b.id
      WHERE srs.id = $1 
        AND (srs.initiator_id = $2 OR $2 = ANY(srs.partner_ids))
    `;
    
    const result = await pool.query(sessionQuery, [sessionId, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Oturum bulunamadı' });
    }
    
    const session = result.rows[0];
    
    // Get participants info
    const participantIds = [session.initiator_id, ...(session.partner_ids || [])];
    const participantsQuery = `
      SELECT id, "displayName", email 
      FROM users 
      WHERE id = ANY($1)
    `;
    
    const participantsResult = await pool.query(participantsQuery, [participantIds]);
    
    // Kitap bilgileri için önce gerçek veritabanındakini, sonra session'daki manuel bilgileri kullan
    const bookInfo = session.book_id ? {
      id: session.book_id,
      title: session.real_book_title || session.book_title || 'Bilinmeyen Kitap',
      author: session.real_book_author || session.book_author || 'Bilinmeyen Yazar',
      totalPages: session.real_book_pages || session.book_total_pages || 300,
      pageCount: session.real_book_pages || session.book_total_pages || 300,
      cover_url: session.real_book_cover,
      coverImageUrl: session.real_book_cover
    } : null;
    
    const sessionData = {
      id: session.id,
      title: session.title,
      description: session.description,
      initiator_id: session.initiator_id,
      partner_ids: session.partner_ids || [],
      reading_mode: session.reading_mode,
      book_id: session.book_id,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
      participants: participantsResult.rows.map(p => ({
        id: p.id,
        displayName: p.displayName || p.email.split('@')[0],
        email: p.email
      })),
      book: bookInfo
    };
    
    console.log(`✅ Session details retrieved for: ${sessionId}`, bookInfo ? `with book: ${bookInfo.title}` : 'without book');
    res.json(sessionData);
    
  } catch (error) {
    console.error('❌ Session detail fetch error:', error);
    res.status(500).json({ 
      message: 'Oturum detayı yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📊 Session progress - GERÇEK VERİ
router.get('/sessions/:sessionId/progress', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📊 Getting session progress for: ${sessionId}`);
    
    // Önce session'daki kitap bilgilerini al
    const sessionQuery = `
      SELECT book_id, book_title, book_author, book_total_pages
      FROM shared_reading_sessions
      WHERE id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [sessionId]);
    const sessionBook = sessionResult.rows[0] || {};
    
    const progressQuery = `
      SELECT 
        ssp.*,
        u."displayName", u.email,
                 b.title as real_book_title, 
         b.author as real_book_author, 
         b.cover_image_url as real_book_cover,
         b."pageCount" as real_book_pages
      FROM shared_session_progress ssp
      LEFT JOIN users u ON ssp.user_id = u.id
      LEFT JOIN books b ON ssp.book_id = b.id
      WHERE ssp.session_id = $1
      ORDER BY ssp.updated_at DESC
    `;
    
    const result = await pool.query(progressQuery, [sessionId]);
    
    const progress = result.rows.map(item => {
      // Kitap bilgileri için öncelik sırası: 1) Gerçek DB kitap, 2) Session kitap, 3) Default
      const bookTitle = item.real_book_title || sessionBook.book_title || 'Bilinmeyen Kitap';
      const bookAuthor = item.real_book_author || sessionBook.book_author || 'Bilinmeyen Yazar';
      const bookPages = item.real_book_pages || sessionBook.book_total_pages || item.total_pages || 300;
      const bookCover = item.real_book_cover;
      const bookId = item.book_id || sessionBook.book_id;
      
      return {
        id: item.id,
        session_id: item.session_id,
        user_id: item.user_id,
        user: {
          id: item.user_id,
          displayName: item.displayName || item.email?.split('@')[0] || 'Unknown',
          email: item.email,
          updated_at: item.updated_at
        },
        book_id: bookId,
        book: {
          id: bookId,
          title: bookTitle,
          author: bookAuthor,
          cover_url: bookCover,
          coverImageUrl: bookCover,
          totalPages: bookPages,
          pageCount: bookPages
        },
        current_page: item.current_page,
        total_pages: item.total_pages,
        progress_percentage: parseFloat(item.progress_percentage),
        reading_time_minutes: item.reading_time_minutes || 0,
        notes: item.notes,
        last_reading_date: item.last_reading_date,
        reading_speed_pages_per_hour: parseFloat(item.reading_speed_pages_per_hour) || 0,
        updated_at: item.updated_at
      };
    });
    
    console.log(`✅ Found ${progress.length} progress records for session: ${sessionId}`);
    res.json(progress);
    
  } catch (error) {
    console.error('❌ Session progress fetch error:', error);
    res.status(500).json({ 
      message: 'Oturum ilerlemesi yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 💬 Session messages - GERÇEK VERİ
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`💬 Getting session messages for: ${sessionId}`);
    
    const messagesQuery = `
      SELECT 
        ssm.*,
        u."displayName", u.email
      FROM shared_session_messages ssm
      LEFT JOIN users u ON ssm.user_id = u.id
      WHERE ssm.session_id = $1
      ORDER BY ssm.created_at ASC
    `;
    
    const result = await pool.query(messagesQuery, [sessionId]);
    
    const messages = result.rows.map(msg => ({
      id: msg.id,
      session_id: msg.session_id,
      user_id: msg.user_id,
      user: {
        id: msg.user_id,
        displayName: msg.displayName || msg.email?.split('@')[0] || 'Unknown',
        email: msg.email
      },
      content: msg.content,
      message_type: msg.message_type,
      created_at: msg.created_at
    }));
    
    console.log(`✅ Found ${messages.length} messages for session: ${sessionId}`);
    res.json(messages);
    
  } catch (error) {
    console.error('❌ Session messages fetch error:', error);
    res.status(500).json({ 
      message: 'Oturum mesajları yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 🚀 Ortak okuma oturumu başlat - GERÇEK VERİ
router.post('/start-session', authenticateToken, async (req, res) => {
  try {
    const { partnerIds, readingMode, bookId, title, description, bookInfo } = req.body;
    console.log(`🚀 Starting shared reading session for user: ${req.userId}`);
    console.log(`📖 Received bookId: "${bookId}" (type: ${typeof bookId})`);
    console.log(`📚 Received bookInfo:`, bookInfo);
    
    if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({ message: 'En az bir partner seçmelisiniz' });
    }
    
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Oturum başlığı gereklidir' });
    }
    
    if (!readingMode) {
      return res.status(400).json({ message: 'Okuma modu seçmelisiniz' });
    }
    
    // Kitap gerekli olan modlar için kitap kontrolü
    if ((readingMode === 'same_book' || readingMode === 'book_club') && !bookId) {
      return res.status(400).json({ message: 'Bu okuma modu için kitap seçimi gereklidir' });
    }
    
    // Partnerların varlığını kontrol et
    const partnerCheck = await pool.query(`
      SELECT id, "displayName", email FROM users WHERE id = ANY($1)
    `, [partnerIds]);
    
    if (partnerCheck.rows.length !== partnerIds.length) {
      return res.status(400).json({ message: 'Bazı partnerlar bulunamadı' });
    }
    
    // Gerçek kitap bilgilerini veritabanından al
    let bookTitle = null, bookAuthor = null, bookTotalPages = 300;
    let actualBookId = null;
    
    if (bookId) {
      try {
        // UUID formatında mı kontrol et
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(bookId)) {
          // UUID ise direkt kullan
          actualBookId = bookId;
          
          // Kitap bilgilerini veritabanından al
          const bookQuery = await pool.query(`
            SELECT title, author, "pageCount" 
            FROM books 
            WHERE id = $1
          `, [bookId]);
          
          if (bookQuery.rows.length > 0) {
            const book = bookQuery.rows[0];
            bookTitle = book.title;
            bookAuthor = book.author;
            bookTotalPages = book.pageCount || 300;
            console.log('📖 Gerçek kitap bulundu:', bookTitle);
          } else {
            console.log('⚠️ UUID kitap bulunamadı:', bookId);
          }
        } else {
          console.log('⚠️ Non-UUID bookId received, setting to null:', bookId);
        }
      } catch (error) {
        console.warn('⚠️ Book lookup error:', error);
      }
    }

    // Frontend'den gelen kitap bilgilerini fallback olarak kullan
    if (!bookTitle && bookInfo) {
      console.log('📚 Using frontend bookInfo as fallback');
      bookTitle = bookInfo.title;
      bookAuthor = bookInfo.author;
      bookTotalPages = bookInfo.totalPages || 300;
    }
    
    // Session'ı veritabanına kaydet (UUID otomatik oluşturulacak)
    const insertSessionQuery = `
      INSERT INTO shared_reading_sessions (
        title, description, initiator_id, partner_ids, 
        reading_mode, book_id, book_title, book_author, book_total_pages, 
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    
    const sessionResult = await pool.query(insertSessionQuery, [
      title.trim(),
      description?.trim() || null,
      req.userId,
      partnerIds,
      readingMode,
      actualBookId, // Gerçek UUID book_id
      bookTitle,
      bookAuthor,
      bookTotalPages,
      'active'
    ]);
    
    const session = sessionResult.rows[0];
    
    // Response için session data hazırla
    const responseData = {
      id: session.id,
      title: session.title,
      description: session.description,
      initiator_id: session.initiator_id,
      partner_ids: session.partner_ids,
      reading_mode: session.reading_mode,
      book_id: session.book_id,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
      participants: [
        // Initiator
        { id: req.userId, displayName: 'Sen', email: 'current_user' },
        // Partners
        ...partnerCheck.rows.map(partner => ({
          id: partner.id,
          displayName: partner.displayName || partner.email.split('@')[0],
          email: partner.email
        }))
      ],
      book: actualBookId ? {
        id: actualBookId, // Gerçek UUID
        title: bookTitle,
        author: bookAuthor,
        totalPages: bookTotalPages
      } : null
    };
    
    // Partnerlere bildirim gönder
    for (const partnerId of partnerIds) {
      try {
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, related_user_id)
          VALUES ($1, 'message', 'Yeni Ortak Okuma Oturumu', $2, $3)
        `, [
          partnerId,
          `"${title}" başlıklı ortak okuma oturumuna davet edildiniz!`,
          req.userId
        ]);
      } catch (notificationError) {
        console.warn('⚠️ Notification creation failed:', notificationError);
      }
    }
    
    console.log(`✅ Shared reading session created: ${session.id}`);
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error('❌ Start shared session error:', error);
    res.status(500).json({ 
      message: 'Ortak okuma oturumu başlatılırken hata oluştu',
      error: error.message 
    });
  }
});

// 💬 Send message - GERÇEK VERİ
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { sessionId, messageType, content } = req.body;
    console.log(`💬 Sending message for session: ${sessionId} from user: ${req.userId}`);
    
    if (!sessionId || !content || !content.trim()) {
      return res.status(400).json({ message: 'Oturum ID ve mesaj içeriği gereklidir' });
    }
    
    if (!messageType || !['text', 'progress', 'system'].includes(messageType)) {
      return res.status(400).json({ message: 'Geçersiz mesaj tipi' });
    }
    
    // Session erişim kontrolü
    const sessionCheck = await pool.query(`
      SELECT id FROM shared_reading_sessions 
      WHERE id = $1 AND (initiator_id = $2 OR $2 = ANY(partner_ids))
    `, [sessionId, req.userId]);
    
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu oturuma erişim yetkiniz yok' });
    }
    
    // Mesajı veritabanına kaydet (UUID otomatik oluşturulacak)
    const insertMessageQuery = `
      INSERT INTO shared_session_messages (session_id, user_id, content, message_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const messageResult = await pool.query(insertMessageQuery, [
      sessionId,
      req.userId,
      content.trim(),
      messageType
    ]);
    
    const savedMessage = messageResult.rows[0];
    
    // User bilgilerini al
    const userQuery = await pool.query(`
      SELECT "displayName", email FROM users WHERE id = $1
    `, [req.userId]);
    
    const user = userQuery.rows[0];
    
    const responseMessage = {
      id: savedMessage.id,
      session_id: savedMessage.session_id,
      user_id: savedMessage.user_id,
      user: {
        id: req.userId,
        displayName: user?.displayName || user?.email?.split('@')[0] || 'Sen',
        email: user?.email
      },
      content: savedMessage.content,
      message_type: savedMessage.message_type,
      created_at: savedMessage.created_at
    };
    
    console.log(`✅ Message sent: ${savedMessage.id}`);
    res.status(201).json({ 
      success: true, 
      message: 'Mesaj gönderildi',
      data: responseMessage
    });
    
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ 
      message: 'Mesaj gönderilirken hata oluştu',
      error: error.message 
    });
  }
});

// 📊 Update reading progress - GERÇEK VERİ
router.post('/update-progress', authenticateToken, async (req, res) => {
  try {
    const { sessionId, bookId, currentPage, totalPages } = req.body;
    console.log(`📊 Updating progress for session: ${sessionId}, user: ${req.userId}, page: ${currentPage}/${totalPages}`);
    
    if (!sessionId || currentPage === undefined || totalPages === undefined) {
      return res.status(400).json({ message: 'Session ID, sayfa numarası ve toplam sayfa gereklidir' });
    }
    
    if (currentPage < 0 || currentPage > totalPages) {
      return res.status(400).json({ message: 'Sayfa numarası 0 ile toplam sayfa arasında olmalıdır' });
    }
    
    // Session erişim kontrolü
    const sessionCheck = await pool.query(`
      SELECT id, book_total_pages FROM shared_reading_sessions 
      WHERE id = $1 AND (initiator_id = $2 OR $2 = ANY(partner_ids))
    `, [sessionId, req.userId]);
    
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu oturuma erişim yetkiniz yok' });
    }
    
    const session = sessionCheck.rows[0];
    const actualTotalPages = totalPages || session.book_total_pages || 300;
    const progressPercentage = Math.round((currentPage / actualTotalPages) * 100);
    
    // Progress'i veritabanına kaydet (upsert) - UUID otomatik oluşturulacak
    const upsertProgressQuery = `
      INSERT INTO shared_session_progress (session_id, user_id, book_id, current_page, total_pages, progress_percentage, reading_time_minutes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT ON CONSTRAINT unique_session_user_progress
      DO UPDATE SET 
        current_page = EXCLUDED.current_page,
        total_pages = EXCLUDED.total_pages,
        progress_percentage = EXCLUDED.progress_percentage,
        reading_time_minutes = EXCLUDED.reading_time_minutes,
        updated_at = NOW()
      RETURNING *
    `;
    
    // bookId UUID kontrolü
    let actualBookId = null;
    if (bookId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(bookId)) {
        actualBookId = bookId;
      }
    }
    
    // Get reading time from request or calculate based on previous progress
    const readingTimeMinutes = req.body.readingTimeMinutes || 0;

    const progressResult = await pool.query(upsertProgressQuery, [
      sessionId,
      req.userId,
      actualBookId, // Gerçek UUID book_id
      currentPage,
      actualTotalPages,
      progressPercentage,
      readingTimeMinutes
    ]);
    
    const savedProgress = progressResult.rows[0];
    
    // Progress message gönder
    const progressMessageContent = `İlerleme güncellendi: ${currentPage}/${actualTotalPages} sayfa (%${progressPercentage})`;
    
    await pool.query(`
      INSERT INTO shared_session_messages (session_id, user_id, content, message_type, created_at)
      VALUES ($1, $2, $3, 'progress', NOW())
    `, [sessionId, req.userId, progressMessageContent]);
    
    console.log(`✅ Progress updated: ${currentPage}/${actualTotalPages} (${progressPercentage}%)`);
    res.status(200).json({ 
      success: true, 
      message: 'İlerleme güncellendi',
      data: {
        id: savedProgress.id,
        session_id: savedProgress.session_id,
        user_id: savedProgress.user_id,
        book_id: savedProgress.book_id,
        current_page: savedProgress.current_page,
        total_pages: savedProgress.total_pages,
        progress_percentage: parseFloat(savedProgress.progress_percentage),
        updated_at: savedProgress.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Update progress error:', error);
    res.status(500).json({ 
      message: 'İlerleme güncellenirken hata oluştu',
      error: error.message 
    });
  }
});

// 🗑️ Delete session - GERÇEK VERİ
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🗑️ Deleting session: ${sessionId} by user: ${req.userId}`);
    
    // Session'ın varlığını ve kullanıcının yetkisini kontrol et
    const sessionCheck = await pool.query(`
      SELECT id, initiator_id, title FROM shared_reading_sessions 
      WHERE id = $1 AND initiator_id = $2
    `, [sessionId, req.userId]);
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Oturum bulunamadı veya silme yetkiniz yok. Sadece oturum başlatanı oturumu silebilir.' 
      });
    }
    
    const session = sessionCheck.rows[0];
    
    // Session ve ilgili tüm verileri sil (CASCADE)
    await pool.query('DELETE FROM shared_reading_sessions WHERE id = $1', [sessionId]);
    
    console.log(`✅ Session deleted: ${session.title} (${sessionId})`);
    res.json({ 
      success: true, 
      message: 'Oturum başarıyla silindi',
      deletedSession: {
        id: sessionId,
        title: session.title
      }
    });
    
  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({ 
      message: 'Oturum silinirken hata oluştu',
      error: error.message 
    });
  }
});

module.exports = router; 