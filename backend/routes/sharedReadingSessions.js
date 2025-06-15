const express = require('express');
const router = express.Router();

// Database connection - backend/app.js'den import edilecek
let pool;

const initializePool = (dbPool) => {
  pool = dbPool;
};

// 📚 Ortak Okuma Seansları API'leri

// Kullanıcının gruplarını listeleme
router.get('/my-groups', async (req, res) => {
  try {
    const userId = req.userId;

    const groups = await pool.query(`
      SELECT 
        srg.id,
        srg.name,
        srg.description,
        srg.group_type,
        srg.max_members,
        srg.is_active,
        srg."createdAt",
        srm.role as my_role,
        COUNT(DISTINCT srm2.user_id) as member_count,
        ARRAY_AGG(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'displayName', u."displayName",
            'username', u.username,
            'role', srm2.role
          )
        ) as members
      FROM shared_reading_groups srg
      JOIN shared_reading_memberships srm ON srg.id = srm.group_id
      JOIN shared_reading_memberships srm2 ON srg.id = srm2.group_id
      JOIN users u ON srm2.user_id = u.id
      WHERE srm.user_id = $1 AND srm.status = 'active' AND srm2.status = 'active'
      GROUP BY srg.id, srm.role
      ORDER BY srg."createdAt" DESC
    `, [userId]);

    res.json({
      message: 'Gruplar listelendi',
      groups: groups.rows
    });

  } catch (error) {
    console.error('❌ Get user groups error:', error);
    res.status(500).json({ message: 'Gruplar listelenirken hata oluştu' });
  }
});

// Yeni ortak okuma seansı başlatma
router.post('/start-session', async (req, res) => {
  try {
    const { groupId, bookId, sessionType, targetEndDate, targetPages } = req.body;
    const userId = req.userId;

    console.log('📖 Starting shared reading session:', { groupId, bookId, sessionType });

    // Grup kontrolü ve yetki kontrolü
    const groupCheck = await pool.query(`
      SELECT srg.*, srm.role 
      FROM shared_reading_groups srg
      JOIN shared_reading_memberships srm ON srg.id = srm.group_id
      WHERE srg.id = $1 AND srm.user_id = $2 AND srm.status = 'active'
    `, [groupId, userId]);

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu gruba erişim yetkiniz yok' });
    }

    // Kitap kontrolü
    const bookCheck = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    const book = bookCheck.rows[0];

    // Aktif seans kontrolü
    const activeSessionCheck = await pool.query(`
      SELECT id FROM shared_reading_sessions 
      WHERE group_id = $1 AND is_active = true
    `, [groupId]);

    if (activeSessionCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Bu grupta zaten aktif bir okuma seansı var' });
    }

    // Yeni seans oluştur
    const newSession = await pool.query(`
      INSERT INTO shared_reading_sessions (
        group_id,
        book_id,
        session_type,
        start_date,
        target_end_date,
        target_pages
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
      RETURNING id, "createdAt"
    `, [groupId, bookId, sessionType, targetEndDate, targetPages || book.page_count]);

    const sessionId = newSession.rows[0].id;

    // Grup üyelerini seansa ekle
    const groupMembers = await pool.query(`
      SELECT user_id FROM shared_reading_memberships 
      WHERE group_id = $1 AND status = 'active'
    `, [groupId]);

    for (const member of groupMembers.rows) {
      await pool.query(`
        INSERT INTO shared_reading_progress (
          session_id,
          user_id,
          total_pages,
          reading_status
        ) VALUES ($1, $2, $3, 'not_started')
      `, [sessionId, member.user_id, targetPages || book.page_count]);
    }

    // Grup üyelerine bildirim gönder (session başlatanı hariç)
    const notificationMembers = groupMembers.rows.filter(m => m.user_id !== userId);
    for (const member of notificationMembers) {
      await pool.query(`
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_group_id,
          related_session_id
        ) VALUES ($1, 'reading_update', 'Yeni Okuma Seansı', $2, $3, $4)
      `, [
        member.user_id,
        `"${book.title}" kitabı için yeni bir ortak okuma seansı başlatıldı`,
        groupId,
        sessionId
      ]);
    }

    console.log('✅ Shared reading session started successfully');

    res.status(201).json({
      message: 'Ortak okuma seansı başlatıldı',
      sessionId: sessionId,
      bookTitle: book.title
    });

  } catch (error) {
    console.error('❌ Start session error:', error);
    res.status(500).json({ message: 'Seans başlatılırken hata oluştu' });
  }
});

