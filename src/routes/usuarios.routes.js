const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requireRol } = require('../middleware/auth');

// GET /api/usuarios - Todos los usuarios (admin)
router.get('/', verifyToken, requireRol('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, activo, fecha_registro FROM usuario ORDER BY fecha_registro DESC'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// PATCH /api/usuarios/:id/activo - Activar/desactivar usuario
router.patch('/:id/activo', verifyToken, requireRol('admin'), async (req, res) => {
  const { activo } = req.body;
  try {
    await pool.query('UPDATE usuario SET activo = ? WHERE id = ?', [activo, req.params.id]);
    res.json({ mensaje: 'Usuario actualizado' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;