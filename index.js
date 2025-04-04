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
const baseName = 'poc0lvbq6jzglb1';
const tableId = 'mou0ayf479ho5i6';

app.post('/validate-ward', async (req, res) => {
  try {
    const record = req.body?.data?.rows?.[0];
    const { table_id, 피보호자_이름, 피보호자_연락처 } = record || {};

    if (!table_id) {
      console.error("❗ table_id 값이 없습니다.");
      return res.status(400).json({ error: 'table_id 값이 없습니다.' });
    }

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
      return res.status(200).json({ valid: true });
    } else {
      // 🚨 1단계: table_id로 NocoDB에서 레코드 조회(GET)
      const getUrl = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/records?where=(table_id,eq,${table_id})`;
      const getResp = await axios.get(getUrl, {
        headers: { 'xc-token': API_TOKEN }
      });

      if (!getResp.data || getResp.data.list.length === 0) {
        console.error("❗ NocoDB에서 레코드를 찾을 수 없습니다.");
        return res.status(404).json({ error: 'NocoDB에서 레코드를 찾을 수 없습니다.' });
      }

      // 실제 레코드의 UUID(id) 획득
      const actualRecordUUID = getResp.data.list[0].Id;

      // 🚨 2단계: 획득한 UUID를 사용하여 PATCH 요청
      const patchUrl = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/records/${actualRecordUUID}`;
      console.log("🚧 patchUrl 확인:", patchUrl);

      await axios.patch(
        patchUrl,
        { 경고_메시지: '[경고] 일치하지 않는 보호자 정보입니다.' },
        { headers: { 'xc-token': API_TOKEN, 'Content-Type': 'application/json' } }
      );

      return res.status(200).json({ valid: false, message: '일치하는 보호자 정보가 없습니다.' });
    }
  } catch (err) {
    console.error("❗ 서버 오류:", err.message || err);
    return res.status(500).json({ error: '내부 서버 오류 발생' });
  }
});

app.get('/test', (req, res) => {
  res.send('웹훅 서버가 정상 작동 중입니다.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
