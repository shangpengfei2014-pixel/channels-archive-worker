import { chooseBestVideoUrl, normalizeShareUrl } from "./lib.js";
import { createDownloadTicket } from "./download-ticket.js";
import { readFile, writeFile } from "node:fs/promises";

const SHARE_URL_PATTERN = /https:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]+(?:[/?#][^\s]*)?/;
let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;
let customerServiceCursor = "";
let customerServiceCursorLoaded = false;
let customerServiceSyncQueue = Promise.resolve();
const seenMessageIds = new Set();

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function rememberMessage(messageId) {
  if (!messageId || seenMessageIds.has(messageId)) return false;
  seenMessageIds.add(messageId);
  if (seenMessageIds.size > 5000) seenMessageIds.delete(seenMessageIds.values().next().value);
  return true;
}

async function loadCustomerServiceCursor(env) {
  if (customerServiceCursorLoaded) return;
  customerServiceCursorLoaded = true;
  try {
    customerServiceCursor = (
      await readFile(env.WECOM_KF_CURSOR_FILE || ".wecom-kf.cursor", "utf8")
    ).trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function saveCustomerServiceCursor(env, cursor) {
  if (!cursor || cursor === customerServiceCursor) return;
  customerServiceCursor = cursor;
  await writeFile(
    env.WECOM_KF_CURSOR_FILE || ".wecom-kf.cursor",
    `${cursor}\n`,
    { mode: 0o600 },
  );
}

export function extractShareUrl(message = {}) {
  const value =
    message.msgtype === "text"
      ? message.text?.content
      : message.msgtype === "link"
        ? message.link?.url
        : "";
  return value?.match(SHARE_URL_PATTERN)?.[0] || "";
}

async function wecomRequest(path, accessToken, body) {
  const response = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/${path}?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(`企业微信接口失败: ${data.errmsg || response.status}`);
  }
  return data;
}

async function getAccessToken(env) {
  if (cachedAccessToken && cachedAccessTokenExpiresAt > Date.now()) return cachedAccessToken;
  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
  url.searchParams.set("corpid", env.WECOM_CORP_ID);
  url.searchParams.set("corpsecret", env.WECOM_APP_SECRET);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok || data.errcode) throw new Error(`获取企业微信凭证失败: ${data.errmsg || response.status}`);
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(60, data.expires_in - 300) * 1000;
  return cachedAccessToken;
}

async function sendText(accessToken, message, content) {
  await wecomRequest("kf/send_msg", accessToken, {
    touser: message.external_userid,
    open_kfid: message.open_kfid,
    msgtype: "text",
    text: { content },
  });
}

async function replyToMessage(message, env, parseVideoProfile) {
  if (message.origin !== 3 || !rememberMessage(message.msgid)) return;
  const accessToken = await getAccessToken(env);
  const shareUrl = extractShareUrl(message);
  if (!shareUrl) {
    const hint =
      message.msgtype === "channels"
        ? "已收到视频号卡片。微信暂未提供卡片中的下载地址，请在视频号分享菜单中点击“复制链接”，再把链接发送给我。"
        : "请发送视频号分享链接。操作方式：视频号右下角分享 → 复制链接 → 粘贴发送。";
    await sendText(accessToken, message, hint);
    return;
  }
  let content;
  try {
    const profile = await parseVideoProfile(normalizeShareUrl(shareUrl), env);
    const feed = profile.data?.feedInfo || {};
    const videoUrl = chooseBestVideoUrl(feed);
    if (!videoUrl) throw new Error("暂未找到视频文件");
    const path = createDownloadTicket({
      videoUrl,
      author: profile.data?.authorInfo?.nickname || "",
      title: feed.description || "未命名素材",
    });
    content = `解析完成。下载链接 10 分钟内有效：\nhttps://saveclip.cn${path}\n\n仅用于保存本人或已获得授权的素材。`;
  } catch (error) {
    console.error(error);
    content = "暂时无法解析这个链接，请稍后重试。";
  }
  await sendText(accessToken, message, content);
}

async function syncCustomerServiceMessagesNow({
  callbackToken,
  openKfid,
  env,
  parseVideoProfile,
}) {
  const accessToken = await getAccessToken(env);
  const managedOpenKfid = env.WECOM_OPEN_KFID || openKfid;
  await loadCustomerServiceCursor(env);
  const syncPages = async (token) => {
    let cursor = customerServiceCursor;
    const isBootstrap = !cursor;
    let messageCount = 0;
    for (let page = 0; page < 10; page += 1) {
      const body = {
        open_kfid: managedOpenKfid,
        cursor,
        limit: 1000,
      };
      if (token) body.token = token;
      const result = await wecomRequest("kf/sync_msg", accessToken, body);
      const messages = result.msg_list || [];
      messageCount += messages.length;
      await saveCustomerServiceCursor(env, result.next_cursor);
      if (!isBootstrap) {
        for (const message of messages) {
          await replyToMessage(message, env, parseVideoProfile);
        }
      }
      if (!result.has_more) return messageCount;
      cursor = customerServiceCursor;
    }
    return messageCount;
  };

  for (const delay of [0, 800, 1600]) {
    if (delay) await sleep(delay);
    await syncPages(callbackToken);
  }

  // The callback can arrive slightly before the customer-service queue updates.
  // A final tokenless pull is rate-limited by WeCom but reliable for this fallback entry.
  await syncPages("");
}

export function syncCustomerServiceMessages(options) {
  const sync = customerServiceSyncQueue.then(() =>
    syncCustomerServiceMessagesNow(options),
  );
  customerServiceSyncQueue = sync.catch(() => {});
  return sync;
}
