import { createDecipheriv, createHash, timingSafeEqual } from "node:crypto";

function removePkcs7Padding(buffer) {
  const padding = buffer.at(-1);
  if (!padding || padding > 32) throw new Error("企业微信回调填充无效");
  for (const value of buffer.subarray(-padding)) {
    if (value !== padding) throw new Error("企业微信回调填充无效");
  }
  return buffer.subarray(0, -padding);
}

export function createSignature(token, timestamp, nonce, encrypted) {
  return createHash("sha1")
    .update([token, timestamp, nonce, encrypted].sort().join(""))
    .digest("hex");
}

export function decryptWecomMessage({
  token,
  encodingAesKey,
  signature,
  timestamp,
  nonce,
  encrypted,
}) {
  if (!token || !encodingAesKey) throw new Error("企业微信回调尚未配置");
  const expected = createSignature(token, timestamp, nonce, encrypted);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature || "");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("企业微信回调签名无效");
  }

  const aesKey = Buffer.from(`${encodingAesKey}=`, "base64");
  if (aesKey.length !== 32) throw new Error("企业微信回调密钥无效");
  const decipher = createDecipheriv("aes-256-cbc", aesKey, aesKey.subarray(0, 16));
  decipher.setAutoPadding(false);
  const decrypted = removePkcs7Padding(
    Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]),
  );
  const messageLength = decrypted.readUInt32BE(16);
  return decrypted.subarray(20, 20 + messageLength).toString("utf8");
}

export function verifyWecomEcho(options) {
  return decryptWecomMessage({
    ...options,
    encrypted: options.encryptedEcho,
  });
}

export function xmlText(xml, tag) {
  const value = String(xml || "");
  const cdataMatch = value.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
  );
  if (cdataMatch) return cdataMatch[1];
  return value.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] || "";
}
