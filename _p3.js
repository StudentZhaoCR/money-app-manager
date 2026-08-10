const http = require("http");
http.get("http://127.0.0.1:8140/app.js", { timeout: 5000 }, res => {
  let d = "";
  res.on("data", c => d += c);
  res.on("end", () => {
    console.log("status", res.statusCode);
    console.log("has_pickText", d.includes("function pickReadableTextColor"));
    console.log("has_color_in_attr", d.includes("color:${textColor}"));
  });
}).on("error", e => console.log("ERR", e.message));