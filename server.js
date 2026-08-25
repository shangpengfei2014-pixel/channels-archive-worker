import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { parseVideoProfile } from "./src/adapters/index.js";
import {
  chooseBestVideoUrl,
  createDownloadFilename,
  isAllowedDownloadUrl,
  normalizeShareUrl,
} from "./src/lib.js";
import {
  decryptWecomMessage,
  verifyWecomEcho,
  xmlText,
} from "./src/wecom-callback.js";
import {
  createSignedDownloadPath,
  verifySignedDownload,
} from "./src/download-link.js";
import { resolveDownloadTicket } from "./src/download-ticket.js";
import { syncCustomerServiceMessages } from "./src/wecom-kf.js";
import {
  replyToOfficialAccountMessage,
  verifyOfficialAccountSignature,
} from "./src/wechat-official.js";

const port = Number(process.env.PORT || 3000);
const indexPath = fileURLToPath(new URL("./src/index.html", import.meta.url));
const indexHtml = await readFile(indexPath, "utf8");
const wecomContactUrl = process.env.WECOM_CONTACT_URL || "";

function sendJson(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readText(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchVideo(videoUrl, range) {
  let nextUrl = videoUrl;
  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    if (!isAllowedDownloadUrl(nextUrl)) throw new Error("视频地址不在允许范围内");
    const upstream = await fetch(nextUrl, {
      headers: range ? { Range: range } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (!location) throw new Error("视频地址跳转异常");
      nextUrl = new URL(location, nextUrl).toString();
      continue;
    }
    return upstream;
  }
  throw new Error("视频地址跳转次数过多");
}

async function sendVideoDownload(response, request, { videoUrl, author, title }) {
  const filename = createDownloadFilename(author, title);
  const upstream = await fetchVideo(videoUrl, request.headers.range);
  const contentType = upstream.headers.get("content-type") || "";
  if (
    !upstream.ok ||
    (!contentType.startsWith("video/") &&
      contentType !== "application/octet-stream")
  ) {
    throw new Error("视频文件暂时不可用");
  }
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="video.mp4"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Type": contentType || "video/mp4",
  };
  for (const name of ["accept-ranges", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  response.writeHead(upstream.status, headers);
  Readable.fromWeb(upstream.body).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(indexHtml);
    return;
  }
  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, { ok: true });
    return;
  }
  if (request.method === "GET" && url.pathname === "/contact") {
    if (!wecomContactUrl) {
      sendJson(response, { error: "客服入口尚未配置" }, 503);
      return;
    }
    response.writeHead(302, {
      Location: wecomContactUrl,
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/wechat/callback") {
    try {
      verifyOfficialAccountSignature({
        token: process.env.WECHAT_OFFICIAL_CALLBACK_TOKEN,
        timestamp: url.searchParams.get("timestamp"),
        nonce: url.searchParams.get("nonce"),
        signature: url.searchParams.get("signature"),
      });
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(url.searchParams.get("echostr") || "");
    } catch (error) {
      console.error(error);
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("forbidden");
    }
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/wechat/callback") {
    try {
      verifyOfficialAccountSignature({
        token: process.env.WECHAT_OFFICIAL_CALLBACK_TOKEN,
        timestamp: url.searchParams.get("timestamp"),
        nonce: url.searchParams.get("nonce"),
        signature: url.searchParams.get("signature"),
      });
      const reply = await replyToOfficialAccountMessage({
        xml: await readText(request),
        env: process.env,
        parseVideoProfile,
      });
      response.writeHead(200, {
        "Content-Type": "application/xml; charset=utf-8",
      });
      response.end(reply);
    } catch (error) {
      console.error(error);
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("forbidden");
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/wecom/app-callback") {
    try {
      const echo = verifyWecomEcho({
        token: process.env.WECOM_APP_CALLBACK_TOKEN,
        encodingAesKey: process.env.WECOM_APP_CALLBACK_AES_KEY,
        signature: url.searchParams.get("msg_signature"),
        timestamp: url.searchParams.get("timestamp"),
        nonce: url.searchParams.get("nonce"),
        encryptedEcho: url.searchParams.get("echostr"),
      });
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(echo);
    } catch (error) {
      console.error(error);
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("forbidden");
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/wecom/kf-callback") {
    try {
      const echo = verifyWecomEcho({
        token: process.env.WECOM_KF_CALLBACK_TOKEN,
        encodingAesKey: process.env.WECOM_KF_CALLBACK_AES_KEY,
        signature: url.searchParams.get("msg_signature"),
        timestamp: url.searchParams.get("timestamp"),
        nonce: url.searchParams.get("nonce"),
        encryptedEcho: url.searchParams.get("echostr"),
      });
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(echo);
    } catch (error) {
      console.error(error);
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("forbidden");
    }
    return;
  }
  if (
    request.method === "POST" &&
    (url.pathname === "/api/wecom/app-callback" ||
      url.pathname === "/api/wecom/kf-callback")
  ) {
    try {
      const encryptedXml = await readText(request);
      const callbackXml = decryptWecomMessage({
        token:
          url.pathname === "/api/wecom/app-callback"
            ? process.env.WECOM_APP_CALLBACK_TOKEN
            : process.env.WECOM_KF_CALLBACK_TOKEN,
        encodingAesKey:
          url.pathname === "/api/wecom/app-callback"
            ? process.env.WECOM_APP_CALLBACK_AES_KEY
            : process.env.WECOM_KF_CALLBACK_AES_KEY,
        signature: url.searchParams.get("msg_signature"),
        timestamp: url.searchParams.get("timestamp"),
        nonce: url.searchParams.get("nonce"),
        encrypted: xmlText(encryptedXml, "Encrypt"),
      });
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("success");
      syncCustomerServiceMessages({
        callbackToken: xmlText(callbackXml, "Token"),
        openKfid: xmlText(callbackXml, "OpenKfId"),
        env: process.env,
        parseVideoProfile,
      }).catch(console.error);
    } catch (error) {
      console.error(error);
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("forbidden");
    }
    return;
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/fetch_video_profile"
  ) {
    try {
      const body = await readJson(request);
      const shareUrl = normalizeShareUrl(body.url);
      const profile = await parseVideoProfile(shareUrl, process.env);
      const feed = profile.data?.feedInfo || {};
      const videoUrl = chooseBestVideoUrl(feed);
      const author = profile.data?.authorInfo?.nickname || "";
      const title = feed.description || "未命名素材";
      profile.downloadFilename = createDownloadFilename(author, title);
      profile.signedDownloadUrl = videoUrl
        ? createSignedDownloadPath({
            secret: process.env.DOWNLOAD_SIGNING_SECRET,
            videoUrl,
            author,
            title,
          })
        : "";
      sendJson(response, profile);
    } catch (error) {
      console.error(error);
      sendJson(response, { error: error.message || "解析失败" }, 400);
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/download") {
    try {
      verifySignedDownload(url.searchParams, process.env.DOWNLOAD_SIGNING_SECRET);
      await sendVideoDownload(response, request, {
        videoUrl: url.searchParams.get("url") || "",
        author: url.searchParams.get("author") || "",
        title: url.searchParams.get("title") || "",
      });
    } catch (error) {
      console.error(error);
      sendJson(response, { error: error.message || "下载失败" }, 400);
    }
    return;
  }
  if (request.method === "GET" && url.pathname.startsWith("/d/")) {
    try {
      const ticket = url.pathname.slice(3);
      await sendVideoDownload(
        response,
        request,
        resolveDownloadTicket(ticket),
      );
    } catch (error) {
      console.error(error);
      sendJson(response, { error: error.message || "下载失败" }, 400);
    }
    return;
  }
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`channels archive listening on http://127.0.0.1:${port}`);
});
