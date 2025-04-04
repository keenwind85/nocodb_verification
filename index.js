const express = require('express');
const app = express();

app.use(express.json());

app.get('/test', (req, res) => {
  res.send('✅ 웹훅 서버가 정상 작동 중입니다.');
});

app.post('/validate-ward', (req, res) => {
  console.log("👉 validate-ward 호출됨!");
  console.log("📦 payload:", JSON.stringify(req.body, null, 2));
  res.status(200).json({ msg: "✅ validate-ward OK" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
