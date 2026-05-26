const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/carrito - Ver mi carrito
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, p.id AS producto_id, p.titulo, p.precio,
             p.imagen_url, p.talla, p.estado_producto, u.nombre AS vendedor
      FROM carrito c
      JOIN producto p ON c.id_producto = p.id
      JOIN usuario  u ON p.id_vendedor = u.id
      WHERE c.id_usuario = ?
    `, [req.user.id]);
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// POST /api/carrito - Agregar producto al carrito
router.post('/', verifyToken, async (req, res) => {
  const { id_producto } = req.body;
  try {
    // Verificar que el producto esté disponible
    const [[prod]] = await pool.query(
      'SELECT estado_producto, id_vendedor FROM producto WHERE id = ? AND aprobado = true',
      [id_producto]
    );
    if (!prod)
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    if (prod.estado_producto !== 'disponible')
      return res.status(400).json({ mensaje: 'Producto no disponible' });
    if (prod.id_vendedor === req.user.id)
      return res.status(400).json({ mensaje: 'No puedes comprar tu propio producto' });

    await pool.query(
      'INSERT INTO carrito (id_usuario, id_producto) VALUES (?,?)',
      [req.user.id, id_producto]
    );
    res.status(201).json({ mensaje: 'Producto agregado al carrito' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ mensaje: 'El producto ya está en tu carrito' });
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// DELETE /api/carrito/:id - Quitar producto del carrito
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM carrito WHERE id = ? AND id_usuario = ?',
      [req.params.id, req.user.id]
    );
    res.json({ mensaje: 'Producto eliminado del carrito' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;