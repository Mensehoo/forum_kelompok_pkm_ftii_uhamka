const { sendJson, readJsonBody, removePost } = require('../../../lib/supabase');

function extractId(req) {
  if (req.query && req.query.id) {
    return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  }
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const match = urlObj.pathname.match(/^\/api\/posts\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      return sendJson(res, 405, { error: 'Method tidak diizinkan.' });
    }

    const id = extractId(req);
    const body = await readJsonBody(req);
    const deletedId = await removePost(id, body);
    return sendJson(res, 200, { deletedId });
  } catch (err) {
    const status = err.statusCode || 500;
    return sendJson(res, status, { error: err.message || 'Terjadi kesalahan server.' });
  }
};
