require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const mysql = require('mysql2/promise');

const app = express();
const upload = multer();

app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'imagedb'
});

(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS camera_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255),
      camera_model VARCHAR(255),
      profile JSON
    )`);
    console.log('Database connected');
  } catch (err) {
    console.error('MySQL init failed:', err.message);
  }
})();

const presets = {
  warm: { temperature: 6500, saturation: 1.1 },
  cool: { temperature: 4500, saturation: 0.9 },
  cinematic: { contrast: 1.3, saturation: 1.2 }
};

async function histogram(imageBuffer) {
  const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  const hist = [0, 0, 0];
  for (let i = 0; i < data.length; i += info.channels) {
    hist[0] += data[i];
    hist[1] += data[i + 1];
    hist[2] += data[i + 2];
  }
  const totalPixels = data.length / info.channels;
  return hist.map(v => v / totalPixels);
}

app.post('/compare', upload.fields([{ name: 'original' }, { name: 'edited' }]), async (req, res) => {
  try {
    const original = req.files['original'][0].buffer;
    const edited = req.files['edited'][0].buffer;
    const [h1, h2] = await Promise.all([histogram(original), histogram(edited)]);
    const diff = h2.map((v, i) => v - h1[i]);
    res.json({ averageColorDifference: diff });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/preset', (req, res) => {
  const { style } = req.body;
  if (style && presets[style]) {
    res.json({ preset: presets[style] });
  } else {
    res.status(404).json({ error: 'Unknown style' });
  }
});

app.post('/camera-profile', async (req, res) => {
  const { userId, cameraModel, profile } = req.body;
  if (!userId || !cameraModel || !profile) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await db.query(
      'INSERT INTO camera_profiles (user_id, camera_model, profile) VALUES (?, ?, ?)',
      [userId, cameraModel, JSON.stringify(profile)]
    );
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/camera-profile/:userId/:cameraModel', async (req, res) => {
  const { userId, cameraModel } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT profile FROM camera_profiles WHERE user_id=? AND camera_model=? ORDER BY id DESC LIMIT 1',
      [userId, cameraModel]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ profile: rows[0].profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/advice/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT camera_model FROM camera_profiles WHERE user_id=?',
      [userId]
    );
    if (rows.length === 0) {
      return res.json({ advice: 'No data yet. Try uploading edits!' });
    }
    const cameras = rows.map(r => r.camera_model);
    res.json({ advice: `You often use ${cameras.join(', ')}. Consider adjusting exposure slightly for better consistency.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
