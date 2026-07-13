const { verifyAccessToken } = require('./token.service');

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED', error: 'Требуется авторизация' });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, code: 'INVALID_TOKEN', error: 'Сессия недействительна' });
  }
}

module.exports = { authenticate };
