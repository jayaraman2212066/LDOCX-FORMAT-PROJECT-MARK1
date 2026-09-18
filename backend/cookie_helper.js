// Secure Cookie Helper for Session Management
// Enforces HttpOnly, Secure, SameSite=Lax, and Path=/

function getCookie(req, name) {
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function getAuthTokenFromReq(req) {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers?.['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Check HttpOnly cookie
  return getCookie(req, 'ldoc_token');
}

function setAuthCookie(res, token, maxAgeSeconds = 86400) {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const secureFlag = isProd ? '; Secure' : '';
  const cookieVal = `ldoc_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secureFlag}`;

  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookieVal);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieVal]);
  } else {
    res.setHeader('Set-Cookie', [existing, cookieVal]);
  }
}

function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const secureFlag = isProd ? '; Secure' : '';
  const cookieVal = `ldoc_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`;

  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookieVal);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieVal]);
  } else {
    res.setHeader('Set-Cookie', [existing, cookieVal]);
  }
}

module.exports = {
  getCookie,
  getAuthTokenFromReq,
  setAuthCookie,
  clearAuthCookie
};
