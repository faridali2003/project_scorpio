const fs=require("fs");
const p="C:/Users/ASUS/Documents/project_scorpio/backend/server.js";
let s=fs.readFileSync(p,"utf8");
console.log("read", s.length);
