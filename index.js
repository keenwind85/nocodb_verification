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
const tableId = 'm9wf5k21uzgur76';

// 헬스체크
app.get('/test', (req, res) => {
  res.send('✅ 웹훅 서버가 정상 작동 중입니다.');
});

// 컬럼 확인용 라우트 (선택)
app.get('/columns', async (req, res) => {
  try {
    const url = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/columns`;
    const result = await axios.get(url, {
      headers: { 'xc-token': API_TOKEN }
    });
    res.json(result.data);
  } catch (err) {
    console.error("❗ columns 조회 실패:", err.message);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

// 웹훅 처리 라우트
app.post('/validate-ward', async (req, res) => {
  try {
    console.log("👉 웹훅 요청 본문:", JSON.stringify(req.body, null, 2));

    const record = req.body?.data?.rows?.[0];
    console.log("📌 레코드 키 목록:", Object.keys(record));
    const { id, ward_name, ward_phone } = record || {};

    if (!id) {
      console.error("❗ id 값이 없습니다.");
      return res.status(400).json({ error: 'id 값이 없습니다.' });
    }

    if (!ward_name || !ward_phone) {
      console.warn("⛔ ward_name 또는 ward_phone 누락 → 검증 생략");
      return res.status(200).json({ valid: true });
    }

    // 보호자 정보 확인
    const connection = await mysql.createConnection(dbConfig
