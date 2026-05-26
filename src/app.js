const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',           require('./routes/auth.routes'));
app.use('/api/productos',      require('./routes/productos.routes'));
app.use('/api/categorias',     require('./routes/categorias.routes'));
app.use('/api/carrito',        require('./routes/carrito.routes'));
app.use('/api/pedidos',        require('./routes/pedidos.routes'));
app.use('/api/calificaciones', require('./routes/calificaciones.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);