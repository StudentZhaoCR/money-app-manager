const http = require("http");
const req = http.get("http://127.0.0.1:8140/", { timeout: 4000 }, res => {
  let d = "";
  res.on("data", c => d += c);
  res.on("end", () => {
    console.log("STATUS", res.statusCode);
    console.log("HAS_FONT_LINK", d.includes("fonts.googleapis"));
    console.log("LEN", d.length);
  });
});
req.on("timeout", () => { console.log("TIMEOUT"); req.destroy(); });
req.on("error", e => console.log("ERR", e.message));
