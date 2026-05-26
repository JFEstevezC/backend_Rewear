const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requireRol } = require('../middleware/auth');

// ⚠️ Rutas específicas SIEMPRE antes de /:id

// GET /api/productos/mis-productos
router.get('/mis-productos', verifyToken, requireRol('vendedor'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM producto p
      JOIN categoria c ON p.id_categoria = c.id
      WHERE p.id_vendedor = ?
      ORDER BY p.fecha_publicacion DESC
    `, [req.user.id]);
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/productos/admin/todos
router.get('/admin/todos', verifyToken, requireRol('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre, u.nombre AS vendedor_nombre
      FROM producto p
      JOIN categoria c ON p.id_categoria = c.id
      JOIN usuario u   ON p.id_vendedor  = u.id
      ORDER BY p.fecha_publicacion DESC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/productos - Listar con filtros (público)
router.get('/', async (req, res) => {
  const { categoria, talla, precio_min, precio_max, buscar } = req.query;
  try {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre, u.nombre AS vendedor_nombre
      FROM producto p
      JOIN categoria c ON p.id_categoria = c.id
      JOIN usuario u   ON p.id_vendedor  = u.id
      WHERE p.estado_producto = 'disponible' AND p.aprobado = true
    `;
    const params = [];
    if (categoria)  { query += ' AND p.id_categoria = ?'; params.push(categoria); }
    if (talla)      { query += ' AND p.talla = ?';        params.push(talla); }
    if (precio_min) { query += ' AND p.precio >= ?';      params.push(precio_min); }
    if (precio_max) { query += ' AND p.precio <= ?';      params.push(precio_max); }
    if (buscar)     { query += ' AND p.titulo LIKE ?';    params.push(`%${buscar}%`); }
    query += ' ORDER BY p.fecha_publicacion DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// GET /api/productos/:id - Ver detalle (público)
router.get('/:id', async (req, res) => {
  try {
    const [[producto]] = await pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre, u.nombre AS vendedor_nombre
      FROM producto p
      JOIN categoria c ON p.id_categoria = c.id
      JOIN usuario u   ON p.id_vendedor  = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (!producto)
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// POST /api/productos - Crear (solo vendedor)
router.post('/', verifyToken, requireRol('vendedor'), async (req, res) => {
  const { titulo, descripcion, precio, talla, imagen_url, id_categoria } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO producto (titulo, descripcion, precio, talla, imagen_url, id_categoria, id_vendedor)
       VALUES (?,?,?,?,?,?,?)`,
      [titulo, descripcion, precio, talla, imagen_url, id_categoria, req.user.id]
    );
    res.status(201).json({ mensaje: 'Producto creado', id: result.insertId });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// PUT /api/productos/:id - Editar
router.put('/:id', verifyToken, requireRol('vendedor'), async (req, res) => {
  const { titulo, descripcion, precio, talla, imagen_url, id_categoria } = req.body;
  try {
    const [[prod]] = await pool.query('SELECT id_vendedor FROM producto WHERE id = ?', [req.params.id]);
    if (!prod) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    if (prod.id_vendedor !== req.user.id)
      return res.status(403).json({ mensaje: 'No puedes editar este producto' });
    await pool.query(
      `UPDATE producto SET titulo=?, descripcion=?, precio=?, talla=?, imagen_url=?, id_categoria=? WHERE id=?`,
      [titulo, descripcion, precio, talla, imagen_url, id_categoria, req.params.id]
    );
    res.json({ mensaje: 'Producto actualizado' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// DELETE /api/productos/:id
router.delete('/:id', verifyToken, requireRol('vendedor', 'admin'), async (req, res) => {
  try {
    const [[prod]] = await pool.query('SELECT id_vendedor FROM producto WHERE id = ?', [req.params.id]);
    if (!prod) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    if (req.user.rol !== 'admin' && prod.id_vendedor !== req.user.id)
      return res.status(403).json({ mensaje: 'No puedes eliminar este producto' });
    await pool.query('DELETE FROM producto WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// PATCH /api/productos/:id/aprobar
router.patch('/:id/aprobar', verifyToken, requireRol('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE producto SET aprobado = true WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto aprobado' });
  } catch {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

module.exports = router;