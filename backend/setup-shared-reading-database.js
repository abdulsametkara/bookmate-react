const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupSharedReadingDatabase() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'bookmate_db',
        password: '246595',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('✅ PostgreSQL bağlantısı başarılı');

        // İlişki türleri tablosu
        await client.query(`
            CREATE TABLE IF NOT EXISTS relationship_types (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) UNIQUE NOT NULL,
                icon VARCHAR(50),
                color_code VARCHAR(7),
                description TEXT,
                "createdAt" TIMESTAMP DEFAULT NOW(),
                "updatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ relationship_types tablosu oluşturuldu');

        // Kullanıcı ilişkileri tablosu
        await client.query(`
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
                
                UNIQUE(requester_id, addressee_id)
            );
        `);
        console.log('✅ user_relationships tablosu oluşturuldu');

        // Ortak okuma grupları
        await client.query(`
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
        `);
        console.log('✅ shared_reading_groups tablosu oluşturuldu');

        // Grup üyelikleri
        await client.query(`
            CREATE TABLE IF NOT EXISTS shared_reading_memberships (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
                joined_at TIMESTAMP DEFAULT NOW(),
                left_at TIMESTAMP,
                
                UNIQUE(group_id, user_id)
            );
        `);
        console.log('✅ shared_reading_memberships tablosu oluşturuldu');

        // Ortak okuma oturumları
        await client.query(`
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
        `);
        console.log('✅ shared_reading_sessions tablosu oluşturuldu');

        // Bildirimler
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                data JSONB,
                read_at TIMESTAMP,
                related_user_id UUID REFERENCES users(id),
                related_session_id UUID REFERENCES shared_reading_sessions(id),
                "createdAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ notifications tablosu oluşturuldu');

        // Varsayılan ilişki türlerini ekle
        await client.query(`
            INSERT INTO relationship_types (name, icon, color_code, description) VALUES
            ('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
            ('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
            ('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
            ('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Varsayılan ilişki türleri eklendi');

        // İndeksler
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_relationships_requester ON user_relationships(requester_id);
            CREATE INDEX IF NOT EXISTS idx_user_relationships_addressee ON user_relationships(addressee_id);
            CREATE INDEX IF NOT EXISTS idx_user_relationships_status ON user_relationships(status);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        `);
        console.log('✅ İndeksler oluşturuldu');

        console.log('\n🎉 Ortak Okuma veritabanı kurulumu tamamlandı!');

        // Test için bazı sample data ekleyelim
        console.log('\n📝 Test verileri ekleniyor...');
        
        // Test users'ı check edelim
        const usersResult = await client.query('SELECT id, email, "displayName" FROM users ORDER BY "createdAt" LIMIT 3');
        if (usersResult.rows.length >= 2) {
            const user1 = usersResult.rows[0];
            const user2 = usersResult.rows[1];
            
            console.log(`Test kullanıcıları: ${user1.displayName} ve ${user2.displayName}`);
            
            // Test arkadaşlık isteği oluştur
            await client.query(`
                INSERT INTO user_relationships (requester_id, addressee_id, relationship_type_id, status, request_message)
                SELECT $1, $2, rt.id, 'pending', 'Arkadaş olmak ister misin?'
                FROM relationship_types rt WHERE rt.name = 'okuma_arkadasi'
                ON CONFLICT (requester_id, addressee_id) DO NOTHING
            `, [user1.id, user2.id]);
            
            console.log('✅ Test arkadaşlık isteği oluşturuldu');
        }

    } catch (error) {
        console.error('❌ Hata:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

// Script çalıştır
if (require.main === module) {
    setupSharedReadingDatabase()
        .then(() => {
            console.log('\n✨ Database setup tamamlandı!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Setup hatası:', error);
            process.exit(1);
        });
}

module.exports = { setupSharedReadingDatabase }; 