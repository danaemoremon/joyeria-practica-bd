// Archivo: server.js
// Stack: Node.js (Express) + PostgreSQL (pg) + Supabase

const express = require('express');
const { Pool } = require('pg');
const path = require('path'); // Módulo para trabajar con rutas de archivos
require('dotenv').config(); // Carga las variables del .env

// 1. DEFINICIÓN DEL PUERTO
// Usa la variable de entorno PORT (que Render proporciona) o 3000 si no está definida.
const PORT = process.env.PORT || 3000;

// Inicialización de Express
const app = express();

// Middlewares
app.use(express.json()); // Permite a Express leer JSON en las peticiones POST/PUT

// 2. CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS (Supabase)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // *** CONFIGURACIÓN SSL CRÍTICA PARA RENDER/SUPABASE ***
    ssl: {
        rejectUnauthorized: false 
    }
});

// Mensaje de diagnóstico para los logs de Render
pool.connect()
    .then(client => {
        console.log('Conexión exitosa a Supabase. Hora de la DB:', new Date().toISOString());
        client.release();
    })
    .catch(err => {
        // Muestra este error en los logs si falla la conexión
        console.error('ERROR al conectar a Supabase. Revisa tu DATABASE_URL:', err.message);
    });

// -----------------------------------------------------------
// 3. RUTAS DE LA API (CRUD)
// -----------------------------------------------------------

// RUTA GET ALL (READ) - Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error al obtener productos:", err.message);
        res.status(500).json({ error: 'Error al consultar la base de datos.' });
    }
});

// RUTA POST (CREATE) - Añadir un nuevo producto
app.post('/api/productos', async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    try {
        const query = 'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [nombre, descripcion, precio, stock];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]); // 201 Created
    } catch (err) {
        console.error("Error al crear producto:", err.message);
        res.status(500).json({ error: 'Error al añadir producto en la base de datos.' });
    }
});

// RUTA PUT (UPDATE) - Actualizar un producto por ID
app.put('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;
    try {
        const query = 'UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, stock=$4 WHERE id=$5 RETURNING *';
        const values = [nombre, descripcion, precio, stock, id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Error al actualizar producto:", err.message);
        res.status(500).json({ error: 'Error al actualizar el producto en la base de datos.' });
    }
});

// RUTA DELETE (DELETE) - Eliminar un producto por ID
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado para eliminar.' });
        }
        res.status(204).send(); // 204 No Content
    } catch (err) {
        console.error("Error al eliminar producto:", err.message);
        res.status(500).json({ error: 'Error al eliminar el producto de la base de datos.' });
    }
});

// -----------------------------------------------------------
// 4. RUTA PARA SERVIR EL FRONTEND (index.html)
// DEBE IR DESPUÉS DE TODAS LAS RUTAS /api/...
// -----------------------------------------------------------

// Resuelve el error "Cannot GET /" sirviendo el archivo index.html en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// -----------------------------------------------------------
// 5. INICIO DEL SERVIDOR
// -----------------------------------------------------------
app.listen(PORT, () => {
    console.log(Servidor de Joyería corriendo en http://localhost:${PORT});
});
