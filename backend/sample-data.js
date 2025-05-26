const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

const sampleBooks = [
  {
    title: 'Suç ve Ceza',
    author: 'Fyodor Dostoyevski',
    isbn: '9780140449136',
    publisher: 'İş Bankası Kültür Yayınları',
    published_year: 1866,
    page_count: 671,
    genre: 'Klasik Edebiyat',
    description: 'Dostoyevski\'nin en ünlü eserlerinden biri olan Suç ve Ceza, insan psikolojisinin derinliklerine inen büyük bir roman.',
    cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop'
  },
  {
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    publisher: 'Can Yayınları',
    published_year: 1949,
    page_count: 328,
    genre: 'Bilim Kurgu',
    description: 'Orwell\'in distopik geleceği anlattığı bu eser, totaliter rejimleri ve gözetim toplumunu konu alır.',
    cover_image_url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=300&h=400&fit=crop'
  },
  {
    title: 'Sapiens: İnsan Türünün Kısa Tarihi',
    author: 'Yuval Noah Harari',
    isbn: '9786051142135',
    publisher: 'Kolektif Kitap',
    published_year: 2011,
    page_count: 512,
    genre: 'Tarih',
    description: 'İnsanlığın 70.000 yıllık serüvenini anlatan, evrimden modern çağa kadar uzanan kapsamlı bir tarih kitabı.',
    cover_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop'
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    publisher: 'Epsilon Yayınevi',
    published_year: 2018,
    page_count: 320,
    genre: 'Kişisel Gelişim',
    description: 'Küçük değişikliklerin büyük sonuçlar yaratmasını sağlayan alışkanlık oluşturma rehberi.',
    cover_image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop'
  },
  {
    title: 'The Clean Coder',
    author: 'Robert C. Martin',
    isbn: '9780137081073',
    publisher: 'Pearson Education',
    published_year: 2011,
    page_count: 256,
    genre: 'Teknoloji',
    description: 'Profesyonel yazılım geliştirici olmak için gerekli davranış ve teknikler hakkında bir rehber.',
    cover_image_url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300&h=400&fit=crop'
  },
  {
    title: 'Simyacı',
    author: 'Paulo Coelho',
    isbn: '9786051062815',
    publisher: 'Can Yayınları',
    published_year: 1988,
    page_count: 208,
    genre: 'Roman',
    description: 'Bir çobanın hayallerinin peşinden gitmesini konu alan felsefi roman.',
    cover_image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop'
  },
  {
    title: 'Homo Deus',
    author: 'Yuval Noah Harari',
    isbn: '9786051143046',
    publisher: 'Kolektif Kitap',
    published_year: 2015,
    page_count: 496,
    genre: 'Felsefe',
    description: 'İnsanlığın geleceğini ve teknolojinin insan türü üzerindeki etkilerini inceleyen düşünce provokatif bir eser.',
    cover_image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=300&h=400&fit=crop'
  },
  {
    title: 'Steve Jobs',
    author: 'Walter Isaacson',
    isbn: '9786051062709',
    publisher: 'Alfa Yayınları',
    published_year: 2011,
    page_count: 656,
    genre: 'Biyografi',
    description: 'Apple\'ın kurucusu Steve Jobs\'un hayatını ve vizyonunu anlatan kapsamlı biyografi.',
    cover_image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop'
  }
];

async function addSampleData() {
  try {
    console.log('📚 Örnek kitaplar ekleniyor...');
    
    // Kategorileri al
    const categoriesResult = await pool.query('SELECT * FROM categories');
    const categories = categoriesResult.rows;
    
    for (const bookData of sampleBooks) {
      // Kitap zaten var mı kontrol et
      const existingBook = await pool.query('SELECT id FROM books WHERE isbn = $1', [bookData.isbn]);
      
      if (existingBook.rows.length === 0) {
        // Kitabı ekle
        const result = await pool.query(`
          INSERT INTO books (title, author, isbn, publisher, published_year, page_count, genre, description, cover_image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          bookData.title, bookData.author, bookData.isbn, bookData.publisher,
          bookData.published_year, bookData.page_count, bookData.genre,
          bookData.description, bookData.cover_image_url
        ]);
        
        const bookId = result.rows[0].id;
        
        // Rastgele kategori ata
        const matchingCategory = categories.find(cat => 
          cat.name.toLowerCase().includes(bookData.genre.toLowerCase()) ||
          bookData.genre.toLowerCase().includes(cat.name.toLowerCase())
        );
        
        if (matchingCategory) {
          await pool.query(
            'INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [bookId, matchingCategory.id]
          );
        }
        
        console.log(`✅ ${bookData.title} eklendi`);
      } else {
        console.log(`⏭️  ${bookData.title} zaten var`);
      }
    }
    
    // Toplam kitap sayısını göster
    const totalBooks = await pool.query('SELECT COUNT(*) FROM books');
    console.log(`\n📖 Toplam ${totalBooks.rows[0].count} kitap veritabanında`);
    
    console.log('\n🎉 Örnek veriler başarıyla eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

addSampleData(); 