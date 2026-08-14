const http = require('http');
function get(path) {
  return new Promise((res) => {
    const req = http.get({ host: '127.0.0.1', port: 8140, path, timeout: 4000 }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    });
    req.on('timeout', () => { req.destroy(); res('TIMEOUT'); });
    req.on('error', e => res('ERR ' + e.message));
  });
}
(async () => {
  const app = await get('/app.js');
  const sw = await get('/sw.js');
  console.log('app_has_calcTotalBalance:', app.includes('function calcTotalBalance'));
  console.log('app_has_old_inline_sum:', app.includes('sum(phones, s => sum(s.apps, a => a.balance'));
  console.log('sw_has_v14:', sw.includes('money-app-v14'));
  console.log('sw_has_v13:', sw.includes('money-app-v13'));
})();
