/// <reference lib="deno.ns" />

Deno.serve(
  { port: 3000, hostname: "0.0.0.0" },
  handle_http,
);

function illegal_url(path: string) {
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

function get_content_type(path: string): string {
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

function not_found(_request: Request): Response {
  return new Response("404 Not Found", { status: 404 });
}

function handleAPI(request: Request): Response {
  return not_found(request);
}

async function handle_file(
  request: Request,
  filepath: string,
): Promise<Response> {
  if (filepath === "/") {
    filepath = "/index.html";
  }

  const contentType: string = get_content_type(filepath);
  if (contentType === "") {
    return not_found(request);
  }

  try {
    const file = await Deno.open(`./dist${filepath}`, { read: true });
    const readableStream = file.readable;
    const headers: HeadersInit = { "content-type": contentType };
    const response = new Response(readableStream, { headers: headers });
    return response;
  } catch {
    return not_found(request);
  }
}

function handle_http(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);

  if (illegal_url(filepath)) {
    return not_found(request);
  }
  if (filepath.startsWith("/api/")) {
    return handleAPI(request);
  }

  return handle_file(request, filepath);
}

export {};
