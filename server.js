// Archivo: server.js
// Stack: Node.js (Express) + PostgreSQL (pg) + Supabase

const express = require('express');
const { Pool } = require('pg'); 
const dotenv = require('dotenv');

// Carga las variables de entorno (DATABASE_URL) desde .env
dotenv.config(); 

const app = express();
const port = process.env.PORT || 3000;

// CONFIGURACIÓN DE CONEXIÓN A SUPABASE (PostgreSQL)
// ⚠️ IMPORTANTE: El bloque SSL es NECESARIO para que Render se conecte a Supabase.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false 
    }
});

// --- MIDDLEWARE ---
app.use(express.json()); // Permite al servidor leer cuerpos de peticiones JSON (para POST/PUT)
app.use(express.urlencoded({ extended: true })); // Permite leer datos de formularios


// =========================================================
//                  RUTAS CRUD (PASO 7)
// =========================================================

// 1. LEER TODOS LOS PRODUCTOS (READ - GET)
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error al obtener productos:", err);
        res.status(500).json({ error: 'Error al consultar la base de datos.' });
    }
});

// 2. CREAR UN NUEVO PRODUCTO (CREATE - POST)
app.post('/api/productos', async (req, res) => {
    // Campos necesarios según tu esquema SQL
    const { nombre, tipo_producto, costo_venta, cantidad_disponible, proveedor_id, material } = req.body;
    
    // Verificación básica de datos (ejemplo: nombre y costo son obligatorios)
    if (!nombre || !costo_venta) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: nombre y costo_venta.' });
    }

    try {
        const sql = `
            INSERT INTO productos (nombre, tipo_producto, costo_venta, cantidad_disponible, proveedor_id, material)
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *;
        `;
        const result = await pool.query(sql, [nombre, tipo_producto, costo_venta, cantidad_disponible, proveedor_id, material]);
        res.status(201).json(result.rows[0]); // 201 Created
    } catch (err) {
        console.error("Error al crear producto:", err);
        // Devuelve 500 y detalles del error (como violación de FOREIGN KEY)
        res.status(500).json({ error: 'Error al crear el producto.', details: err.message });
    }
});

// 3. ACTUALIZAR UN PRODUCTO (UPDATE - PUT)
app.put('/api/productos/:id', async (req, res) => {
    const { id } = req.params; // ID viene de la URL (ej: /api/productos/5)
    // Solo permitimos actualizar estos campos en este ejemplo
    const { nombre, costo_venta, cantidad_disponible } = req.body; 
    
    try {
        const sql = `
            UPDATE productos 
            SET nombre = $1, costo_venta = $2, cantidad_disponible = $3
            WHERE id = $4
            RETURNING *;
        `;
        const result = await pool.query(sql, [nombre, costo_venta, cantidad_disponible, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado para actualizar.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Error al actualizar producto:", err);
        res.status(500).json({ error: 'Error al actualizar el producto.', details: err.message });
    }
});

// 4. ELIMINAR UN PRODUCTO (DELETE - DELETE)
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = 'DELETE FROM productos WHERE id = $1 RETURNING *;';
        const result = await pool.query(sql, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Producto eliminado correctamente.', id_eliminado: result.rows[0].id });
    } catch (err) {
        console.error("Error al eliminar producto:", err);
        res.status(500).json({ error: 'Error al eliminar el producto.', details: err.message });
    }
});


// =========================================================
//                  INICIO DEL SERVIDOR
// =========================================================
app.listen(port, () => {
    console.log(`Servidor de Joyería corriendo en http://localhost:${port}`);
    
    // Prueba de conexión al iniciar (mostrará ETIMEOUT, pero confirma que el código es válido)
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            // Este es el error ETIMEOUT/bloqueo que esperamos localmente.
            console.error('❌ Error al conectar a Supabase. (Este error es esperado por bloqueo de firewall, continuaremos con el despliegue en Render).', err.code);
        } else {
            console.log('✅ Conexión exitosa a Supabase. Hora de la DB:', res.rows[0].now);
        }
    });
});