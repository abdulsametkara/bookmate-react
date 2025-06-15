-- Shared Reading System Database Schema
-- Created for BookMate App

-- İlişki türleri tablosu
CREATE TABLE IF NOT EXISTS relationship_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color_code VARCHAR(7),
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Kullanıcı ilişkileri tablosu (arkadaşlık sistemi)
CREATE TABLE IF NOT EXISTS user_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type_id UUID REFERENCES relationship_types(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    request_message TEXT,
    responded_at TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    
    -- Aynı iki kullanıcı arasında birden fazla ilişki engelle
    UNIQUE(requester_id, addressee_id)
);

-- Ortak okuma grupları
CREATE TABLE IF NOT EXISTS shared_reading_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    group_type VARCHAR(20) DEFAULT 'pair' CHECK (group_type IN ('pair', 'small_group', 'book_club')),
    max_members INTEGER DEFAULT 2,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Grup üyelikleri
CREATE TABLE IF NOT EXISTS shared_reading_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    
    -- Aynı kullanıcı aynı grupta birden fazla kez olamaz
    UNIQUE(group_id, user_id)
);

-- Ortak okuma oturumları
CREATE TABLE IF NOT EXISTS shared_reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reading_mode VARCHAR(20) DEFAULT 'same_book' CHECK (reading_mode IN ('same_book', 'different_books', 'book_club')),
    book_id UUID REFERENCES books(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Oturum katılımcıları ve ilerlemeleri
CREATE TABLE IF NOT EXISTS session_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_read_at TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(session_id, user_id, book_id)
);

-- Ortak okuma mesajları
CREATE TABLE IF NOT EXISTS shared_reading_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'progress', 'system', 'media')),
    content TEXT NOT NULL,
    metadata JSONB, -- Ekstra bilgiler için (sayfa numarası, kitap bilgisi vs.)
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Bildirimler
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Ekstra bilgiler
    read_at TIMESTAMP,
    related_user_id UUID REFERENCES users(id),
    related_session_id UUID REFERENCES shared_reading_sessions(id),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Ortak kütüphaneler
CREATE TABLE IF NOT EXISTS shared_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Ortak kütüphane üyeleri
CREATE TABLE IF NOT EXISTS shared_library_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES shared_libraries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(library_id, user_id)
);

-- Ortak kütüphane kitapları
CREATE TABLE IF NOT EXISTS shared_library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES shared_libraries(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    added_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(library_id, book_id)
);

-- Ortak kütüphane notları
CREATE TABLE IF NOT EXISTS shared_library_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES shared_libraries(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'quote', 'thought', 'question')),
    is_spoiler BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Varsayılan ilişki türlerini ekle
INSERT INTO relationship_types (name, icon, color_code, description) VALUES
('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
ON CONFLICT (name) DO NOTHING;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_user_relationships_requester ON user_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_addressee ON user_relationships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_status ON user_relationships(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_progress_session ON session_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_reading_messages_session ON shared_reading_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_library_books_library ON shared_library_books(library_id); 