// Start listening on port 3000 of localhost.
console.log("Backend running on http://localhost:3000/");

Deno.serve(
  { port: 3000, hostname: "0.0.0.0" },
  handleHttp,
);

function illegalURL(path: string) {
  return (
    !path.startsWith("/") ||
    path.includes("..") ||
    path.includes("//") ||
    path.includes(" ") ||
    path.includes(";") ||
    path.includes(",") ||
    path.includes("'") ||
    path.includes('"') ||
    path.includes("*")
  );
}

function getContentType(path: string): string {
  if (path === "/index.html") {
    return "text/html";
  }
  if (path === "/favicon.ico") {
    return "image/x-icon";
  }
  if (path.endsWith(".js")) {
    return "application/javascript";
  }
  if (path.endsWith(".css")) {
    return "text/css";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  return "";
}

function notFound(_request: Request): Response {
  return new Response("404 Not Found", { status: 404 });
}

function handleAPI(request: Request): Response {
  return notFound(request);
}

function handleFile(
  request: Request,
  filepath: string,
): Response | Promise<Response> {
  if (filepath === "/") {
    filepath = "/index.html";
  }

  const contentType: string = getContentType(filepath);
  if (contentType === "") {
    return notFound(request);
  }

  // Try opening the file
  let file;
  try {
    file = Deno.open(`./dist${filepath}`, { read: true });
  } catch {
    return notFound(request);
  }

  return file.then((file) => {
    const readableStream = file.readable;
    const headers: HeadersInit = { "content-type": contentType };
    const response = new Response(readableStream, { headers: headers });
    return response;
  });
}

function handleHttp(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);

  if (illegalURL(filepath)) {
    return notFound(request);
  }
  if (filepath.startsWith("/api/")) {
    return handleAPI(request);
  }

  return handleFile(request, filepath);
}

export {};
