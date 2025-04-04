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
const baseName = 'poc0lvbq6jzglb1';   // Base ID
const tableId = 'mou0ayf479ho5i6';    // Table ID (주의: 이름 아님!)

app.get('/test', (req, res) => {
  res.send('✅ 웹훅 서버가 정상 작동 중입니다.');
});


app.get('/columns', async (req, res) => {
  const url = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/columns`;
  const result = await axios.get(url, {
    headers: { 'xc-token': API_TOKEN }
  });
  res.json(result.data);
});



app.post('/validate-ward', async (req, res) => {
  try {
    console.log("👉 웹훅 요청 본문:", JSON.stringify(req.body, null, 2));

    const record = req.body?.data?.rows?.[0];
    const { table_id, 피보호자_이름, 피보호자_연락처 } = record || {};

    if (!table_id) {
      console.error("❗ table_id 값이 없습니다.");
      return res.status(400).json({ error: 'table_id 값이 없습니다.' });
    }

    if (!피보호자_이름 || !피보호자_연락처) {
      return res.status(200).json({ valid: true }); // 정보 없으면 통과
    }

    // 보호자 정보 확인
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM ward_active_members WHERE name = ? AND mobile_phone_no = ?',
      [피보호자_이름, 피보호자_연락처]
    );
    await connection.end();

    if (rows.length > 0) {
      console.log("✅ 보호자 정보 일치");
      return res.status(200).json({ valid: true });
    }

    // 정보 불일치 → NocoDB 레코드 수정
    const getUrl = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/records?where=(table_id,eq,${table_id})`;
    const getResp = await axios.get(getUrl, {
      headers: { 'xc-token': API_TOKEN }
    });

    if (!getResp.data || getResp.data.list.length === 0) {
      console.error("❗ NocoDB에서 레코드를 찾을 수 없습니다.");
      return res.status(404).json({ error: '레코드 없음' });
    }

    const actualRecordUUID = getResp.data.list[0].id;

    const patchUrl = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/records/${actualRecordUUID}`;
    console.log("🚧 patchUrl 확인:", patchUrl);

    await axios.patch(
      patchUrl,
      { 경고_메시지: '[경고] 일치하지 않는 보호자 정보입니다.' },
      {
        headers: {
          'xc-token': API_TOKEN,
          'Content-Type': 'application/json',
        }
      }
    );

    return res.status(200).json({ valid: false, message: '일치하는 보호자 정보가 없습니다.' });

  } catch (err) {
    console.error("❗ 서버 오류:", err.message || err);
    return res.status(500).json({ error: '내부 서버 오류 발생' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
