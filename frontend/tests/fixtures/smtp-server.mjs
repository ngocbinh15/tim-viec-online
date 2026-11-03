// Loopback-only SMTP sink for Laravel browser tests. No relay or external delivery.
import { createServer } from "node:net";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mailbox = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../backend/storage/framework/testing/frontend-e2e/mailbox.jsonl",
);
mkdirSync(dirname(mailbox), { recursive: true });
writeFileSync(mailbox, "");
const limit = 1024 * 1024;
const server = createServer((socket) => {
  let buffer = "";
  let data = null;
  let sender = "";
  let recipients = [];
  socket.setEncoding("utf8");
  socket.setTimeout(30_000, () => socket.destroy());
  socket.on("error", () => socket.destroy());
  socket.write("220 localhost ESMTP browser-fixture\r\n");
  socket.on("data", (chunk) => {
    buffer += chunk;
    if (buffer.length + (data?.length ?? 0) > limit) return socket.destroy();
    let end;
    while ((end = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (data !== null) {
        if (line !== ".") {
          data += `${line.startsWith("..") ? line.slice(1) : line}\r\n`;
          continue;
        }
        appendFileSync(
          mailbox,
          JSON.stringify({ sender, recipients, raw: data }) + "\n",
        );
        data = null;
        recipients = [];
        socket.write("250 2.0.0 Message captured locally\r\n");
      } else if (/^(EHLO|HELO) /i.test(line)) {
        socket.write(`250-localhost\r\n250 SIZE ${limit}\r\n`);
      } else if (/^MAIL FROM:/i.test(line)) {
        sender = line.match(/<([^>]+)>/)?.[1] ?? "";
        recipients = [];
        socket.write("250 2.1.0 OK\r\n");
      } else if (/^RCPT TO:/i.test(line)) {
        const address = (line.match(/<([^>]+)>/)?.[1] ?? "").toLowerCase();
        if (!address.endsWith("@frontend-e2e.test")) {
          socket.write(
            "550 5.1.1 Only browser fixture recipients accepted\r\n",
          );
        } else {
          recipients.push(address);
          socket.write("250 2.1.5 OK\r\n");
        }
      } else if (/^DATA$/i.test(line) && recipients.length) {
        data = "";
        socket.write("354 End with <CRLF>.<CRLF>\r\n");
      } else if (/^QUIT$/i.test(line)) {
        socket.end("221 2.0.0 Bye\r\n");
      } else if (/^RSET$/i.test(line)) {
        data = null;
        recipients = [];
        socket.write("250 2.0.0 OK\r\n");
      } else if (/^NOOP$/i.test(line)) socket.write("250 2.0.0 OK\r\n");
      else socket.write("502 5.5.1 Command unsupported\r\n");
    }
  });
});
server.listen(8129, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
