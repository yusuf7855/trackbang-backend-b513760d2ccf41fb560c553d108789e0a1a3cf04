// scripts/migrate_user_platform_prefs.js
// VAROLAN USER'LARA PLATFORM PREFERENCES EKLEYEN SCRIPT

const mongoose = require('mongoose');

// MongoDB connection string - senin connection string'ini kullan
const MONGODB_URI = "mongodb+srv://221118047:9KY5zsMHQRJyEwGq@cluster0.rz2m5a4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// User schema - basit versiyonu
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  platformPreferences: {
    spotify: { type: Boolean, default: true },
    appleMusic: { type: Boolean, default: true },
    youtubeMusic: { type: Boolean, default: true },
    beatport: { type: Boolean, default: true },
    soundcloud: { type: Boolean, default: true }
  },
  appSettings: {
    notificationsEnabled: { type: Boolean, default: true },
    autoPlayEnabled: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: true }
  }
}, { strict: false }); // strict: false - diğer alanlar için

const User = mongoose.model('User', userSchema);

const migrateUsers = async () => {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ MongoDB bağlandı');

    // Tüm user'ları getir
    const users = await User.find({});
    console.log(`📊 Toplam ${users.length} kullanıcı bulundu`);

    let updatedCount = 0;
    let alreadyHasPrefsCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let needsUpdate = false;

        // Platform preferences kontrolü
        if (!user.platformPreferences || Object.keys(user.platformPreferences).length === 0) {
          console.log(`📝 ${user.username} - platformPreferences ekleniyor...`);
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                platformPreferences: {
                  spotify: true,
                  appleMusic: true,
                  youtubeMusic: true,
                  beatport: true,
                  soundcloud: true
                }
              }
            }
          );
          needsUpdate = true;
        }

        // App settings kontrolü
        if (!user.appSettings || Object.keys(user.appSettings).length === 0) {
          console.log(`📝 ${user.username} - appSettings ekleniyor...`);
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                appSettings: {
                  notificationsEnabled: true,
                  autoPlayEnabled: false,
                  darkMode: true
                }
              }
            }
          );
          needsUpdate = true;
        }

        if (needsUpdate) {
          updatedCount++;
          console.log(`✅ ${user.username} güncellendi`);
        } else {
          alreadyHasPrefsCount++;
          console.log(`⏭️  ${user.username} - zaten ayarları var`);
        }
      } catch (userError) {
        errorCount++;
        console.error(`❌ ${user.username} - hata:`, userError.message);
      }
    }

    console.log('\n===========================================');
    console.log('📊 MİGRASYON RAPORU:');
    console.log(`✅ Güncellenen kullanıcılar: ${updatedCount}`);
    console.log(`⏭️  Zaten ayarı olan kullanıcılar: ${alreadyHasPrefsCount}`);
    console.log(`❌ Hata olan kullanıcılar: ${errorCount}`);
    console.log(`📊 Toplam: ${users.length}`);
    console.log('===========================================\n');

    console.log('✅ Migration başarıyla tamamlandı!');
    
    await mongoose.connection.close();
    console.log('🔐 MongoDB bağlantısı kapatıldı');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration hatası:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Script'i çalıştır
migrateUsers();

/*
KULLANIM:

1. Bu dosyayı backend klasörüne kaydet:
   backend/scripts/migrate_user_platform_prefs.js

2. Çalıştır:
   node scripts/migrate_user_platform_prefs.js

3. Sonuçları kontrol et

NOT: Bu script güvenlidir, sadece eksik alanları ekler.
*/