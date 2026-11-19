const {
  VALID_PRODI,
  VALID_SKEMA,
  sendJson,
  readJsonBody,
  listPosts,
  insertPost,
} = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const posts = await listPosts();
      return sendJson(res, 200, {
        posts,
        meta: {
          prodiList: VALID_PRODI,
          skemaList: VALID_SKEMA,
        },
      });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await insertPost(body);
      return sendJson(res, 201, result);
    }

    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method tidak diizinkan.' });
  } catch (err) {
    const status = err.statusCode || 500;
    return sendJson(res, status, { error: err.message || 'Terjadi kesalahan server.' });
  }
};