// Aktif seansları listeleme
router.get('/active-sessions', async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await pool.query(`
      SELECT 
        srs.id,
        srs.session_type,
        srs.start_date,
        srs.target_end_date,
        srs.target_pages,
        srs."createdAt",
        b.title as book_title,
        b.author as book_author,
        b.cover_image_url,
        b.page_count as book_total_pages,
        srg.name as group_name,
        srg.group_type,
        srp.current_page as my_current_page,
        srp.reading_status as my_reading_status,
        srp.last_activity as my_last_activity,
        COUNT(DISTINCT srp2.user_id) as total_participants,
        AVG(srp2.current_page) as avg_progress,
        MAX(srp2.current_page) as max_progress,
        MIN(srp2.current_page) as min_progress
      FROM shared_reading_sessions srs
      JOIN books b ON srs.book_id = b.id
      JOIN shared_reading_groups srg ON srs.group_id = srg.id
      JOIN shared_reading_memberships srm ON srg.id = srm.group_id
      JOIN shared_reading_progress srp ON srs.id = srp.session_id AND srp.user_id = $1
      LEFT JOIN shared_reading_progress srp2 ON srs.id = srp2.session_id
      WHERE srm.user_id = $1 AND srm.status = 'active' AND srs.is_active = true
      GROUP BY srs.id, b.id, srg.id, srp.current_page, srp.reading_status, srp.last_activity
      ORDER BY srs."createdAt" DESC
    `, [userId]);

    res.json({
      message: 'Aktif seanslar listelendi',
      sessions: sessions.rows.map(session => ({
        id: session.id,
        sessionType: session.session_type,
        startDate: session.start_date,
        targetEndDate: session.target_end_date,
        targetPages: session.target_pages,
        book: {
          title: session.book_title,
          author: session.book_author,
          coverImageUrl: session.cover_image_url,
          totalPages: session.book_total_pages
        },
        group: {
          name: session.group_name,
          type: session.group_type
        },
        myProgress: {
          currentPage: session.my_current_page,
          readingStatus: session.my_reading_status,
          lastActivity: session.my_last_activity
        },
        groupProgress: {
          totalParticipants: parseInt(session.total_participants),
          averageProgress: Math.round(parseFloat(session.avg_progress) || 0),
          maxProgress: parseInt(session.max_progress),
          minProgress: parseInt(session.min_progress)
        }
      }))
    });

  } catch (error) {
    console.error('❌ Get active sessions error:', error);
    res.status(500).json({ message: 'Aktif seanslar listelenirken hata oluştu' });
  }
});

