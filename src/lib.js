const SHARE_URL_PATTERN = /^https:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]+(?:[/?#].*)?$/;

export function normalizeShareUrl(value) {
  const text = String(value || "").trim();
  if (!SHARE_URL_PATTERN.test(text)) {
    throw new Error("请输入有效的视频号分享链接");
  }
  return text;
}

export function generateRid(now = Date.now, random = Math.random) {
  const timestampHex = Math.floor(now() / 1000).toString(16);
  let randomHex = "";
  const chars = "0123456789abcdef";
  for (let index = 0; index < 8; index += 1) {
    randomHex += chars[Math.floor(random() * chars.length)];
  }
  return `${timestampHex}-${randomHex}`;
}

export function cleanVideoUrl(videoUrl) {
  try {
    const url = new URL(videoUrl);
    const fileKey = url.searchParams.get("encfilekey");
    const token = url.searchParams.get("token");
    if (!fileKey || !token) return videoUrl;
    const cleaned = new URL(`${url.origin}${url.pathname}`);
    cleaned.searchParams.set("encfilekey", fileKey);
    cleaned.searchParams.set("token", token);
    return cleaned.toString();
  } catch {
    return videoUrl;
  }
}

export function chooseBestVideoUrl(feedInfo = {}) {
  return (
    feedInfo.h264VideoInfo?.videoUrl ||
    feedInfo.h265VideoInfo?.videoUrl ||
    feedInfo.videoUrl ||
    ""
  );
}

export function isAllowedDownloadUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "finder.video.qq.com" &&
      url.pathname.endsWith("/stodownload") &&
      url.searchParams.has("encfilekey") &&
      url.searchParams.has("token")
    );
  } catch {
    return false;
  }
}

export function createDownloadFilename(author = "", description = "") {
  const source = [author, description].filter(Boolean).join("_") || "视频号素材";
  const cleaned = source
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 150)
    .trim();
  return `${cleaned || "视频号素材"}.mp4`;
}
