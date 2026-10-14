const express = require('express');
const cors = require('cors');
const pool = require('./db');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Prueba de conexión
app.get('/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT now()');
    res.json({ app: 'TriboFit API', ok: true, time: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Crear usuario
app.post('/users', async (req, res) => {
  const { user_id, username, email } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO users (user_id, username, email) VALUES ($1, $2, $3) RETURNING *',
    [user_id, username, email]
  );
  res.status(201).json(rows[0]);
});

// Iniciar entrenamiento
app.post('/workouts', async (req, res) => {
  const { user_id } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO workouts (user_id) VALUES ($1) RETURNING *',
    [user_id]
  );
  res.status(201).json(rows[0]);
});

// Registrar una serie
app.post('/workouts/:id/logs', async (req, res) => {
  const { exercise_id, set_number, reps, weight } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO workout_logs (workout_id, exercise_id, set_number, reps, weight)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, exercise_id, set_number, reps, weight]
  );
  res.status(201).json(rows[0]);
});

// Terminar entrenamiento
app.patch('/workouts/:id/finish', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE workouts SET status = 'completed', end_time = now()
     WHERE workout_id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json(rows[0]);
});

// Crear grupo (el creador queda como admin)
app.post('/groups', async (req, res) => {
  const { group_name, user_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO groups (group_name) VALUES ($1) RETURNING *',
      [group_name]
    );
    await client.query(
      `INSERT INTO group_members (user_id, group_id, role) VALUES ($1, $2, 'admin')`,
      [user_id, rows[0].group_id]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Unirse a un grupo
app.post('/groups/:id/join', async (req, res) => {
  try {
    const { user_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO group_members (user_id, group_id) VALUES ($1, $2) RETURNING *',
      [user_id, req.params.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/feed', async (req, res) => {
  try {
    const { user_id } = req.query;
    const { rows } = await pool.query(
      `SELECT w.workout_id, u.username, w.start_time, w.end_time, w.status
       FROM workouts w
       JOIN users u ON u.user_id = w.user_id
       WHERE w.user_id IN (
         SELECT gm2.user_id
         FROM group_members gm1
         JOIN group_members gm2 ON gm1.group_id = gm2.group_id
         WHERE gm1.user_id = $1 AND gm2.user_id <> $1
       )
       AND (w.status = 'in_progress' OR w.start_time::date = CURRENT_DATE)
       ORDER BY w.start_time DESC`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/workouts/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.name AS exercise, l.set_number, l.reps, l.weight
       FROM workout_logs l
       JOIN exercise_catalog e ON e.exercise_id = l.exercise_id
       WHERE l.workout_id = $1
       ORDER BY e.name, l.set_number`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`TriboFit API en puerto ${PORT}`));