// Seans detayı ve ilerleme durumu
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    // Seans bilgilerini al
    const session = await pool.query(`
      SELECT 
        srs.*,
        b.title as book_title,
        b.author as book_author,
        b.cover_image_url,
        b.page_count as book_total_pages,
        b.description as book_description,
        srg.name as group_name,
        srg.group_type,
        srg.max_members
      FROM shared_reading_sessions srs
      JOIN books b ON srs.book_id = b.id
      JOIN shared_reading_groups srg ON srs.group_id = srg.id
      JOIN shared_reading_memberships srm ON srg.id = srm.group_id
      WHERE srs.id = $1 AND srm.user_id = $2 AND srm.status = 'active'
    `, [sessionId, userId]);

    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Seans bulunamadı veya erişim yetkiniz yok' });
    }

    // Katılımcıların ilerlemelerini al
    const participants = await pool.query(`
      SELECT 
        srp.*,
        u."displayName" as user_name,
        u.username,
        srm.role as group_role
      FROM shared_reading_progress srp
      JOIN users u ON srp.user_id = u.id
      JOIN shared_reading_memberships srm ON srp.user_id = srm.user_id AND srm.group_id = $2
      WHERE srp.session_id = $1
      ORDER BY srp.current_page DESC, srp.last_activity DESC
    `, [sessionId, session.rows[0].group_id]);

    // Son mesajları al
    const recentMessages = await pool.query(`
      SELECT 
        srm.*,
        u."displayName" as sender_name,
        u.username as sender_username
      FROM shared_reading_messages srm
      JOIN users u ON srm.sender_id = u.id
      WHERE srm.session_id = $1
      ORDER BY srm."createdAt" DESC
      LIMIT 10
    `, [sessionId]);

    const sessionData = session.rows[0];

    res.json({
      message: 'Seans detayı getirildi',
      session: {
        id: sessionData.id,
        sessionType: sessionData.session_type,
        startDate: sessionData.start_date,
        targetEndDate: sessionData.target_end_date,
        actualEndDate: sessionData.actual_end_date,
        targetPages: sessionData.target_pages,
        isActive: sessionData.is_active,
        book: {
          id: sessionData.book_id,
          title: sessionData.book_title,
          author: sessionData.book_author,
          coverImageUrl: sessionData.cover_image_url,
          totalPages: sessionData.book_total_pages,
          description: sessionData.book_description
        },
        group: {
          id: sessionData.group_id,
          name: sessionData.group_name,
          type: sessionData.group_type,
          maxMembers: sessionData.max_members
        },
        participants: participants.rows.map(p => ({
          id: p.id,
          userId: p.user_id,
          displayName: p.user_name,
          username: p.username,
          groupRole: p.group_role,
          currentPage: p.current_page,
          totalPages: p.total_pages,
          readingStatus: p.reading_status,
          lastActivity: p.last_activity,
          notes: p.notes
        })),
        recentMessages: recentMessages.rows.reverse().map(m => ({
          id: m.id,
          messageType: m.message_type,
          content: m.content,
          pageNumber: m.page_number,
          isSpoiler: m.is_spoiler,
          createdAt: m.createdAt,
          sender: {
            id: m.sender_id,
            displayName: m.sender_name,
            username: m.sender_username
          }
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get session detail error:', error);
    res.status(500).json({ message: 'Seans detayı getirilirken hata oluştu' });
  }
});

// İlerleme güncelleme
router.post('/update-progress', async (req, res) => {
  try {
    const { sessionId, currentPage, readingStatus, notes } = req.body;
    const userId = req.userId;

    console.log('📊 Progress update:', { sessionId, currentPage, readingStatus, userId });

    // Seans ve yetki kontrolü
    const sessionCheck = await pool.query(`
      SELECT srs.*, srp.current_page as old_page
      FROM shared_reading_sessions srs
      JOIN shared_reading_progress srp ON srs.id = srp.session_id
      JOIN shared_reading_memberships srm ON srs.group_id = srm.group_id
      WHERE srs.id = $1 AND srp.user_id = $2 AND srm.user_id = $2 AND srm.status = 'active'
    `, [sessionId, userId]);

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Seans bulunamadı veya erişim yetkiniz yok' });
    }

    const session = sessionCheck.rows[0];
    const oldPage = session.old_page || 0;

    // İlerleme güncelle
    await pool.query(`
      UPDATE shared_reading_progress 
      SET 
        current_page = $1,
        reading_status = $2,
        notes = $3,
        last_activity = CURRENT_TIMESTAMP
      WHERE session_id = $4 AND user_id = $5
    `, [currentPage, readingStatus, notes, sessionId, userId]);

    // Eğer significan bir ilerleme varsa, grup üyelerine bildirim gönder
    const progressDiff = currentPage - oldPage;
    if (progressDiff >= 10) { // 10+ sayfa ilerleme
      const groupMembers = await pool.query(`
        SELECT DISTINCT srm.user_id, u."displayName"
        FROM shared_reading_memberships srm
        JOIN users u ON srm.user_id = u.id
        WHERE srm.group_id = $1 AND srm.status = 'active' AND srm.user_id != $2
      `, [session.group_id, userId]);

      const currentUser = await pool.query('SELECT "displayName" FROM users WHERE id = $1', [userId]);
      const currentUserName = currentUser.rows[0]?.displayName || 'Bir kullanıcı';

      for (const member of groupMembers.rows) {
        await pool.query(`
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            related_session_id
          ) VALUES ($1, 'reading_update', 'İlerleme Bildirimi', $2, $3)
        `, [
          member.user_id,
          `${currentUserName} ${currentPage}. sayfaya ulaştı! (${progressDiff} sayfa ilerledi)`,
          sessionId
        ]);
      }
    }

    // Kitap bitirildiyse özel bildirim
    if (readingStatus === 'completed') {
      await pool.query(`
        INSERT INTO shared_reading_messages (
          session_id,
          sender_id,
          message_type,
          content
        ) VALUES ($1, $2, 'achievement', $3)
      `, [sessionId, userId, 'Kitabı bitirdi! 🎉']);

      // Rozet kontrolü - kitap bitirme rozeti
      const completedBooks = await pool.query(`
        SELECT COUNT(*) as count 
        FROM shared_reading_progress srp
        JOIN shared_reading_sessions srs ON srp.session_id = srs.id
        WHERE srp.user_id = $1 AND srp.reading_status = 'completed'
      `, [userId]);

      if (completedBooks.rows[0].count === 1) {
        // İlk kitap rozeti
        const firstBookBadge = await pool.query(`
          SELECT id FROM badges WHERE name = 'first_shared_book'
        `);
        
        if (firstBookBadge.rows.length > 0) {
          await pool.query(`
            INSERT INTO user_badges (user_id, badge_id, context) 
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, badge_id) DO NOTHING
          `, [userId, firstBookBadge.rows[0].id, JSON.stringify({ sessionId })]);
        }
      }
    }

    console.log('✅ Progress updated successfully');

    res.json({
      message: 'İlerleme güncellendi',
      currentPage,
      readingStatus,
      progressDiff
    });

  } catch (error) {
    console.error('❌ Update progress error:', error);
    res.status(500).json({ message: 'İlerleme güncellenirken hata oluştu' });
  }
});

// Seansa mesaj gönderme
router.post('/send-message', async (req, res) => {
  try {
    const { sessionId, messageType, content, pageNumber, isSpoiler } = req.body;
    const userId = req.userId;

    console.log('💬 Sending message:', { sessionId, messageType, content });

    // Seans kontrolü
    const sessionCheck = await pool.query(`
      SELECT srs.id
      FROM shared_reading_sessions srs
      JOIN shared_reading_memberships srm ON srs.group_id = srm.group_id
      WHERE srs.id = $1 AND srm.user_id = $2 AND srm.status = 'active'
    `, [sessionId, userId]);

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Seans bulunamadı veya erişim yetkiniz yok' });
    }

    // Mesaj gönder
    const newMessage = await pool.query(`
      INSERT INTO shared_reading_messages (
        session_id,
        sender_id,
        message_type,
        content,
        page_number,
        is_spoiler
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, "createdAt"
    `, [sessionId, userId, messageType, content, pageNumber, isSpoiler]);

    // Grup üyelerine bildirim gönder (mesaj gönderen hariç)
    const groupMembers = await pool.query(`
      SELECT DISTINCT srm.user_id
      FROM shared_reading_sessions srs
      JOIN shared_reading_memberships srm ON srs.group_id = srm.group_id
      WHERE srs.id = $1 AND srm.status = 'active' AND srm.user_id != $2
    `, [sessionId, userId]);

    const currentUser = await pool.query('SELECT "displayName" FROM users WHERE id = $1', [userId]);
    const currentUserName = currentUser.rows[0]?.displayName || 'Bir kullanıcı';

    for (const member of groupMembers.rows) {
      await pool.query(`
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_session_id
        ) VALUES ($1, 'message', 'Yeni Mesaj', $2, $3)
      `, [
        member.user_id,
        `${currentUserName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        sessionId
      ]);
    }

    res.status(201).json({
      message: 'Mesaj gönderildi',
      messageId: newMessage.rows[0].id
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ message: 'Mesaj gönderilirken hata oluştu' });
  }
});

// Seans mesajlarını listeleme
router.get('/session/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    // Seans kontrolü
    const sessionCheck = await pool.query(`
      SELECT srs.id
      FROM shared_reading_sessions srs
      JOIN shared_reading_memberships srm ON srs.group_id = srm.group_id
      WHERE srs.id = $1 AND srm.user_id = $2 AND srm.status = 'active'
    `, [sessionId, userId]);

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Seans bulunamadı veya erişim yetkiniz yok' });
    }

    const offset = (page - 1) * limit;

    const messages = await pool.query(`
      SELECT 
        srm.*,
        u."displayName" as sender_name,
        u.username as sender_username
      FROM shared_reading_messages srm
      JOIN users u ON srm.sender_id = u.id
      WHERE srm.session_id = $1
      ORDER BY srm."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, [sessionId, limit, offset]);

    res.json({
      message: 'Mesajlar listelendi',
      messages: messages.rows.reverse().map(m => ({
        id: m.id,
        messageType: m.message_type,
        content: m.content,
        pageNumber: m.page_number,
        isSpoiler: m.is_spoiler,
        createdAt: m.createdAt,
        sender: {
          id: m.sender_id,
          displayName: m.sender_name,
          username: m.sender_username
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ message: 'Mesajlar listelenirken hata oluştu' });
  }
});

// 📖 Sessions endpoint'i (frontend'in beklediği format)
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('📖 Getting sessions for user:', userId);
    
    // Şimdilik boş array döndür, ileride session sistemi ekleyebiliriz
    const sessions = [];
    
    console.log('✅ Sessions retrieved successfully');
    
    res.json(sessions);

  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({ 
      message: 'Oturum listesi getirilirken hata oluştu'
    });
  }
});

module.exports = { router, initializePool }; 