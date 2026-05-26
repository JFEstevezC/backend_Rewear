const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuario (nombre, email, password_hash, rol) VALUES (?,?,?,?)',
      [nombre, email, hash, rol || 'cliente']
    );
    res.status(201).json({ mensaje: 'Usuario creado', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [[user]] = await pool.query(
      'SELECT * FROM usuario WHERE email = ? AND activo = true', [email]
    );
    if (!user)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, rol: user.rol, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      usuario: { id: user.id, nombre: user.nombre, rol: user.rol, email: user.email }
    });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;