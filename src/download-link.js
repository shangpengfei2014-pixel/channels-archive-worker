import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanVideoUrl } from "./lib.js";

function signature(secret, params) {
  return createHmac("sha256", secret)
    .update(params.toString())
    .digest("base64url");
}

export function createSignedDownloadPath({
  secret,
  videoUrl,
  author = "",
  title = "",
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  if (!secret) throw new Error("下载签名尚未配置");
  const params = new URLSearchParams({
    url: cleanVideoUrl(videoUrl),
    author,
    title,
    expires: String(expiresAt),
  });
  params.set("sig", signature(secret, params));
  return `/api/download?${params}`;
}

export function verifySignedDownload(searchParams, secret, now = Date.now()) {
  if (!secret) throw new Error("下载签名尚未配置");
  const actual = searchParams.get("sig") || "";
  const expiresValue = searchParams.get("expires");
  if (!expiresValue) throw new Error("下载链接不完整");
  const expires = Number(expiresValue);
  if (!Number.isFinite(expires) || expires < now) throw new Error("下载链接已过期");
  const unsigned = new URLSearchParams(searchParams);
  unsigned.delete("sig");
  const expected = signature(secret, unsigned);
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("下载链接无效");
  }
}
