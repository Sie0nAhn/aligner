/**
 * 로컬 테스트용 서버 (배포에는 필요 없음)
 *
 *   YMOVE_API_KEY=ym_... node dev-server.js
 *   → http://localhost:8077
 *
 * 정적 파일을 서빙하면서 /api/ymove 를 netlify/functions/ymove.js 로 넘겨줍니다.
 * 실제 배포 시 쓰이는 함수 코드를 그대로 태우기 때문에, 여기서 되면 배포에서도 됩니다.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const fn = require('./netlify/functions/ymove.js');

const ROOT = __dirname;
const PORT = process.env.PORT || 8077;
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json', '.svg':'image/svg+xml'
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/ymove' || u.pathname === '/.netlify/functions/ymove') {
    const q = {}; u.searchParams.forEach((v, k) => q[k] = v);
    const r = await fn.handler({ queryStringParameters: q });
    res.writeHead(r.statusCode, r.headers);
    return res.end(r.body);
  }
  const p = path.join(ROOT, u.pathname === '/' ? '/index.html' : u.pathname);
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(b);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (YMOVE_API_KEY ${process.env.YMOVE_API_KEY ? '설정됨' : '없음 — 시안 이미지로 폴백됩니다'})`));
