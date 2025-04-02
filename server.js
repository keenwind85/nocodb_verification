const express = require("express");
const mysql = require("mysql2/promise");
const app = express();

app.use(express.json());

const db = mysql.createPool({
  host: "YOUR_DB_HOST",
  user: "YOUR_DB_USER",
  password: "YOUR_DB_PASSWORD",
  database: "YOUR_DB_NAME"
});

app.post("/validate-member", async (req, res) => {
  const { name, phone } = req.body.data;
  const cleanedPhone = phone.replace(/-/g, "");

  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM member WHERE name = ? AND REPLACE(mobile_phone_no, '-', '') = ?`,
    [name, cleanedPhone]
  );

  if (rows[0].cnt > 0) {
    return res.sendStatus(200); // 통과
  } else {
    return res.status(400).send("회원 정보가 없습니다"); // 실패
  }
});

app.listen(3000, () => {
  console.log("🚀 API 서버가 3000번 포트에서 실행 중!");
});
