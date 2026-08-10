const http = require("http");
function get(p) {
  return new Promise(r => http.get("http://127.0.0.1:8140" + p, { timeout: 5000 }, res => { let d=""; res.on("data",c=>d+=c); res.on("end",()=>r({status:res.statusCode,body:d})); }).on("error",e=>r({status:"ERR:"+e.message})).on("timeout",function(){this.destroy();r({status:"TIMEOUT"});}));
}
(async () => {
  const idx = await get("/");
  console.log("index", idx.status, "fontsLink", idx.body && idx.body.includes("Orbitron"), "fontCard", idx.body && idx.body.includes('global-font-selector'));
  const js = await get("/app.js");
  console.log("appjs", js.status, "GLOBAL_FONTS", js.body && js.body.includes("const GLOBAL_FONTS"), "applyGlobalFont", js.body && js.body.includes("function applyGlobalFont"), "onAccentCustomInput", js.body && js.body.includes("function onAccentCustomInput"));
  const sw = await get("/sw.js");
  console.log("sw", sw.status, "v11", sw.body && sw.body.includes("money-app-v11"));
})();
