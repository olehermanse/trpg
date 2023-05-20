import express from "express";
const app = express();

app.use(express.static("dist"));

// Start server on port 80:
const port = 80;
app.listen(port, function () {
  console.log("tpg dev-server listening on port " + port);
});
