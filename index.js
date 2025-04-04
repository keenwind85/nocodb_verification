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
      return res.status(200).json({ valid: true }); // 정보 없을 경우 그냥 통과
    }

    // MySQL 연결해서 보호자 정보 확인
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

    // ❌ 일치하지 않을 경우 - PATCH로 경고 메시지 입력
    const getUrl = `${NOCODB_URL}/api/v2/tables/${baseName}/${tableId}/records?where=(table_id,eq,${table_id})`;
    const getResp = await axios.get(getUrl, {
      headers: { 'xc-token': API_TOKEN }
    });

    if (!getResp.data || getResp.data.list.length === 0) {
      console.error("❗ NocoDB에서 레코드를 찾을 수 없습니다.");
      return res.status(404).json({ error: '레코드 없음' });
    }

    const actualRecordUUID = getResp.data.list[0].id; // 🔥 중요: 소문자 id

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
