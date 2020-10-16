// This is identical to backend/server.js
// except we use port 3000 and can add dev only things

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.sendFile("./index.html", { root: "frontend/dist" });
});

// Start server on port 3000:
const port = 3000;
app.listen(port, function () {
  console.log("example dev-server listening on port" + port);
});
