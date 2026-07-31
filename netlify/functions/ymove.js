/**
 * YMove Exercise API 프록시 (Netlify용 — /.netlify/functions/ymove)
 *
 * API 키는 Netlify 대시보드 → Site settings → Environment variables 에
 * YMOVE_API_KEY 로 넣습니다. 코드나 저장소에 키를 두지 마세요.
 */

const BASE = 'https://exercise-api.ymove.app/api/v2';

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
    } catch (_) {}
  }));
  return out;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=600'
  };
  // 영상 URL 만료(48h)로 재생이 실패했을 때 클라이언트가 ?refresh=1 로 강제 갱신.
  // 남용 방지를 위해 60초에 한 번만 허용.
  const wantRefresh = !!(event && event.queryStringParameters && event.queryStringParameters.refresh);
  if (wantRefresh && Date.now() - cache.at > 60 * 1000) cache = { at: 0, data: null };
  try {
    if (!cache.data || Date.now() - cache.at >= TTL) {
      const key = process.env.YMOVE_API_KEY;
      if (!key) throw new Error('YMOVE_API_KEY 환경변수가 설정되지 않았습니다.');
      cache = { at: Date.now(), data: await fetchAll(key) };
    }
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ ok: true, poses: cache.data, fetchedAt: new Date().toISOString() })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: String(e.message || e) }) };
  }
};
