console.log("✅ nocodb_verification server started!");

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

// DB 연결 풀 생성
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

  try {
    const conn = await pool.getConnection();

    const query = `
      SELECT * FROM ward_active_members 
      WHERE name = ? 
        AND REPLACE(mobile_phone_no, '-', '') = REPLACE(?, '-', '')
    `;

    const [rows] = await conn.execute(query, [피보호자_이름, 피보호자_연락처]);
    conn.release();

    if (rows.length > 0) {
      return res.json({ valid: true });
    } else {
      return res.json({ valid: false, message: "일치하는 회원 정보가 없습니다." });
    }

  } catch (error) {
    console.error("❌ DB 오류:", error);
    return res.status(500).json({ valid: false, message: "서버 오류 발생" });
  }
});

// 서버 실행
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));

