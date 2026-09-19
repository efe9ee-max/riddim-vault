const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'lwebjh6i',
  api_key: '255171112575133',
  api_secret: '8wSoZClx36sBCPDCKC0Znoeew7Q'
});

const DATA_FILE = path.join(__dirname, 'data', 'tracks.json');

async function migrate() {
  console.log('--- CLOUDINARY BULUT SENKRONIZASYONU BASLADI ---');
  let tracks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    console.log(`[${i+1}/${tracks.length}] "${track.title}" isleniyor...`);

    // Audio upload if local
    if (track.audioUrl && track.audioUrl.startsWith('/uploads/')) {
      const localAudioPath = path.join(__dirname, track.audioUrl);
      if (fs.existsSync(localAudioPath)) {
        console.log(`  -> Ses Cloudinary'e yukleniyor (${(track.audioSize/(1024*1024)).toFixed(1)}MB)...`);
        const result = await cloudinary.uploader.upload(localAudioPath, {
          resource_type: 'video',
          folder: 'nammu/audio'
        });
        track.audioUrl = result.secure_url;
        console.log(`  -> Ses yuklendi: ${track.audioUrl}`);
      }
    }

    // Cover upload if local
    if (track.coverUrl && track.coverUrl.startsWith('/uploads/')) {
      const localCoverPath = path.join(__dirname, track.coverUrl);
      if (fs.existsSync(localCoverPath)) {
        console.log(`  -> Kapak Cloudinary'e yukleniyor...`);
        const result = await cloudinary.uploader.upload(localCoverPath, {
          resource_type: 'image',
          folder: 'nammu/covers'
        });
        track.coverUrl = result.secure_url;
        console.log(`  -> Kapak yuklendi: ${track.coverUrl}`);
      }
    }
  }

  // Save updated tracks.json
  fs.writeFileSync(DATA_FILE, JSON.stringify(tracks, null, 2), 'utf8');
  console.log('-> tracks.json guncellendi.');

  // Upload tracks.json as raw file to Cloudinary so it is permanent!
  console.log('-> Veritabani (tracks.json) Cloudinary bulutuna kilitleniyor...');
  await cloudinary.uploader.upload(DATA_FILE, {
    resource_type: 'raw',
    public_id: 'nammu_tracks_db.json',
    overwrite: true
  });

  console.log('--- BASARIYLA TAMAMLANDI! BUTUN PARCALAR VE VERILER BULUTTA KALICI ---');
}

migrate().catch(console.error);
