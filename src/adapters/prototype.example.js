// TEMPLATE FILE — copy to `prototype.js` and fill in your own values.
// The real `prototype.js` is gitignored on purpose: the headers below carry
// account- and device-level identifiers tied to a specific personal session,
// which must never be committed to a public repository.
// Internal evaluation adapter only.
// Adapted from ltaoo/wx_channels_download internal/api/sph/worker.js.
// The upstream repository is Commons-Clause licensed. Do not use this adapter
// in a paid service without a separate commercial license from the licensor.
import { generateRid } from "../lib.js";

const PARSE_URL = "https://yuanbao.tencent.com/api/weixin/get_parse_result";
const FEED_INFO_URL =
  "https://channels.weixin.qq.com/finder-preview/api/feed/get_feed_info";

const PARSE_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "content-type": "application/json",
  origin: "https://yuanbao.tencent.com",
  referer:
    "<YOUR_REFERER>",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "t-userid": "<YOUR_USER_ID>",
  "x-agentid": "<YOUR_AGENT_ID>",
  "x-commit-tag": "<YOUR_COMMIT_TAG>",
  "x-device-id": "<YOUR_DEVICE_ID>",
  "x-hy106": "",
  "x-hy92": "<YOUR_HY92>",
  "x-hy93": "<YOUR_DEVICE_ID>",
  "x-id": "<YOUR_USER_ID>",
  "x-instance-id": "5",
  "x-language": "zh-CN",
  "x-os_version": "Mac OS(10.15.7)-Blink",
  "x-platform": "mac",
  "x-requested-with": "XMLHttpRequest",
  "x-source": "web",
  "x-web-third-source": "main",
  "x-webdriver": "0",
  "x-webversion": "2.69.0",
  "x-ybuitest": "0",
};

const FEED_INFO_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Content-Type": "application/json",
  Origin: "https://channels.weixin.qq.com",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
};

async function parseShareUrl(shareUrl, cookie) {
  const response = await fetch(PARSE_URL, {
    method: "POST",
    headers: { ...PARSE_HEADERS, cookie },
    body: JSON.stringify({ type: "video_channel_url", url: shareUrl, scene: 1 }),
  });
  if (!response.ok) throw new Error(`分享链接解析失败 (${response.status})`);
  const result = await response.json();
  if (!result.data?.playable_url) throw new Error("分享链接暂时无法解析");
  return result.data;
}

async function fetchFeedInfo(exportId, generalToken) {
  const rid = generateRid();
  const pageUrl =
    "https:%2F%2Fchannels.weixin.qq.com%2Ffinder-preview%2Fpages%2Ffeed";
  const apiUrl = `${FEED_INFO_URL}?_rid=${rid}&_pageUrl=${pageUrl}`;
  const referer =
    "https://channels.weixin.qq.com/finder-preview/pages/feed" +
    `?entry_card_type=48&comment_scene=39&appid=0&token=${encodeURIComponent(generalToken)}` +
    `&entry_scene=0&eid=${encodeURIComponent(exportId)}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { ...FEED_INFO_HEADERS, Referer: referer },
    body: JSON.stringify({ baseReq: { generalToken }, exportId }),
  });
  if (!response.ok) throw new Error(`视频信息获取失败 (${response.status})`);
  return response.json();
}

export async function parseWithPrototype(shareUrl, env) {
  if (!env.COOKIE) throw new Error("服务器尚未配置 COOKIE");
  const parseData = await parseShareUrl(shareUrl, env.COOKIE);
  const playableUrl = new URL(parseData.playable_url);
  const generalToken = playableUrl.searchParams.get("token") || "";
  const exportId =
    playableUrl.searchParams.get("eid") || parseData.wx_export_id || "";
  if (!generalToken || !exportId) throw new Error("解析结果缺少必要参数");
  return fetchFeedInfo(exportId, generalToken);
}
