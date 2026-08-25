import test from "node:test";
import assert from "node:assert/strict";
import {
  createDownloadTicket,
  resolveDownloadTicket,
} from "../src/download-ticket.js";

test("creates a compact expiring download ticket", () => {
  const path = createDownloadTicket({
    videoUrl: "https://finder.video.qq.com/1/2/stodownload?encfilekey=abc&token=def",
    author: "作者",
    title: "标题",
    expiresAt: 1710000001000,
  });
  assert.match(path, /^\/d\/[A-Za-z0-9_-]{16}$/);
  assert.equal(resolveDownloadTicket(path.slice(3), 1710000000000).title, "标题");
  assert.throws(() => resolveDownloadTicket(path.slice(3), 1710000002000), {
    message: "下载链接已过期",
  });
});
