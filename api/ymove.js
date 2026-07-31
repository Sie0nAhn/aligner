/**
 * YMove Exercise API 프록시 (Vercel용 — /api/ymove)
 *
 * API 키는 이 파일이 아니라 배포 환경변수 YMOVE_API_KEY 에 넣습니다.
 * 브라우저에는 키가 아니라, 이미 서명된 임시 영상/썸네일 URL만 내려갑니다.
 *
 * YMove 영상 URL은 48시간 뒤 만료되므로 캐시는 30분만 유지합니다.
 */

const BASE = 'https://exercise-api.ymove.app/api/v2';

// 이 프로토타입이 쓰는 자세만 허용 (남이 우리 프록시로 API를 긁는 것 방지)
const SLUGS = [
  'camel-pose', 'wheel-pose', 'bow-pose', 'boat-pose', 'side-plank-pose-right',
  'half-boat-pose', 'bridge-pose', 'garland-pose', 'fire-log-pose-right',
  'cat-cow-pose', 'tiger-pose-right', 'plank-pose', 'low-lunge-right', 'downward-dog'
];

const TTL = 30 * 60 * 1000;
let cache = { at: 0, data: null };

async function fetchAll(key) {
  const out = {};
  await Promise.all(SLUGS.map(async slug => {
    try {
      const r = await fetch(`${BASE}/exercises/${slug}`, { headers: { 'X-API-Key': key } });
      if (!r.ok) return;
      const j = await r.json();
      const e = j.data || j;
      if (!e || !e.slug) return;
      out[slug] = {
        title: e.title,
        thumb: e.thumbnailUrl || null,
        video: e.videoUrl || null,
        hls: e.videoHlsUrl || null,
        muscle: e.muscleGroup || null,
        difficulty: e.difficulty || null,
        instructions: e.instructions || [],
        points: e.importantPoints || []
      };
    } catch (_) { /* 개별 실패는 무시하고 나머지는 내려보냄 */ }
  }));
  return out;
}

async function getData() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const key = process.env.YMOVE_API_KEY;
  if (!key) throw new Error('YMOVE_API_KEY 환경변수가 설정되지 않았습니다.');
  const data = await fetchAll(key);
  cache = { at: Date.now(), data };
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=600');
  // 영상 URL 만료(48h)로 재생 실패 시 클라이언트가 ?refresh=1 로 강제 갱신 (60초에 1회)
  const wantRefresh = req && req.query && req.query.refresh;
  if (wantRefresh && Date.now() - cache.at > 60 * 1000) cache = { at: 0, data: null };
  try {
    const data = await getData();
    res.status(200).json({ ok: true, poses: data, fetchedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};
module.exports.SLUGS = SLUGS;
