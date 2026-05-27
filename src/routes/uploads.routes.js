const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Crear carpeta si no existe
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const tipos = /jpeg|jpg|png|webp/;
    const valido = tipos.test(file.mimetype);
    valido ? cb(null, true) : cb(new Error('Solo imágenes JPG, PNG o WEBP'));
  }
});

// POST /api/uploads - Subir una imagen
router.post('/', upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: 'No se recibió imagen' });
  const url = `http://localhost:3001/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;