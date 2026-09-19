const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;

// ── Cloudinary Yapılandırması ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'lwebjh6i',
  api_key: process.env.CLOUDINARY_API_KEY || '255171112575133',
  api_secret: process.env.CLOUDINARY_API_SECRET || '8wSoZClx36sBCPDCKC0Znoeew7Q'
});

// ── Dizinleri oluştur ─────────────────────────────────────────────────────────
const UPLOADS_TEMP = path.join(__dirname, 'uploads', 'temp');
const DATA_FILE = path.join(__dirname, 'data', 'tracks.json');

[UPLOADS_TEMP, path.join(__dirname, 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

// ── Buluttan Veritabanını Otomatik İndir / Senkronize Et ───────────────────────
async function syncDatabaseFromCloud() {
  try {
    const resource = await cloudinary.api.resource('nammu_tracks_db.json', { resource_type: 'raw' });
    if (resource && resource.secure_url) {
      https.get(`${resource.secure_url}?t=${Date.now()}`, (res) => {
        if (res.statusCode === 200) {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            try {
              const remoteTracks = JSON.parse(raw);
              if (Array.isArray(remoteTracks) && remoteTracks.length > 0) {
                fs.writeFileSync(DATA_FILE, JSON.stringify(remoteTracks, null, 2), 'utf8');
                console.log(`☁️ Cloudinary veritabanı senkronize edildi: ${remoteTracks.length} parça aktif.`);
              }
            } catch (e) {
              console.warn('Remote tracks parse error:', e.message);
            }
          });
        }
      }).on('error', (e) => console.warn('Cloud sync net error:', e.message));
    }
  } catch (err) {
    console.warn('Cloudinary sync check:', err.message);
  }
}

// Sunucu açılır açılmaz buluttan en güncel listeyi çek
syncDatabaseFromCloud();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Admin Şifresi ──────────────────────────────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || 'riddim140';

