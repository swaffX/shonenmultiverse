# Shonen Multiverse Discord Bot

Shonen Multiverse Roblox oyunu için geliştirilmiş kapsamlı Discord botu.

## 🎮 Özellikler

### Temel Özellikler
- ✅ **Reaction Roles** - Emojiye tıklayarak rol alma
- ✅ **Welcome System** - Özelleştirilebilir karşılama mesajları
- ✅ **Level System** - XP ve level kazanma sistemi
- ✅ **Leaderboard** - XP sıralaması

### Moderasyon
- ✅ **Ban/Kick/Mute** - Temel moderasyon araçları
- ✅ **Warning System** - Kullanıcı uyarı sistemi
- ✅ **Anti-Spam** - Spam koruması

### Güvenlik
- ✅ **Anti-Raid** - Toplu katılım koruması
- ✅ **Anti-Nuke** - Mass ban/kick/delete koruması
- ✅ **Bot Protection** - Tehlikeli bot ekleme koruması
- ✅ **Role Protection** - Tehlikeli rol atama bildirimi

### Eğlence
- ✅ **Giveaways** - Çekiliş sistemi
- ✅ **Polls** - Oylama sistemi
- ✅ **Custom Embeds** - Özel embed mesajları

### Bilgi
- ✅ **Rules Embed** - Kapsamlı kurallar
- ✅ **Info Dropdown** - Dropdown menülü bilgi sistemi
- ✅ **Server Info** - Sunucu bilgileri

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- MongoDB
- Discord Bot Token

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Environment Değişkenlerini Ayarla
`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```env
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_test_guild_id_here
MONGODB_URI=mongodb://localhost:27017/shonen-multiverse
OWNER_IDS=315875588906680330,413081778031427584
```

### 3. MongoDB'yi Başlat
**Yerel kurulum için:**
```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
```

**Veya MongoDB Atlas kullanın (önerilen):**
1. https://cloud.mongodb.com adresinde ücretsiz hesap oluştur
2. Cluster oluştur
3. Connection string'i al ve `.env` dosyasına ekle

### 4. Botu Başlat
```bash
npm start
```

## 🖥️ VPS Kurulumu

### Ubuntu/Debian
```bash
# Node.js yükle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 yükle (process manager)
sudo npm install -g pm2

# Projeyi kopyala
git clone <repo-url>
cd shonen-multiverse-bot

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
nano .env  # Değerleri doldur

# PM2 ile başlat
pm2 start src/index.js --name "shonen-bot"

# Otomatik başlatma ayarla
pm2 startup
pm2 save
```

### PM2 Komutları
```bash
pm2 status          # Durum kontrol
pm2 logs shonen-bot # Logları gör
pm2 restart shonen-bot # Yeniden başlat
pm2 stop shonen-bot # Durdur
```

## 📜 Komutlar

### Admin Komutları
| Komut | Açıklama |
|-------|----------|
| `/reactionrole create` | Reaction role mesajı oluştur |
| `/reactionrole add` | Emoji-rol ekle |
| `/welcome setup` | Welcome kanalı ayarla |
| `/rules` | Kurallar embed'i oluştur |
| `/info` | Info dropdown menüsü oluştur |
| `/embed` | Özel embed gönder |

### Moderasyon Komutları
| Komut | Açıklama |
|-------|----------|
| `/ban` | Kullanıcı yasakla |
| `/kick` | Kullanıcı at |
| `/mute` | Kullanıcı sustur |
| `/warn add/remove/list/clear` | Uyarı yönetimi |

### Utility Komutları
| Komut | Açıklama |
|-------|----------|
| `/level` | Level bilgisi |
| `/leaderboard` | XP sıralaması |
| `/serverinfo` | Sunucu bilgileri |

### Fun Komutları
| Komut | Açıklama |
|-------|----------|
| `/giveaway start/end/reroll` | Çekiliş yönetimi |
| `/poll` | Oylama oluştur |

## 🔒 Güvenlik Özellikleri

### Anti-Spam
- 5 saniyede 5+ mesaj = Otomatik mute
- Ayarlanabilir eşikler

### Anti-Raid
- 10 saniyede 10+ katılım = Lockdown modu
- Owner'a otomatik bildirim

### Anti-Nuke
- 5 dakikada 3+ kanal silme = Yetkili rolü kaldır
- 5 dakikada 5+ ban = Yetkili rolü kaldır
- 5 dakikada 3+ rol silme = Yetkili rolü kaldır

## 🔗 Linkler

- **Roblox Oyunu:** https://www.roblox.com/games/130542097430425/Shonen-Multiverse
- **Roblox Grubu:** https://www.roblox.com/communities/35379020/Sh-mei-Studios

## 📞 Destek

Bot ile ilgili sorularınız için Discord sunucusunda ticket açabilirsiniz.

## 📄 Lisans

MIT License
