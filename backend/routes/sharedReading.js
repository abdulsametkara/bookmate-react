const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database connection - backend/app.js'den import edilecek
let pool;

const initializePool = (dbPool) => {
  pool = dbPool;
};

// Middleware to get database pool from app
router.use((req, res, next) => {
  pool = req.app.get('db');
  next();
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token gerekli' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = 'bookmate_secret_key_2025';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { 
      id: decoded.id, 
      email: decoded.email 
    };
    req.userId = decoded.userId || decoded.id; // Backward compatibility için
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

// 🔍 Kullanıcı arama
router.get('/search-users', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    console.log(`🔍 Searching users with query: ${query}`);
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'En az 2 karakter girmelisiniz' });
    }
    
    const searchQuery = `
      SELECT 
        u.id,
        u.email,
        u."displayName" as name,
        CASE 
          WHEN ur.id IS NOT NULL THEN ur.status
          ELSE null
        END as relationship_status
      FROM users u
      LEFT JOIN user_relationships ur ON (
        (ur.requester_id = $1 AND ur.addressee_id = u.id) OR
        (ur.addressee_id = $1 AND ur.requester_id = u.id)
      )
      WHERE u.id != $1 
        AND (
          u."displayName" ILIKE $2 OR 
          u.email ILIKE $2
        )
      ORDER BY u."displayName"
      LIMIT 20
    `;
    
    const result = await pool.query(searchQuery, [req.userId, `%${query}%`]);
    
    const users = result.rows.map(user => ({
      id: user.id,
      displayName: user.name || user.email.split('@')[0],
      username: user.name,
      email: user.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=2196F3&color=fff`,
      relationshipStatus: user.relationship_status,
      canSendRequest: !user.relationship_status
    }));
    
    console.log(`✅ Found ${users.length} users for query: ${query}`);
    res.json(users);
    
  } catch (error) {
    console.error('❌ User search error:', error);
    res.status(500).json({ 
      message: 'Kullanıcı arama sırasında hata oluştu',
      error: error.message 
    });
  }
});

// 👥 Arkadaşlar listesi
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Getting friends for user: ${req.userId}`);
    
    const friendsQuery = `
      SELECT 
        u.id,
        u.email,
        u."displayName" as name,
        u."createdAt" as friendship_date,
        ur.status,
        rt.name as relationship_type,
        rt.icon as relationship_icon
      FROM user_relationships ur
      JOIN users u ON (
        CASE 
          WHEN ur.requester_id = $1 THEN u.id = ur.addressee_id
          ELSE u.id = ur.requester_id
        END
      )
      LEFT JOIN relationship_types rt ON ur.relationship_type_id = rt.id
      WHERE (ur.requester_id = $1 OR ur.addressee_id = $1)
        AND ur.status = 'accepted'
      ORDER BY ur."createdAt" DESC
    `;
    
    const result = await pool.query(friendsQuery, [req.userId]);
    
    const friends = result.rows.map(friend => ({
      id: friend.id,
      displayName: friend.name || friend.email.split('@')[0],
      email: friend.email,
      createdAt: friend.friendship_date,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || friend.email)}&background=4CAF50&color=fff`,
      relationshipType: friend.relationship_type || 'okuma_arkadasi',
      relationshipIcon: friend.relationship_icon || '📚',
      friendshipDate: friend.friendship_date,
      status: 'online'
    }));
    
    console.log(`✅ Found ${friends.length} friends for user ${req.userId}`);
    res.json(friends);
    
  } catch (error) {
    console.error('❌ Friends fetch error:', error);
    res.status(500).json({ 
      message: 'Arkadaşlar yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📨 Gelen arkadaşlık istekleri
router.get('/friend-requests/incoming', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Getting friend requests for user: ${req.userId}`);
    
    // Check if user_relationships table has the required column
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_relationships' 
      AND column_name = 'relationship_type_id'
    `);

    let result;

    if (columnCheck.rows.length > 0) {
      const requestsQuery = `
        SELECT 
          ur.id as request_id,
          u.id as user_id,
          u.email,
          u."displayName" as name,
          ur.request_message,
          ur."createdAt" as request_date,
          rt.name as relationship_type,
          rt.icon as relationship_icon
        FROM user_relationships ur
        JOIN users u ON ur.requester_id = u.id
        LEFT JOIN relationship_types rt ON ur.relationship_type_id = rt.id
        WHERE ur.addressee_id = $1 
          AND ur.status = 'pending'
        ORDER BY ur."createdAt" DESC
      `;
      result = await pool.query(requestsQuery, [req.userId]);
    } else {
      result = { rows: [] };
    }
    
    const requests = result.rows.map(request => ({
      id: request.request_id,
      sender_id: request.user_id,
      receiver_id: req.userId,
      relationship_type: request.relationship_type || 'okuma_arkadasi',
      message: request.request_message || 'Arkadaş olmak istiyor',
      status: 'pending',
      created_at: request.request_date,
      sender: {
        id: request.user_id,
        displayName: request.name || request.email.split('@')[0],
        username: request.name,
        email: request.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name || request.email)}&background=FF9800&color=fff`
      }
    }));
    
    console.log(`✅ Found ${requests.length} friend requests for user ${req.userId}`);
    res.json(requests);
    
  } catch (error) {
    console.error('❌ Friend requests fetch error:', error);
    res.status(500).json({ 
      message: 'Arkadaşlık istekleri yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📤 Giden arkadaşlık istekleri
router.get('/friend-requests/outgoing', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Getting outgoing friend requests for user: ${req.userId}`);
    
    // Check if user_relationships table has the required column
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_relationships' 
      AND column_name = 'relationship_type_id'
    `);

    let result;

    if (columnCheck.rows.length > 0) {
      const requestsQuery = `
        SELECT 
          ur.id as request_id,
          u.id as user_id,
          u.email,
          u."displayName" as name,
          ur.request_message,
          ur."createdAt" as request_date,
          ur.status,
          rt.name as relationship_type,
          rt.icon as relationship_icon
        FROM user_relationships ur
        JOIN users u ON ur.addressee_id = u.id
        LEFT JOIN relationship_types rt ON ur.relationship_type_id = rt.id
        WHERE ur.requester_id = $1 
          AND ur.status IN ('pending', 'accepted', 'rejected')
        ORDER BY ur."createdAt" DESC
      `;
      result = await pool.query(requestsQuery, [req.userId]);
    } else {
      result = { rows: [] };
    }
    
    const requests = result.rows.map(request => ({
      id: request.request_id,
      sender_id: req.userId,
      receiver_id: request.user_id,
      relationship_type: request.relationship_type || 'okuma_arkadasi',
      message: request.request_message || 'Arkadaş olmak istiyor',
      status: request.status,
      created_at: request.request_date,
      receiver: {
        id: request.user_id,
        displayName: request.name || request.email.split('@')[0],
        username: request.name,
        email: request.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name || request.email)}&background=2196F3&color=fff`
      }
    }));
    
    console.log(`✅ Found ${requests.length} outgoing friend requests for user ${req.userId}`);
    res.json(requests);
    
  } catch (error) {
    console.error('❌ Outgoing friend requests fetch error:', error);
    res.status(500).json({ 
      message: 'Giden arkadaşlık istekleri yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 🏆 Rozetler
router.get('/badges', authenticateToken, async (req, res) => {
  try {
    console.log(`🏆 Getting badges for user: ${req.userId}`);
    
    // Kullanıcının istatistiklerini al
    const friendsCount = await pool.query(`
      SELECT COUNT(*) as count FROM user_relationships 
      WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
    `, [req.userId]);
    
    const sessionsCount = await pool.query(`
      SELECT COUNT(*) as count FROM shared_reading_sessions srs
      WHERE srs.initiator_id = $1 OR $1 = ANY(srs.partner_ids)
    `, [req.userId]);
    
    const badges = [];
    const friends = parseInt(friendsCount.rows[0].count);
    const sessions = parseInt(sessionsCount.rows[0].count);
    
    // Arkadaşlık rozetleri
    if (friends >= 1) badges.push({ id: 'first_friend', name: 'İlk Arkadaş', icon: '👥', description: 'İlk arkadaşını ekledin!' });
    if (friends >= 5) badges.push({ id: 'social_reader', name: 'Sosyal Okuyucu', icon: '🌟', description: '5 arkadaşın var!' });
    if (friends >= 10) badges.push({ id: 'book_influencer', name: 'Kitap Influencer', icon: '📚', description: '10 arkadaşın var!' });
    
    // Oturum rozetleri
    if (sessions >= 1) badges.push({ id: 'first_session', name: 'İlk Oturum', icon: '🎯', description: 'İlk ortak okuma oturumunu tamamladın!' });
    if (sessions >= 5) badges.push({ id: 'session_master', name: 'Oturum Ustası', icon: '🏆', description: '5 oturum tamamladın!' });
    
    console.log(`✅ Found ${badges.length} badges for user ${req.userId}`);
    res.json(badges);
    
  } catch (error) {
    console.error('❌ Badges fetch error:', error);
    res.status(500).json({ 
      message: 'Rozetler yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📤 Arkadaşlık isteği gönder
router.post('/send-friend-request', authenticateToken, async (req, res) => {
  try {
    const { receiverId, message, relationshipType } = req.body;
    console.log(`📤 Sending friend request from ${req.userId} to ${receiverId}`);
    
    if (!receiverId) {
      return res.status(400).json({ message: 'Kullanıcı ID gerekli' });
    }
    
    if (receiverId === req.userId) {
      return res.status(400).json({ message: 'Kendinize arkadaşlık isteği gönderemezsiniz' });
    }
    
    // Hedef kullanıcının var olup olmadığını kontrol et
    const targetUser = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Mevcut ilişki var mı kontrol et
    const existingRelation = await pool.query(`
      SELECT * FROM user_relationships 
      WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
    `, [req.userId, receiverId]);
    
    if (existingRelation.rows.length > 0) {
      const status = existingRelation.rows[0].status;
      const statusMessages = {
        pending: 'Zaten bekleyen bir arkadaşlık isteği var',
        accepted: 'Bu kullanıcı zaten arkadaşınız',
        rejected: 'Bu kullanıcıya daha önce istek gönderilmiş',
        blocked: 'Bu kullanıcıyla iletişim kurulamıyor'
      };
      return res.status(400).json({ message: statusMessages[status] || 'İlişki zaten mevcut' });
    }
    
    // İlişki türünü bul veya default kullan
    let relationshipTypeId = null; // NULL olarak başlat
    
    try {
      // Önce relationship_types tablosunun var olup olmadığını kontrol et
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'relationship_types'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        // Tablo varsa, default type'ı kontrol et veya oluştur
        let defaultType = await pool.query('SELECT id FROM relationship_types WHERE name = $1', ['okuma_arkadasi']);
        
        if (defaultType.rows.length === 0) {
          // Default type yoksa oluştur
          const createResult = await pool.query(`
            INSERT INTO relationship_types (name, icon, description) 
            VALUES ('okuma_arkadasi', '📚', 'Okuma Arkadaşı')
            RETURNING id
          `);
          relationshipTypeId = createResult.rows[0].id;
        } else {
          relationshipTypeId = defaultType.rows[0].id;
        }
        
        // Eğer özel bir relationshipType belirtilmişse onu kullan
        if (relationshipType) {
          const rtResult = await pool.query('SELECT id FROM relationship_types WHERE name = $1', [relationshipType]);
          if (rtResult.rows.length > 0) {
            relationshipTypeId = rtResult.rows[0].id;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ relationship_types tablosu bulunamadı, NULL kullanılacak');
      relationshipTypeId = null;
    }
    
    // Arkadaşlık isteği oluştur
    const insertResult = await pool.query(`
      INSERT INTO user_relationships (requester_id, addressee_id, relationship_type_id, status, request_message)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *
    `, [req.userId, receiverId, relationshipTypeId, message || 'Arkadaş olmak ister misin?']);
    
    // Bildirim oluştur
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, related_user_id)
      VALUES ($1, 'friend_request', 'Yeni Arkadaşlık İsteği', 'Yeni bir arkadaşlık isteği aldınız!', $2)
    `, [receiverId, req.userId]);
    
    console.log(`✅ Friend request sent successfully from ${req.userId} to ${receiverId}`);
    res.json({ 
      message: 'Arkadaşlık isteği gönderildi',
      success: true,
      requestId: insertResult.rows[0].id
    });
    
  } catch (error) {
    console.error('❌ Send friend request error:', error);
    res.status(500).json({ 
      message: 'Arkadaşlık isteği gönderilirken hata oluştu',
      error: error.message 
    });
  }
});

// ✅ Arkadaşlık isteğini kabul et
router.post('/friend-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`✅ Accepting friend request: ${requestId} by user: ${req.userId}`);
    
    // İsteği kabul et
    const updateResult = await pool.query(`
      UPDATE user_relationships 
      SET status = 'accepted', responded_at = NOW()
      WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
      RETURNING *
    `, [requestId, req.userId]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı' });
    }
    
    // Bildirim oluştur
    const request = updateResult.rows[0];
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, related_user_id)
      VALUES ($1, 'message', 'Arkadaşlık İsteği Kabul Edildi', 'Arkadaşlık isteğin kabul edildi!', $2)
    `, [request.requester_id, req.userId]);
    
    console.log(`✅ Friend request ${requestId} accepted successfully`);
    res.json({ 
      message: 'Arkadaşlık isteği kabul edildi',
      success: true 
    });
    
  } catch (error) {
    console.error('❌ Accept friend request error:', error);
    res.status(500).json({ 
      message: 'Arkadaşlık isteği kabul edilirken hata oluştu',
      error: error.message 
    });
  }
});

// ❌ Arkadaşlık isteğini reddet
router.post('/friend-requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`❌ Rejecting friend request: ${requestId} by user: ${req.userId}`);
    
    const updateResult = await pool.query(`
      UPDATE user_relationships 
      SET status = 'rejected', responded_at = NOW()
      WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
      RETURNING *
    `, [requestId, req.userId]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı' });
    }
    
    console.log(`✅ Friend request ${requestId} rejected successfully`);
    res.json({ 
      message: 'Arkadaşlık isteği reddedildi',
      success: true 
    });
    
  } catch (error) {
    console.error('❌ Reject friend request error:', error);
    res.status(500).json({ 
      message: 'Arkadaşlık isteği reddedilirken hata oluştu',
      error: error.message 
    });
  }
});

// 👤 Arkadaş profili
router.get('/friends/:friendId/profile', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    console.log(`👤 Getting friend profile: ${friendId} for user: ${req.userId}`);
    
    // Arkadaşlık ilişkisini kontrol et
    const relationshipCheck = await pool.query(`
      SELECT * FROM user_relationships 
      WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
        AND status = 'accepted'
    `, [req.userId, friendId]);
    
    if (relationshipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bu kullanıcının profilini görme yetkiniz yok' });
    }
    
    // Arkadaş bilgilerini al
    const friendQuery = `
      SELECT 
        u.id,
        u.email,
        u."displayName" as name,
        u."createdAt" as join_date
      FROM users u
      WHERE u.id = $1
    `;
    
    const friendResult = await pool.query(friendQuery, [friendId]);
    
    if (friendResult.rows.length === 0) {
      return res.status(404).json({ message: 'Arkadaş bulunamadı' });
    }
    
    const friend = friendResult.rows[0];
    
    // Gerçek istatistikleri al
    const statisticsQuery = `
      SELECT 
        COUNT(CASE WHEN ub.status = 'completed' THEN 1 END) as completed_books,
        COUNT(CASE WHEN ub.status IN ('reading', 'paused') THEN 1 END) as current_books,
        COALESCE(SUM(CASE WHEN ub.status = 'completed' THEN b."pageCount" END), 0) as total_pages_read,
        0 as total_reading_time
      FROM user_books ub
      LEFT JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1
    `;
    
    const statsResult = await pool.query(statisticsQuery, [friendId]);
    const stats = statsResult.rows[0];
    
    const statistics = {
      total_books: parseInt(stats.completed_books) + parseInt(stats.current_books),
      completed_books: parseInt(stats.completed_books),
      total_reading_time: parseInt(stats.total_reading_time) || 0,
      total_pages_read: parseInt(stats.total_pages_read) || 0
    };
    
    // Şu anda okuduğu kitapları al
    const currentReadingQuery = `
      SELECT 
        ub.id as user_book_id,
        b.title,
        b.author,
        ub.current_page,
        b."pageCount" as total_pages,
        ub.start_date,
        0 as total_reading_time
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1 AND ub.status IN ('reading', 'paused')
      ORDER BY ub.start_date DESC
      LIMIT 5
    `;
    
    const currentResult = await pool.query(currentReadingQuery, [friendId]);
    const currentReading = currentResult.rows.map(book => ({
      user_book_id: book.user_book_id,
      title: book.title,
      author: book.author,
      current_page: book.current_page || 0,
      total_pages: book.total_pages || 0,
      start_date: book.start_date,
      total_reading_time: book.total_reading_time || 0
    }));
    
    // Son tamamlanan kitapları al
    const recentBooksQuery = `
      SELECT 
        b.title,
        b.author,
        b."pageCount" as total_pages,
        ub.finish_date as end_date,
        0 as total_reading_time
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1 AND ub.status = 'completed'
      ORDER BY ub.finish_date DESC
      LIMIT 5
    `;
    
    const recentResult = await pool.query(recentBooksQuery, [friendId]);
    const recentBooks = recentResult.rows.map(book => ({
      title: book.title,
      author: book.author,
      total_pages: book.total_pages || 0,
      end_date: book.end_date,
      total_reading_time: book.total_reading_time || 0
    }));
    
    const profile = {
      friend: {
        id: friend.id,
        displayName: friend.name || friend.email.split('@')[0],
        username: friend.name,
        email: friend.email,
        joinDate: friend.join_date,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || friend.email)}&background=2196F3&color=fff`
      },
      statistics,
      currentReading,
      recentBooks
    };
    
    console.log(`✅ Friend profile loaded for ${friendId}`);
    res.json(profile);
    
  } catch (error) {
    console.error('❌ Friend profile fetch error:', error);
    res.status(500).json({ 
      message: 'Arkadaş profili yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📚 Ortak kütüphaneler listesi
router.get('/shared-libraries', authenticateToken, async (req, res) => {
  try {
    console.log(`📚 Getting shared libraries for user: ${req.userId}`);
    
    // Kullanıcının üye olduğu kütüphaneleri getir
    const librariesQuery = `
      SELECT 
        sl.id,
        sl.name,
        sl.description,
        sl.created_at as "createdAt",
        creator."displayName" as "creatorName",
        (sl.creator_id = $1) as "isOwner",
        COUNT(DISTINCT slm.user_id) as member_count,
        COUNT(DISTINCT slb.book_id) as book_count
      FROM shared_libraries sl
      JOIN shared_library_members slm ON sl.id = slm.library_id
      JOIN users creator ON sl.creator_id = creator.id
      LEFT JOIN shared_library_books slb ON sl.id = slb.library_id
      WHERE slm.user_id = $1
      GROUP BY sl.id, sl.name, sl.description, sl.created_at, creator."displayName", sl.creator_id
      ORDER BY sl.created_at DESC
    `;
    
    const result = await pool.query(librariesQuery, [req.userId]);
    
    const libraries = await Promise.all(result.rows.map(async (library) => {
      // Her kütüphane için üyeleri getir
      const membersQuery = `
        SELECT 
          u.id,
          u."displayName" as "displayName",
          slm.role
        FROM shared_library_members slm
        JOIN users u ON slm.user_id = u.id
        WHERE slm.library_id = $1
        ORDER BY slm.role DESC, slm.joined_at ASC
      `;
      
      const membersResult = await pool.query(membersQuery, [library.id]);
      
      // Son eklenen kitapları getir
      const recentBooksQuery = `
        SELECT 
          coalesce(b.title, 'Bilinmeyen Kitap') as title,
          coalesce(b.author, 'Bilinmeyen Yazar') as author,
          coalesce(adder."displayName", 'Bilinmeyen Kullanıcı') as "addedBy"
        FROM shared_library_books slb
        LEFT JOIN books b ON slb.book_id = b.id
        LEFT JOIN users adder ON slb.added_by_user_id = adder.id
        WHERE slb.library_id = $1
        ORDER BY slb.added_at DESC
        LIMIT 3
      `;
      
      const booksResult = await pool.query(recentBooksQuery, [library.id]);
      
      return {
        id: library.id,
        name: library.name,
        description: library.description,
        bookCount: parseInt(library.book_count) || 0,
        memberCount: parseInt(library.member_count) || 0,
        isOwner: library.isOwner,
        createdAt: library.createdAt,
        creatorName: library.creatorName,
        members: membersResult.rows,
        recentBooks: booksResult.rows
      };
    }));
    
    console.log(`✅ Found ${libraries.length} private libraries for user ${req.userId}`);
    res.json(libraries);
    
  } catch (error) {
    console.error('❌ Shared libraries fetch error:', error);
    res.status(500).json({ 
      message: 'Özel kütüphaneler yüklenirken hata oluştu',
      error: error.message 
    });
  }
});

// 📚 Ortak kütüphane detayları
router.get('/shared-libraries/:id', authenticateToken, async (req, res) => {
  try {
    const libraryId = req.params.id;
    const userId = req.user.id;

    // Kütüphane bilgilerini getir
    const libraryQuery = `
      SELECT 
        sl.id,
        sl.name,
        sl.description,
        sl.creator_id,
        sl.created_at,
        CASE 
          WHEN sl.creator_id = $2 THEN 'owner'
          ELSE 'member'
        END as user_role
      FROM shared_libraries sl
      JOIN shared_library_members slm ON sl.id = slm.library_id
      WHERE sl.id = $1 AND slm.user_id = $2
    `;

    const libraryResult = await pool.query(libraryQuery, [libraryId, userId]);
    
    if (libraryResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Kütüphane bulunamadı veya erişim yetkiniz yok',
        message: 'Kütüphane detayları yüklenirken hata oluştu' 
      });
    }

    const library = libraryResult.rows[0];

    // Kütüphane üyelerini getir
    const membersQuery = `
      SELECT 
        u.id,
        COALESCE(u."displayName", 'Bilinmeyen Kullanıcı') as display_name,
        slm.role,
        slm.joined_at
      FROM shared_library_members slm
      LEFT JOIN users u ON slm.user_id = u.id
      WHERE slm.library_id = $1
      ORDER BY slm.joined_at ASC
    `;

    const membersResult = await pool.query(membersQuery, [libraryId]);

    // Kütüphanedeki kitapları getir
    const booksQuery = `
      SELECT 
        b.id,
        COALESCE(b.title, 'Bilinmeyen Kitap') as title,
        COALESCE(b.author, 'Bilinmeyen Yazar') as author,
        b.isbn,
        b.cover_image_url as cover_image,
        b."pageCount" as page_count,
        slb.notes,
        slb.added_at,
        COALESCE(adder."displayName", 'Bilinmeyen Kullanıcı') as added_by_name,
        0 as note_count
      FROM shared_library_books slb
      LEFT JOIN books b ON slb.book_id = b.id
      LEFT JOIN users adder ON slb.added_by_user_id = adder.id
      WHERE slb.library_id = $1
      ORDER BY slb.added_at DESC
    `;

    const booksResult = await pool.query(booksQuery, [libraryId]);

    res.json({
      library,
      members: membersResult.rows,
      books: booksResult.rows
    });

  } catch (error) {
    console.error('Get shared library details error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Kütüphane detayları yüklenirken hata oluştu' 
    });
  }
});

