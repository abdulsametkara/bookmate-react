-- BookMate Ortak Okuma Sistemi - Veritabanı Şeması
-- Bu dosya ortak okuma özelliği için gerekli tabloları içerir

-- 1. Partner/İlişki türleri tablosu
CREATE TABLE IF NOT EXISTS relationship_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10),
    color_code VARCHAR(7),
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İlişki türlerini ekle
INSERT INTO relationship_types (name, icon, color_code, description) VALUES
('sevgili', '💕', '#FF69B4', 'Sevgili/Eş - Özel özellikler'),
('en_yakin_arkadas', '👫', '#4169E1', 'En Yakın Arkadaş - Yakın takip'),
('okuma_arkadasi', '📚', '#32CD32', 'Okuma Arkadaşı - Kitap odaklı'),
('aile_uyesi', '👨‍👩‍👧‍👦', '#FF6347', 'Aile Üyesi - Aile okuma deneyimi'),
('okul_arkadasi', '🎓', '#9370DB', 'Okul/Üniversite Arkadaşı - Eğitim odaklı')
ON CONFLICT (name) DO NOTHING;

-- 2. Kullanıcılar arası arkadaşlık/partner ilişkileri
CREATE TABLE IF NOT EXISTS user_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type_id UUID NOT NULL REFERENCES relationship_types(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    request_message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- 3. Ortak okuma grupları
CREATE TABLE IF NOT EXISTS shared_reading_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    group_type VARCHAR(20) DEFAULT 'pair' CHECK (group_type IN ('pair', 'club')),
    max_members INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Grup üyelikleri
CREATE TABLE IF NOT EXISTS shared_reading_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

-- 5. Ortak okuma seansları
CREATE TABLE IF NOT EXISTS shared_reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    session_type VARCHAR(20) DEFAULT 'same_book' CHECK (session_type IN ('same_book', 'different_books', 'book_club')),
    start_date DATE NOT NULL,
    target_end_date DATE,
    actual_end_date DATE,
    target_pages INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Kullanıcıların ortak okuma seanslarındaki ilerlemeleri
CREATE TABLE IF NOT EXISTS shared_reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    reading_status VARCHAR(20) DEFAULT 'not_started' CHECK (reading_status IN ('not_started', 'reading', 'completed', 'paused', 'dropped')),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- 7. Ortak okuma mesajları ve yorumları
CREATE TABLE IF NOT EXISTS shared_reading_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'page_comment', 'quote', 'emoji_reaction', 'achievement')),
    content TEXT NOT NULL,
    page_number INTEGER, -- Sayfa yorumları için
    is_spoiler BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES shared_reading_messages(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Meydan okumalar (Challenges)
CREATE TABLE IF NOT EXISTS reading_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(30) DEFAULT 'pages' CHECK (challenge_type IN ('pages', 'books', 'time', 'speed', 'consistency')),
    target_value INTEGER NOT NULL,
    target_unit VARCHAR(20) DEFAULT 'pages' CHECK (target_unit IN ('pages', 'books', 'minutes', 'days')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Meydan okuma katılımları
CREATE TABLE IF NOT EXISTS challenge_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES reading_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, user_id)
);

-- 10. Rozet sistemi
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10),
    color_code VARCHAR(7),
    criteria JSONB, -- Badge kazanma kriterleri
    badge_type VARCHAR(20) DEFAULT 'achievement' CHECK (badge_type IN ('achievement', 'milestone', 'social', 'consistency')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Kullanıcı rozetleri
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    context JSONB, -- Badge'in kazanıldığı bağlam (hangi kitap, partner, vb.)
    UNIQUE(user_id, badge_id)
);

-- 12. Bildirimler
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('friend_request', 'reading_update', 'challenge_invite', 'badge_earned', 'message', 'milestone')),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    related_user_id UUID REFERENCES users(id),
    related_group_id UUID REFERENCES shared_reading_groups(id),
    related_session_id UUID REFERENCES shared_reading_sessions(id),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Önceden tanımlanmış rozetler
INSERT INTO badges (name, description, icon, color_code, badge_type, criteria) VALUES
('first_100_pages', 'İlk 100 Sayfa - İlk kez birlikte 100 sayfa okuma', '📖', '#4169E1', 'milestone', '{"shared_pages": 100}'),
('same_pace', 'Aynı Hızda - Partner ile aynı hızda ilerleme', '⚡', '#32CD32', 'social', '{"pace_difference": 5}'),
('motivator', 'Motivatör - Partner''i motive etme', '🔥', '#FF6347', 'social', '{"motivation_messages": 10}'),
('bookworm', 'Kitap Solucanı - Ayda 3+ kitap okuma', '🐛', '#9370DB', 'achievement', '{"books_per_month": 3}'),
('night_owl', 'Gece Kartalı - Gece 23:00 sonrası okuma', '🦉', '#2F4F4F', 'consistency', '{"night_reading_sessions": 5}'),
('speed_reader', 'Hızlı Okuyucu - Dakikada 250+ kelime', '💨', '#FF69B4', 'achievement', '{"reading_speed": 250}'),
('consistent_reader', 'Düzenli Okuyucu - 7 gün üst üste okuma', '📅', '#20B2AA', 'consistency', '{"consecutive_days": 7}'),
('social_butterfly', 'Sosyal Kelebek - 5+ okuma partneri', '🦋', '#FFD700', 'social', '{"partner_count": 5}')
ON CONFLICT (name) DO NOTHING;

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_user_relationships_requester ON user_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_addressee ON user_relationships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_status ON user_relationships(status);
CREATE INDEX IF NOT EXISTS idx_shared_reading_memberships_user ON shared_reading_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_reading_memberships_group ON shared_reading_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_reading_progress_session ON shared_reading_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_reading_progress_user ON shared_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_reading_messages_session ON shared_reading_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Trigger fonksiyonları
CREATE OR REPLACE FUNCTION update_shared_reading_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'lar
CREATE TRIGGER trigger_user_relationships_updated_at
    BEFORE UPDATE ON user_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_reading_updated_at();

CREATE TRIGGER trigger_shared_reading_groups_updated_at
    BEFORE UPDATE ON shared_reading_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_reading_updated_at();

CREATE TRIGGER trigger_shared_reading_sessions_updated_at
    BEFORE UPDATE ON shared_reading_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_reading_updated_at();

CREATE TRIGGER trigger_shared_reading_progress_updated_at
    BEFORE UPDATE ON shared_reading_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_reading_updated_at();

CREATE TRIGGER trigger_challenge_participations_updated_at
    BEFORE UPDATE ON challenge_participations
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_reading_updated_at(); 