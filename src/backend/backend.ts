// Start listening on port 3000 of localhost.
const server = Deno.listen({ port: 3000 });
console.log("Backend running on http://localhost:3000/");

for await (const conn of server) {
  handleHttp(conn).catch(console.error);
}

async function handleHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    // Use the request pathname as filepath
    const url = new URL(requestEvent.request.url);
    let filepath = decodeURIComponent(url.pathname);

    if (
      !filepath.startsWith("/") ||
      filepath.includes("..") ||
      filepath.includes("//") ||
      filepath.includes(" ") ||
      filepath.includes(";") ||
      filepath.includes(",") ||
      filepath.includes("'") ||
      filepath.includes('"') ||
      filepath.includes("*")
    ) {
      const notFoundResponse = new Response("404 Not Found", { status: 404 });
      await requestEvent.respondWith(notFoundResponse);
    }

    if (filepath === "/") {
      filepath = "/index.html";
    }

    let headers = {};
    if (filepath === "/index.html") {
      headers["content-type"] = "text/html";
    } else if (filepath === "/favicon.ico") {
      headers["content-type"] = "image/x-icon";
    } else if (filepath.endsWith(".js")) {
      headers["content-type"] = "application/javascript";
    } else if (filepath.endsWith(".css")) {
      headers["content-type"] = "text/css";
    } else {
      const notFoundResponse = new Response("404 Not Found", { status: 404 });
      await requestEvent.respondWith(notFoundResponse);
    }

    // Try opening the file
    let file;
    try {
      file = await Deno.open(`./dist${filepath}`, { read: true });
    } catch {
      // If the file cannot be opened, return a "404 Not Found" response
      const notFoundResponse = new Response("404 Not Found", { status: 404 });
      await requestEvent.respondWith(notFoundResponse);
      continue;
    }

    // Build a readable stream so the file doesn't have to be fully loaded into
    // memory while we send it
    const readableStream = file.readable;
    const response = new Response(readableStream, { headers: headers });
    await requestEvent.respondWith(response);
  }
}
