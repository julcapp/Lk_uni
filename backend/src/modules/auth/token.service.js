const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken({ userId, projectId, sessionId }) {
  return jwt.sign(
    { sub: userId, projectId, sid: sessionId, typ: 'access' },
    requireSecret('JWT_ACCESS_SECRET'),
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  );
}

function signRefreshToken({ userId, projectId, sessionId }) {
  return jwt.sign(
    { sub: userId, projectId, sid: sessionId, typ: 'refresh', jti: crypto.randomUUID() },
    requireSecret('JWT_REFRESH_SECRET'),
    { expiresIn: process.env.JWT_REFRESH_TTL || '30d' },
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, requireSecret('JWT_ACCESS_SECRET'));
  if (payload.typ !== 'access') throw new Error('Invalid access token type');
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, requireSecret('JWT_REFRESH_SECRET'));
  if (payload.typ !== 'refresh') throw new Error('Invalid refresh token type');
  return payload;
}

function tokenExpiresAt(token) {
  const decoded = jwt.decode(token);
  return new Date(decoded.exp * 1000);
}

module.exports = {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  tokenExpiresAt,
};