// 📚 Yeni ortak kütüphane oluştur
router.post('/shared-library', authenticateToken, async (req, res) => {
  try {
    const { name, description, friendIds } = req.body;
    console.log(`📚 Creating private library for user: ${req.userId}`, { name, friendIds });
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kütüphane adı gereklidir' });
    }
    
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ message: 'En az bir arkadaş seçmelisiniz' });
    }
    
    // Transaction başlat
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Kütüphane oluştur
      const libraryResult = await client.query(
        'INSERT INTO shared_libraries (name, description, creator_id) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), description?.trim() || null, req.userId]
      );
      
      const newLibrary = libraryResult.rows[0];
      
      // 2. Creator'ı owner olarak ekle
      await client.query(
        'INSERT INTO shared_library_members (library_id, user_id, role) VALUES ($1, $2, $3)',
        [newLibrary.id, req.userId, 'owner']
      );
      
      // 3. Seçilen arkadaşları member olarak ekle
      for (const friendId of friendIds) {
        await client.query(
          'INSERT INTO shared_library_members (library_id, user_id, role) VALUES ($1, $2, $3)',
          [newLibrary.id, friendId, 'member']
        );
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Private library created:`, newLibrary.id);
      res.status(201).json({ 
        message: 'Özel kütüphaneniz başarıyla oluşturuldu!',
        library: {
          id: newLibrary.id,
          name: newLibrary.name,
          description: newLibrary.description,
          creator_id: newLibrary.creator_id,
          member_count: friendIds.length + 1, // +1 for creator
          created_at: newLibrary.created_at
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Create shared library error:', error);
    res.status(500).json({ 
      message: 'Özel kütüphane oluşturulurken hata oluştu',
      error: error.message 
    });
  }
});

// Kütüphaneye kitap ekle
router.post('/shared-libraries/:id/books', authenticateToken, async (req, res) => {
  try {
    const libraryId = req.params.id;
    const userId = req.user.id;
    const { bookId, notes } = req.body;

    console.log('Request body:', { bookId, notes });

    if (!bookId) {
      return res.status(400).json({ 
        success: false,
        message: 'Kitap ID gereklidir' 
      });
    }

    // İlk önce bookId'nin gerçek book ID'si mi yoksa user book ID'si mi olduğunu kontrol et
    let actualBookId = bookId;
    
    // Eğer books tablosunda doğrudan bulunamazsa, user_books tablosundan book_id'yi al
    const directBookCheck = await pool.query('SELECT id FROM books WHERE id = $1', [bookId]);
    
    if (directBookCheck.rows.length === 0) {
      // books tablosında bulunamadı, user_books tablosından gerçek book_id'yi al
      const userBookQuery = `
        SELECT book_id FROM user_books 
        WHERE id = $1 AND user_id = $2
      `;
      const userBookResult = await pool.query(userBookQuery, [bookId, userId]);
      
      if (userBookResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Kitap bulunamadı veya size ait değil' 
        });
      }
      
      actualBookId = userBookResult.rows[0].book_id;
      console.log(`🔄 Converted user book ID ${bookId} to actual book ID ${actualBookId}`);
    }

    // Kullanıcının bu kütüphaneye erişimi var mı kontrol et
    const accessQuery = `
      SELECT 1 FROM shared_library_members 
      WHERE library_id = $1 AND user_id = $2
    `;
    const accessResult = await pool.query(accessQuery, [libraryId, userId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Bu kütüphaneye erişim yetkiniz yok' 
      });
    }

    // Kitap zaten eklendi mi kontrol et (gerçek book_id ile)
    const existsQuery = `
      SELECT 1 FROM shared_library_books 
      WHERE library_id = $1 AND book_id = $2
    `;
    const existsResult = await pool.query(existsQuery, [libraryId, actualBookId]);
    
    if (existsResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Bu kitap zaten kütüphanede mevcut' 
      });
    }

    // Kitabı kütüphaneye ekle (gerçek book_id ile)
    const insertQuery = `
      INSERT INTO shared_library_books (library_id, book_id, added_by_user_id, notes, added_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    
    await pool.query(insertQuery, [libraryId, actualBookId, userId, notes || null]);

    console.log(`✅ Book ${actualBookId} added to library ${libraryId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Kitap başarıyla kütüphaneye eklendi'
    });

  } catch (error) {
    console.error('Add book to library error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Kitap eklenirken hata oluştu: ' + error.message 
    });
  }
});

// 🗑️ Ortak kütüphane sil
router.delete('/shared-libraries/:id', authenticateToken, async (req, res) => {
  try {
    const libraryId = req.params.id;
    const userId = req.user.id;

    console.log(`🗑️ Delete library request: ${libraryId} by user: ${userId}`);

    // Kullanıcının bu kütüphanenin sahibi olup olmadığını kontrol et
    const ownerQuery = `
      SELECT sl.*, slm.role 
      FROM shared_libraries sl
      JOIN shared_library_members slm ON sl.id = slm.library_id
      WHERE sl.id = $1 AND slm.user_id = $2 AND slm.role = 'owner'
    `;
    const ownerResult = await pool.query(ownerQuery, [libraryId, userId]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false,
        message: 'Bu kütüphaneyi silme yetkiniz yok. Sadece kütüphane sahibi silebilir.' 
      });
    }

    const library = ownerResult.rows[0];

    // Transaction başlat - kütüphaneyi tamamen sil
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Kütüphanedeki kitapları sil
      await client.query(
        'DELETE FROM shared_library_books WHERE library_id = $1',
        [libraryId]
      );
      
      // 2. Kütüphane üyelerini sil
      await client.query(
        'DELETE FROM shared_library_members WHERE library_id = $1',
        [libraryId]
      );
      
      // 3. Kütüphaneyi sil
      await client.query(
        'DELETE FROM shared_libraries WHERE id = $1',
        [libraryId]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Library deleted successfully: ${library.name} (ID: ${libraryId})`);
      
      res.json({
        success: true,
        message: `"${library.name}" kütüphanesi başarıyla silindi`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Delete library error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Kütüphane silinirken hata oluştu: ' + error.message 
    });
  }
});

module.exports = router;