// ── Multer Geçici Yükleme Ayarları ─────────────────────────────────────────────
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_TEMP),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/x-flac', 'audio/x-wav'];
const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: tempStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' && (allowedAudio.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|flac|ogg)$/i))) {
      return cb(null, true);
    }
    if (file.fieldname === 'cover' && (allowedImage.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i))) {
      return cb(null, true);
    }
    cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}`));
  }
});

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────
const readTracks = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeTracks = (tracks) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tracks, null, 2), 'utf8');
};

// Admin doğrulama middleware
const requireAdmin = (req, res, next) => {
  const pin = req.headers['x-admin-pin'] || req.body?.adminPin;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Geçersiz admin şifresi.' });
  next();
};

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/tracks → Tüm parçaları listele
app.get('/api/tracks', (req, res) => {
  const tracks = readTracks();
  res.json(tracks);
});

// POST /api/admin/verify → Admin şifresi doğrulama
app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) return res.json({ success: true });
  res.status(401).json({ success: false, error: 'Geçersiz PIN.' });
});

// POST /api/tracks → Yeni parça yükle (Cloudinary Kalıcı Yükleme)
app.post(
  '/api/tracks',
  requireAdmin,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, artist, bpm, key, genre, tags, description } = req.body;

      if (!title || !req.files?.audio) {
        return res.status(400).json({ error: 'Parça adı ve ses dosyası zorunludur.' });
      }

      const audioFile = req.files.audio[0];
      const coverFile = req.files?.cover?.[0];

      // 1. Sesi Cloudinary'e yükle (resource_type: video -> audio/wav)
      console.log(`☁️ Cloudinary'e ses yukleniyor: ${audioFile.originalname}`);
      const audioResult = await cloudinary.uploader.upload(audioFile.path, {
        resource_type: 'video',
        folder: 'nammu/audio'
      });

      // 2. Varsa kapağı Cloudinary'e yükle
      let coverUrl = null;
      if (coverFile) {
        console.log(`☁️ Cloudinary'e kapak yukleniyor: ${coverFile.originalname}`);
        const coverResult = await cloudinary.uploader.upload(coverFile.path, {
          resource_type: 'image',
          folder: 'nammu/covers'
        });
        coverUrl = coverResult.secure_url;
      }

      // Geçici yerel dosyaları temizle
      try { fs.unlinkSync(audioFile.path); } catch (e) {}
      if (coverFile) { try { fs.unlinkSync(coverFile.path); } catch (e) {} }

      // 3. Parça nesnesini oluştur
      const newTrack = {
        id: uuidv4(),
        title: title.trim(),
        artist: artist?.trim() || 'Nammu',
        bpm: bpm ? parseInt(bpm) : null,
        key: key?.trim() || null,
        genre: genre?.trim() || 'Riddim',
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        description: description?.trim() || '',
        audioUrl: audioResult.secure_url,
        audioSize: audioFile.size,
        coverUrl: coverUrl,
        createdAt: new Date().toISOString(),
        plays: 0
      };

      // 4. Yerel tracks.json'a ekle
      const tracks = readTracks();
      tracks.unshift(newTrack);
      writeTracks(tracks);

      // 5. Veritabanını Cloudinary bulutuna yükle (invalidate: true ile CDN önbelleği temizlenir)
      try {
        await cloudinary.uploader.upload(DATA_FILE, {
          resource_type: 'raw',
          public_id: 'nammu_tracks_db.json',
          overwrite: true,
          invalidate: true
        });
        console.log(`☁️ Bulut veritabanı ${tracks.length} parça ile güncellendi.`);
      } catch (cloudErr) {
        console.error('Cloud DB backup error:', cloudErr.message);
      }

      console.log(`✅ Parça Cloudinary bulutuna basariyla kilitlendi: "${newTrack.title}"`);
      res.status(201).json(newTrack);
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/tracks/:id → Parça bilgilerini düzenle (admin)
app.put(
  '/api/tracks/:id',
  requireAdmin,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      const tracks = readTracks();
      const track = tracks.find(t => t.id === req.params.id);
      if (!track) return res.status(404).json({ error: 'Parça bulunamadı.' });

      const { title, artist, bpm, key, genre, tags, description } = req.body;

      if (title && title.trim()) track.title = title.trim();
      if (artist !== undefined) track.artist = artist.trim() || 'Nammu';

      // BPM düzenleme veya tamamen kaldırma (boş bırakılırsa kaldırılır)
      if (bpm === '' || bpm === null || bpm === undefined || bpm === '0') {
        track.bpm = null;
      } else {
        const parsedBpm = parseInt(bpm);
        track.bpm = isNaN(parsedBpm) ? null : parsedBpm;
      }

      if (key !== undefined) track.key = key?.trim() || null;
      if (genre !== undefined) track.genre = genre?.trim() || 'Riddim';

      if (tags !== undefined) {
        track.tags = typeof tags === 'string'
          ? tags.split(',').map(t => t.trim()).filter(Boolean)
          : (Array.isArray(tags) ? tags : []);
      }

      if (description !== undefined) track.description = description.trim();

      // Yeni kapak yüklendiyse Cloudinary'e yükle
      if (req.files?.cover?.[0]) {
        const coverFile = req.files.cover[0];
        const coverResult = await cloudinary.uploader.upload(coverFile.path, {
          resource_type: 'image',
          folder: 'nammu/covers'
        });
        track.coverUrl = coverResult.secure_url;
        try { fs.unlinkSync(coverFile.path); } catch (e) {}
      }

      writeTracks(tracks);

      // Cloudinary bulut veritabanını güncelle
      try {
        await cloudinary.uploader.upload(DATA_FILE, {
          resource_type: 'raw',
          public_id: 'nammu_tracks_db.json',
          overwrite: true,
          invalidate: true
        });
      } catch (cloudErr) {
        console.error('Cloud DB edit sync error:', cloudErr.message);
      }

      console.log(`✏️ Parça güncellendi: "${track.title}" (BPM: ${track.bpm || 'Yok'})`);
      res.json(track);
    } catch (err) {
      console.error('Track edit error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/tracks/:id/play → Çalma sayısını artır
app.patch('/api/tracks/:id/play', (req, res) => {
  const tracks = readTracks();
  const track = tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Parça bulunamadı.' });
  track.plays = (track.plays || 0) + 1;
  writeTracks(tracks);
  res.json({ plays: track.plays });
});

// DELETE /api/tracks/:id → Parça sil
app.delete('/api/tracks/:id', requireAdmin, async (req, res) => {
  const tracks = readTracks();
  const idx = tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Parça bulunamadı.' });

  tracks.splice(idx, 1);
  writeTracks(tracks);

  // Cloudinary veritabanını güncelle
  try {
    await cloudinary.uploader.upload(DATA_FILE, {
      resource_type: 'raw',
      public_id: 'nammu_tracks_db.json',
      overwrite: true,
      invalidate: true
    });
  } catch (cloudErr) {
    console.error('Cloud DB delete sync error:', cloudErr.message);
  }

  res.json({ success: true });
});

// ── Production: React frontend'i sun ──────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Hata yakalayıcı ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🎵 NAMMU ABYSS API → http://localhost:${PORT}`);
  console.log(`🔐 Admin PIN: ${ADMIN_PIN}`);
  console.log(`☁️ Cloudinary Bulut Depolama: AKTİF (25 GB Kalıcı)\n`);
});
