const express = require("express");
const app = express();

process.on('SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  // some other closing procedures go here
  process.exit(0);
});

app.use(express.static("dist"));

// Start server on port 3000:
const port = 3000;
app.listen(port, function () {
  console.log("tpg dev-server listening on port " + port);
});
