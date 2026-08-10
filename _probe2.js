const http = require("http");
function get(path) {
  return new Promise(resolve => {
    http.get("http://127.0.0.1:8140" + path, { timeout: 6000 }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    }).on("timeout", function () { this.destroy(); resolve({ status: "TIMEOUT" }); })
      .on("error", e => resolve({ status: "ERR:" + e.message }));
  });
}
(async () => {
  const idx = await get("/");
  console.log("index status", idx.status, "hasTab", idx.body && idx.body.includes('data-page="coin-earnings"'), "hasPage", idx.body && idx.body.includes('page-coin-earnings'));
  const js = await get("/app.js");
  console.log("appjs status", js.status, "hasRender", js.body && js.body.includes("function renderCoinEarningsPage"), "len", js.body && js.body.length);
  const sw = await get("/sw.js");
  console.log("sw status", sw.status, "v8", sw.body && sw.body.includes("money-app-v8"));
})();
