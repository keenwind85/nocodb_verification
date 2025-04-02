console.log("✅ nocodb_verification server started!");

// Node.js Express 서버 예제 코드
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// MySQL 연결 설정
const dbConfig = {
  host: 'ssm-production.ctwog2ayi6l4.ap-northeast-2.rds.amazonaws.com',
  user: 'admin_view',
  password: 'password',
  database: 'ssm'
};

// NocoDB API 설정
const NOCODB_URL = 'https://nocodb-railway-production-0ba7.up.railway.app';
const API_TOKEN = 'rcV35wXwokAY5UgGbcwcIJQCvRqeOrtQXmFIAeYM';

// 웹훅 엔드포인트 - NocoDB의 "before update" 웹훅으로 설정
app.post('/validate-ward', async (req, res) => {
  try {
    console.log('받은 데이터:', req.body);
    
    // NocoDB에서 전송된 데이터 추출
    const { 피보호자_이름, 피보호자_연락처 } = req.body.data;
    const recordId = req.body.data.id;
    
    // 값이 변경되지 않았다면 검증 스킵
    if (!피보호자_이름 || !피보호자_연락처) {
      return res.status(200).send({ valid: true });
    }
    
    // MySQL 연결 및 검증
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM ward_active_members WHERE name = ? AND mobile_phone_no = ?',
      [피보호자_이름, 피보호자_연락처]
    );
    
    await connection.end();
    
    // 검증 결과 확인
    const isValid = rows && rows.length > 0;
    
    if (isValid) {
      // 유효한 데이터면 승인
      console.log('검증 성공: 일치하는 피보호자 정보 찾음');
      return res.status(200).send({ valid: true });
    } else {
      // 유효하지 않은 데이터면 롤백
      console.log('검증 실패: 일치하는 피보호자 정보 없음');
      
      // NocoDB API를 통해 레코드 업데이트 (필드 초기화)
      await axios({
        method: 'patch',
        url: `${NOCODB_URL}/api/v2/tables/Matching_request/records/${recordId}`,
        headers: {
          'xc-token': API_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          피보호자_이름: null,
          피보호자_연락처: null
        }
      });
      
      return res.status(200).send({
        valid: false,
        message: '일치하는 피보호자 정보가 없습니다. 입력이 취소되었습니다.'
      });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send({ error: '서버 오류 발생' });
  }
});

// 웹훅 테스트용 엔드포인트
app.get('/test', (req, res) => {
  res.send('웹훅 서버가 정상 작동 중입니다.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
