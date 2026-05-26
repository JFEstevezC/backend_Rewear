const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requireRol } = require('../middleware/auth');

// POST /api/pedidos - Crear pedido desde el carrito
router.post('/', verifyToken, requireRol('cliente'), async (req, res) => {
  const { direccion_envio } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener productos del carrito
    const [items] = await conn.query(`
      SELECT c.id_producto, p.precio, p.estado_producto, p.id_vendedor
      FROM carrito c JOIN producto p ON c.id_producto = p.id
      WHERE c.id_usuario = ?
    `, [req.user.id]);

    if (items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ mensaje: 'El carrito está vacío' });
    }

    // Verificar que todos estén disponibles
    const noDisponible = items.find(i => i.estado_producto !== 'disponible');
    if (noDisponible) {
      await conn.rollback();
      return res.status(400).json({ mensaje: 'Uno o más productos ya no están disponibles' });
    }

    // Calcular total
    const total = items.reduce((sum, i) => sum + parseFloat(i.precio), 0);

    // Crear pedido
    const [pedido] = await conn.query(
      'INSERT INTO pedido (id_comprador, total, direccion_envio) VALUES (?,?,?)',
      [req.user.id, total, direccion_envio]
    );

    // Crear detalles y marcar productos como vendidos
    for (const item of items) {
      await conn.query(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, precio_unitario) VALUES (?,?,?)',
        [pedido.insertId, item.id_producto, item.precio]
      );
      await conn.query(
        "UPDATE producto SET estado_producto = 'vendido' WHERE id = ?",
        [item.id_producto]
      );
    }

    // Vaciar carrito
    await conn.query('DELETE FROM carrito WHERE id_usuario = ?', [req.user.id]);

    await conn.commit();
    res.status(201).json({ mensaje: 'Pedido creado', id: pedido.insertId, total });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error al crear el pedido' });
  } finally {
    conn.release();
  }
});

// GET /api/pedidos/mis-pedidos - Historial del cliente
router.get('/mis-pedidos', verifyToken, requireRol('cliente'), async (req, res) => {
  try {
    const [pedidos] = await pool.query(`
      SELECT p.*, GROUP_CONCAT(pr.titulo SEPARATOR ', ') AS productos
      FROM pedido p
      JOIN detalle_pedido dp ON dp.id_pedido = p.id
      JOIN producto pr       ON pr.id = dp.id_producto
      WHERE p.id_comprador = ?
      GROUP BY p.id
      ORDER BY p.fecha_pedido DESC
    `, [req.user.id]);
    res.json(pedidos);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/pedidos/mis-ventas - Pedidos recibidos del vendedor
router.get('/mis-ventas', verifyToken, requireRol('vendedor'), async (req, res) => {
  try {
    const [ventas] = await pool.query(`
      SELECT p.id, p.estado, p.total, p.fecha_pedido,
             u.nombre AS comprador, pr.titulo AS producto
      FROM pedido p
      JOIN detalle_pedido dp ON dp.id_pedido  = p.id
      JOIN producto pr       ON pr.id         = dp.id_producto
      JOIN usuario u         ON u.id          = p.id_comprador
      WHERE pr.id_vendedor = ?
      ORDER BY p.fecha_pedido DESC
    `, [req.user.id]);
    res.json(ventas);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// PATCH /api/pedidos/:id/estado - Cambiar estado (vendedor o admin)
router.patch('/:id/estado', verifyToken, requireRol('vendedor', 'admin'), async (req, res) => {
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(estado))
    return res.status(400).json({ mensaje: 'Estado inválido' });
  try {
    await pool.query('UPDATE pedido SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/pedidos - Todos los pedidos (solo admin)
router.get('/', verifyToken, requireRol('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.nombre AS comprador
      FROM pedido p JOIN usuario u ON u.id = p.id_comprador
      ORDER BY p.fecha_pedido DESC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;