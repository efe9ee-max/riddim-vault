const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Dizinleri oluştur ─────────────────────────────────────────────────────────
const UPLOADS_AUDIO = path.join(__dirname, 'uploads', 'audio');
const UPLOADS_COVERS = path.join(__dirname, 'uploads', 'covers');
const DATA_FILE = path.join(__dirname, 'data', 'tracks.json');

[UPLOADS_AUDIO, UPLOADS_COVERS, path.join(__dirname, 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Admin Şifresi (değiştirin) ─────────────────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || 'riddim140';

// ── Multer Ayarları ────────────────────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, UPLOADS_AUDIO);
    else cb(null, UPLOADS_COVERS);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/x-flac', 'audio/x-wav'];
const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: audioStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' && allowedAudio.includes(file.mimetype)) return cb(null, true);
    if (file.fieldname === 'cover' && allowedImage.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}`));
  }
});

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────
const readTracks = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeTracks = (tracks) => fs.writeFileSync(DATA_FILE, JSON.stringify(tracks, null, 2), 'utf8');

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

// POST /api/tracks → Yeni parça yükle (admin)
app.post(
  '/api/tracks',
  requireAdmin,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const { title, artist, bpm, key, genre, tags, description } = req.body;

      if (!title || !req.files?.audio) {
        return res.status(400).json({ error: 'Parça adı ve ses dosyası zorunludur.' });
      }

      const audioFile = req.files.audio[0];
      const coverFile = req.files?.cover?.[0];

      const newTrack = {
        id: uuidv4(),
        title: title.trim(),
        artist: artist?.trim() || 'Anonim',
        bpm: bpm ? parseInt(bpm) : null,
        key: key?.trim() || null,
        genre: genre?.trim() || 'Riddim',
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        description: description?.trim() || '',
        audioUrl: `/uploads/audio/${audioFile.filename}`,
        audioSize: audioFile.size,
        coverUrl: coverFile ? `/uploads/covers/${coverFile.filename}` : null,
        createdAt: new Date().toISOString(),
        plays: 0
      };

      const tracks = readTracks();
      tracks.unshift(newTrack);
      writeTracks(tracks);

      res.status(201).json(newTrack);
    } catch (err) {
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

// DELETE /api/tracks/:id → Parça sil (admin)
app.delete('/api/tracks/:id', requireAdmin, (req, res) => {
  const tracks = readTracks();
  const idx = tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Parça bulunamadı.' });

  const track = tracks[idx];

  // Dosyaları sil
  const audioPath = path.join(__dirname, 'uploads', 'audio', path.basename(track.audioUrl));
  const coverPath = track.coverUrl ? path.join(__dirname, 'uploads', 'covers', path.basename(track.coverUrl)) : null;

  if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);

  tracks.splice(idx, 1);
  writeTracks(tracks);
  res.json({ success: true });
});

// ── Production: React frontend'i sun ──────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA — tüm diğer istekleri index.html'e yönlendir
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
  console.log(`\n🎵 Riddim Vault API → http://localhost:${PORT}`);
  console.log(`🔐 Admin PIN: ${ADMIN_PIN}\n`);
});
