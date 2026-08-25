import test from "node:test";
import assert from "node:assert/strict";
import {
  createSignedDownloadPath,
  verifySignedDownload,
} from "../src/download-link.js";
import { extractShareUrl } from "../src/wecom-kf.js";

test("creates and verifies an expiring download link", () => {
  const path = createSignedDownloadPath({
    secret: "test-secret",
    videoUrl: "https://finder.video.qq.com/1/2/stodownload?encfilekey=abc&token=def&unused=1",
    author: "作者",
    title: "标题",
    expiresAt: 1710000001000,
  });
  const url = new URL(path, "https://saveclip.cn");
  verifySignedDownload(url.searchParams, "test-secret", 1710000000000);
  assert.throws(
    () => verifySignedDownload(url.searchParams, "test-secret", 1710000002000),
    { message: "下载链接已过期" },
  );
});

test("extracts a video-channel URL from customer-service text", () => {
  assert.equal(
    extractShareUrl({
      msgtype: "text",
      text: { content: "请处理 https://weixin.qq.com/sph/AZzH4QRzmX 谢谢" },
    }),
    "https://weixin.qq.com/sph/AZzH4QRzmX",
  );
});
