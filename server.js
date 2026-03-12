const express = require('express');
const https = require('https');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const NAVER_CLIENT_ID = '6cm1gapanx';
const NAVER_CLIENT_SECRET = 'OLAyKEvVWAql2QCy5HEY2HP3sC9MvlfP4Z6DtmBn';

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'naver-walk-nav.html'));
});

let currentLocation = null;

app.post('/api/location', (req, res) => {
  const { lat, lng, accuracy, timestamp } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, error: 'lat, lng 값이 필요합니다.' });
  }
  currentLocation = {
    lat, lng,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
    updatedAt: new Date().toISOString()
  };
  console.log('📍 위치 업데이트:', currentLocation);
  res.json({ success: true, location: currentLocation });
});

app.get('/api/location', (req, res) => {
  if (!currentLocation) return res.json({ success: false, message: '아직 위치 없음' });
  res.json({ success: true, location: currentLocation });
});

app.get('/api/directions', (req, res) => {
  const { start, goal } = req.query;
  if (!start || !goal) return res.status(400).json({ error: 'start, goal 파라미터가 필요합니다.' });

  const reqPath = '/map-direction/v1/driving?start=' + encodeURIComponent(start) + '&goal=' + encodeURIComponent(goal) + '&option=traoptimal';
  console.log('📡 경로 요청 URL:', reqPath);

  const options = {
    hostname: 'maps.apigw.ntruss.com',
    path: reqPath,
    method: 'GET',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
      'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      console.log('📨 응답 코드:', proxyRes.statusCode);
      console.log('📨 응답 내용:', data.slice(0, 300));
      res.setHeader('Content-Type', 'application/json');
      res.status(proxyRes.statusCode || 200).send(data);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('오류:', e);
    res.status(500).json({ error: '서버 오류' });
  });

  proxyReq.end();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NavWalk server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ NavWalk 서버 실행 중 http://localhost:' + PORT);
});
