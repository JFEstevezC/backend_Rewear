const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requireRol } = require('../middleware/auth');

// POST /api/calificaciones - Calificar vendedor
router.post('/', verifyToken, requireRol('cliente'), async (req, res) => {
  const { id_vendedor, id_pedido, puntuacion, comentario } = req.body;
  try {
    // Verificar que el pedido sea del comprador y esté entregado
    const [[pedido]] = await pool.query(
      "SELECT id FROM pedido WHERE id = ? AND id_comprador = ? AND estado = 'entregado'",
      [id_pedido, req.user.id]
    );
    if (!pedido)
      return res.status(400).json({ mensaje: 'Solo puedes calificar pedidos entregados' });

    await pool.query(
      `INSERT INTO calificacion (id_vendedor, id_comprador, id_pedido, puntuacion, comentario)
       VALUES (?,?,?,?,?)`,
      [id_vendedor, req.user.id, id_pedido, puntuacion, comentario]
    );
    res.status(201).json({ mensaje: 'Calificación enviada' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ mensaje: 'Ya calificaste este pedido' });
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/calificaciones/vendedor/:id - Ver calificaciones de un vendedor
router.get('/vendedor/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.puntuacion, c.comentario, c.fecha, u.nombre AS comprador
      FROM calificacion c JOIN usuario u ON u.id = c.id_comprador
      WHERE c.id_vendedor = ?
      ORDER BY c.fecha DESC
    `, [req.params.id]);

    const promedio = rows.length
      ? (rows.reduce((s, r) => s + r.puntuacion, 0) / rows.length).toFixed(1)
      : null;

    res.json({ promedio, total: rows.length, calificaciones: rows });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;