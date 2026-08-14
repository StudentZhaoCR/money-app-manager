const http = require('http');
function get(path) {
  return new Promise((res) => {
    const req = http.get({ host: '127.0.0.1', port: 8140, path, timeout: 5000 }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    });
    req.on('timeout', () => { req.destroy(); res(''); });
    req.on('error', () => res(''));
  });
}
(async () => {
  const sw = await get('/sw.js');
  const app = await get('/app.js');
  console.log('SW v14:', sw.includes('money-app-v14'));
  console.log('app calcTotalBalance:', app.includes('function calcTotalBalance'));
  console.log('app old inline sum gone:', !app.includes('sum(phones, s => sum(s.apps, a => a.balance'));
  console.log('app len:', app.length);
})();
