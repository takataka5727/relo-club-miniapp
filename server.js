const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = Number(process.env.PORT || 5174);
const rootDirectory = __dirname;
const publicFiles = new Set(["index.html", "styles.css", "app-config.js", "app.js", "IMAGE_SOURCES.md"]);
function isPublicFile(relativePath) {
  return publicFiles.has(relativePath) || /^assets\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(relativePath);
}
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function getLanAddresses() {
  const addresses = [];
  Object.values(os.networkInterfaces()).flat().forEach((entry) => {
    if (!entry || entry.internal || (entry.family !== "IPv4" && entry.family !== 4)) return;
    addresses.push(entry.address);
  });
  return [...new Set(addresses)];
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, "http://localhost");
  const relativePath = decodeURIComponent(requestUrl.pathname) === "/"
    ? "index.html"
    : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");

  if (!isPublicFile(relativePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const filePath = path.join(rootDirectory, relativePath);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Server error");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log("富士フイルム版 PC確認用URL: http://localhost:" + port);
  getLanAddresses().forEach((address) => console.log("スマホ確認用URL: http://" + address + ":" + port));
  console.log("終了するには Ctrl + C を押してください。");
});

