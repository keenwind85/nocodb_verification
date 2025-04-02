console.log("✅ nocodb_verification server started!");

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

app.post('/validate', async (req, res) => {
  const { name, phone, table } = req.body;
  if (!name || !phone || !table) return res.status(400).json({ error: 'Missing fields' });

  const phoneCleaned = phone.replace(/-/g, '');
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM \`${table}\` WHERE name = ? AND REPLACE(mobile_phone_no, '-', '') = ?`,
      [name, phoneCleaned]
    );

    res.json({ valid: rows[0].count > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB query error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
