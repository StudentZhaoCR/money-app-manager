const http = require('http');
function get(path) {
  return new Promise((res) => {
    const req = http.get({ host: '127.0.0.1', port: 8140, path, timeout: 5000 }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, len: d.length, head: d.slice(0, 60) }));
    });
    req.on('timeout', () => { req.destroy(); res({ status: 'TIMEOUT', len: 0, head: '' }); });
    req.on('error', e => res({ status: 'ERR', len: 0, head: e.message }));
  });
}
(async () => {
  const r = await get('/sw.js');
  console.log('sw.js =>', JSON.stringify(r));
  const a = await get('/app.js');
  console.log('app.js status/len =>', r.status, a.len);
  console.log('app.js head =>', JSON.stringify(a.head));
})();
