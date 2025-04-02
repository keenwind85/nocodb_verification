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

app.post("/valid", async (req, res) => {
  const { 피보호자_이름, 피보호자_연락처 } = req.body;

  if (!피보호자_이름 || !피보호자_연락처) {
    return res.status(400).json({ valid: false, message: "피보호자 이름이나 연락처가 없습니다." });
  }

  // DB에서 비교하는 로직
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute(
    "SELECT * FROM ward_active_members WHERE 피보호자_이름 = ? AND 피보호자_연락처 = ?",
    [피보호자_이름, 피보호자_연락처]
  );
  connection.end();

  if (rows.length > 0) {
    return res.json({ valid: true });
  } else {
    return res.json({ valid: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
