const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requireRol } = require('../middleware/auth');

// GET /api/categorias - Listar todas (público)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categoria ORDER BY nombre');
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// POST /api/categorias - Crear (solo admin)
router.post('/', verifyToken, requireRol('admin'), async (req, res) => {
  const { nombre, descripcion, icono } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO categoria (nombre, descripcion, icono) VALUES (?,?,?)',
      [nombre, descripcion, icono]
    );
    res.status(201).json({ mensaje: 'Categoría creada', id: result.insertId });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;