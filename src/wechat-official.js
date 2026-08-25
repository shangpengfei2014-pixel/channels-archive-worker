import { createHash, timingSafeEqual } from "node:crypto";
import { chooseBestVideoUrl, normalizeShareUrl } from "./lib.js";
import { createDownloadTicket } from "./download-ticket.js";

const SHARE_URL_PATTERN =
  /https:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]+(?:[/?#][^\s]*)?/;

function escapeXml(value = "") {
  return String(value).replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character],
  );
}

function xmlCdata(value = "") {
  return `<![CDATA[${String(value).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export function officialAccountSignature(token, timestamp, nonce) {
  return createHash("sha1")
    .update([token, timestamp, nonce].sort().join(""))
    .digest("hex");
}

export function verifyOfficialAccountSignature({
  token,
  timestamp,
  nonce,
  signature,
}) {
  if (!token) throw new Error("公众号回调尚未配置");
  const expected = Buffer.from(officialAccountSignature(token, timestamp, nonce));
  const actual = Buffer.from(signature || "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("公众号回调签名无效");
  }
}

export function officialAccountXmlText(xml, tag) {
  const value = String(xml || "");
  const cdata = value.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
  );
  if (cdata) return cdata[1];
  return value.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] || "";
}

export function createOfficialAccountTextReply({ toUser, fromUser, content }) {
  return `<xml>
<ToUserName>${xmlCdata(toUser)}</ToUserName>
<FromUserName>${xmlCdata(fromUser)}</FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content>${xmlCdata(content)}</Content>
</xml>`;
}

export async function replyToOfficialAccountMessage({
  xml,
  env,
  parseVideoProfile,
}) {
  const toUser = officialAccountXmlText(xml, "FromUserName");
  const fromUser = officialAccountXmlText(xml, "ToUserName");
  if (!toUser || !fromUser) throw new Error("公众号消息格式无效");
  const msgType = officialAccountXmlText(xml, "MsgType");
  if (msgType !== "text") {
    return createOfficialAccountTextReply({
      toUser,
      fromUser,
      content: "请发送视频号分享链接。操作方式：视频号右下角分享 → 复制链接 → 粘贴发送。",
    });
  }
  const shareUrl = officialAccountXmlText(xml, "Content").match(
    SHARE_URL_PATTERN,
  )?.[0];
  if (!shareUrl) {
    return createOfficialAccountTextReply({
      toUser,
      fromUser,
      content: "请发送视频号分享链接。当前支持本人或已获授权的视频号素材归档。",
    });
  }
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
    return createOfficialAccountTextReply({
      toUser,
      fromUser,
      content: `解析完成。下载链接 10 分钟内有效：\nhttps://saveclip.cn${path}\n\n仅用于保存本人或已获得授权的素材。`,
    });
  } catch (error) {
    console.error(error);
    return createOfficialAccountTextReply({
      toUser,
      fromUser,
      content: "暂时无法解析这个链接，请稍后重试。",
    });
  }
}
