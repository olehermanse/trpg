const express = require("express");
const app = express();

app.use(express.static("frontend/dist"));
app.use(express.static("frontend/dist/scripts"));

// Start server on port 3000:
const port = 3000;
app.listen(port, function () {
  console.log("towers dev-server listening on port " + port);
});
