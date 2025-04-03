console.log("✅ nocodb_verification server started!");

const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const app = express();
app.use(express.json());

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// NocoDB 설정
const NOCODB_URL = process.env.NOCODB_URL;
const API_TOKEN = process.env.API_TOKEN;

app.post('/validate-ward', async (req, res) => {
  try {
    console.log("✅ 받은 데이터:", JSON.stringify(req.body, null, 2));

    const record = req.body?.data?.rows?.[0];
    const recordId = req.body?.id; // UUID
    const tablePrimaryKey = record?.table_id; // 실제 레코드 ID

    console.log("📌 PATCH 대상 record UUID:", recordId);
    console.log("📌 NocoDB 레코드 기본키(table_id):", tablePrimaryKey);

    if (!record) return res.status(400).json({ valid: false, message: '레코드 없음' });

    const { 피보호자_이름, 피보호자_연락처 } = record;

    if (!피보호자_이름 || !피보호자_연락처) {
      return res.status(200).json({ valid: true });
    }

    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM ward_active_members WHERE name = ? AND mobile_phone_no = ?',
      [피보호자_이름, 피보호자_연락처]
    );
    await connection.end();

    if (rows.length > 0) {
      console.log("✅ 검증 성공: DB에 일치하는 보호자 정보 있음");
      return res.status(200).json({ valid: true });
    } else {
      console.log("❌ 검증 실패: DB에 일치하는 보호자 정보 없음");

      await axios.patch(
        `${NOCODB_URL}/api/v2/tables/mou0ayf479ho5i6/records/${tablePrimaryKey}`, // 여기 주의
        {
          경고_메시지: '[경고] 일치하지 않는 보호자 정보입니다.',
        },
        {
          headers: {
            'xc-token': API_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      return res.status(200).json({
        valid: false,
        message: '일치하는 보호자 정보가 없습니다.',
      });
    }
  } catch (err) {
    console.error("❗ 서버 오류:", err);
    return res.status(500).json({ error: '내부 서버 오류 발생' });
  }
});

app.get('/test', (req, res) => {
  res.send('웹훅 서버가 정상 작동 중입니다.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
