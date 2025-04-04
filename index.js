const express = require('express');
const app = express();

app.use(express.json());

app.get('/test', (req, res) => {
  res.send('✅ 웹훅 서버가 정상 작동 중입니다.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
