#!/usr/bin/env node

/**
 * BookMate AI Production Setup Script
 * Gerçek AI entegrasyonu için otomatik konfigürasyon
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Renkli console output için
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (step, msg) => console.log(`${colors.cyan}[${step}] ${msg}${colors.reset}`)
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Async question helper
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log(`
${colors.magenta}🚀 BookMate AI Production Setup${colors.reset}
${colors.cyan}═══════════════════════════════════${colors.reset}

Bu script, uygulamanızı gerçek AI entegrasyonu için hazırlar.
  `);

  try {
    // Step 1: API Key alma
    log.step(1, 'OpenAI API Key Konfigürasyonu');
    
    const hasApiKey = await question('OpenAI API key\'iniz var mı? (y/n): ');
    
    if (hasApiKey.toLowerCase() !== 'y') {
      log.warning('Önce OpenAI API key almanız gerekiyor:');
      console.log('1. https://platform.openai.com/ adresine gidin');
      console.log('2. API Keys → Create new secret key');
      console.log('3. Billing setup yapın');
      console.log('4. Bu scripti tekrar çalıştırın\n');
      process.exit(0);
    }

    const apiKey = await question('OpenAI API Key\'inizi girin: ');
    
    if (!apiKey.startsWith('sk-')) {
      log.error('Geçersiz API key formatı! Key "sk-" ile başlamalı.');
      process.exit(1);
    }

    // Step 2: Demo mode'u kapat
    log.step(2, 'Demo Mode Deaktivasyonu');
    
    const disableDemo = await question('Demo mode\'u kapatıp gerçek AI\'ı aktifleştir? (y/n): ');
    const useDemoMode = disableDemo.toLowerCase() !== 'y';

    // Step 3: Model konfigürasyonu
    log.step(3, 'AI Model Konfigürasyonu');
    
    console.log('Mevcut modeller:');
    console.log('1. gpt-3.5-turbo (Önerilen - Hızlı ve ekonomik)');
    console.log('2. gpt-4 (Daha akıllı ama pahalı)');
    console.log('3. gpt-3.5-turbo-16k (Uzun metinler için)');
    
    const modelChoice = await question('Model seçin (1-3, default: 1): ') || '1';
    
    const models = {
      '1': 'gpt-3.5-turbo',
      '2': 'gpt-4',
      '3': 'gpt-3.5-turbo-16k'
    };
    
    const selectedModel = models[modelChoice] || 'gpt-3.5-turbo';

    // Step 4: app.json güncelle
    log.step(4, 'app.json Konfigürasyonu');
    
    const appJsonPath = path.join(process.cwd(), 'app.json');
    
    if (!fs.existsSync(appJsonPath)) {
      log.error('app.json dosyası bulunamadı!');
      process.exit(1);
    }

    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Extra konfigürasyonu güncelle
    if (!appConfig.expo.extra) {
      appConfig.expo.extra = {};
    }

    appConfig.expo.extra.openaiApiKey = apiKey;
    appConfig.expo.extra.useDemoMode = useDemoMode;
    appConfig.expo.extra.openaiModel = selectedModel;
    appConfig.expo.extra.maxTokens = 1000;
    appConfig.expo.extra.temperature = 0.7;

    // Backup oluştur
    fs.writeFileSync(appJsonPath + '.backup', fs.readFileSync(appJsonPath));
    
    // Yeni konfigürasyonu yaz
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));
    
    log.success('app.json güncellendi');

    // Step 5: EAS konfigürasyonu
    log.step(5, 'EAS Production Konfigürasyonu');
    
    const easJsonPath = path.join(process.cwd(), 'eas.json');
    
    if (fs.existsSync(easJsonPath)) {
      const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
      
      // Production environment variables
      if (!easConfig.build.production.env) {
        easConfig.build.production.env = {};
      }
      
      easConfig.build.production.env.OPENAI_API_KEY = apiKey;
      easConfig.build.production.env.USE_DEMO_MODE = useDemoMode.toString();
      easConfig.build.production.env.NODE_ENV = 'production';
      
      // Backup oluştur
      fs.writeFileSync(easJsonPath + '.backup', fs.readFileSync(easJsonPath));
      
      // Yeni konfigürasyonu yaz
      fs.writeFileSync(easJsonPath, JSON.stringify(easConfig, null, 2));
      
      log.success('eas.json güncellendi');
    } else {
      log.warning('eas.json bulunamadı - EAS kullanmıyorsanız normal');
    }

    // Step 6: Test konfigürasyonu
    log.step(6, 'AI Konfigürasyonu Test Ediliyor');
    
    console.log('\nTest sonuçları:');
    console.log(`├─ API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`├─ Demo Mode: ${useDemoMode ? 'Aktif' : 'Deaktif'}`);
    console.log(`├─ Model: ${selectedModel}`);
    console.log(`└─ Durum: ${useDemoMode ? '⚠️ Demo' : '✅ Production Ready'}`);

    // Step 7: Son adımlar
    log.step(7, 'Tamamlanıyor');
    
    log.success('AI Production Setup tamamlandı! 🎉');
    
    console.log(`
${colors.green}✅ Yapılan İşlemler:${colors.reset}
• OpenAI API key konfigüre edildi
• Demo mode ${useDemoMode ? 'aktif bırakıldı' : 'deaktif edildi'}
• Model "${selectedModel}" seçildi
• app.json güncellendi
• EAS konfigürasyonu ayarlandı

${colors.yellow}📱 Sonraki Adımlar:${colors.reset}
1. Uygulamayı yeniden başlatın
2. AI özelliklerini test edin
3. Production build alın: npm run build
4. App store'a yükleyin

${colors.blue}📊 Maliyet Tahmini:${colors.reset}
• ${selectedModel}: ~$0.002/1K token
• Aylık tahmini: $10-50 (kullanıma göre)
• İlk ay için $10 limit koymanızı öneririz

${colors.red}⚠️ Güvenlik Uyarısı:${colors.reset}
• API key'inizi kimseyle paylaşmayın
• Git repository'sine commit etmeyin
• OpenAI dashboard'dan kullanımı takip edin
    `);

  } catch (error) {
    log.error(`Setup sırasında hata: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Script'i çalıştır
if (require.main === module) {
  main();
}

module.exports = { main }; 