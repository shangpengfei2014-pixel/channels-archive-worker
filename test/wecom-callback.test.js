import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createHash } from "node:crypto";
import { verifyWecomEcho, xmlText } from "../src/wecom-callback.js";

function encryptEcho(encodingAesKey, echo) {
  const aesKey = Buffer.from(`${encodingAesKey}=`, "base64");
  const random = Buffer.alloc(16, 1);
  const content = Buffer.from(echo);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(content.length);
  const receiveId = Buffer.from("corp-id");
  const raw = Buffer.concat([random, length, content, receiveId]);
  const padding = 32 - (raw.length % 32);
  const padded = Buffer.concat([raw, Buffer.alloc(padding, padding)]);
  const cipher = createCipheriv("aes-256-cbc", aesKey, aesKey.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString("base64");
}

test("verifies and decrypts a WeCom callback URL echo", () => {
  const token = "test-token";
  const encodingAesKey = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
  const timestamp = "1710000000";
  const nonce = "123456";
  const encryptedEcho = encryptEcho(encodingAesKey, "verification-ok");
  const signature = createHash("sha1")
    .update([token, timestamp, nonce, encryptedEcho].sort().join(""))
    .digest("hex");

  assert.equal(
    verifyWecomEcho({
      token,
      encodingAesKey,
      signature,
      timestamp,
      nonce,
      encryptedEcho,
    }),
    "verification-ok",
  );
});

test("reads encrypted callback XML without retaining CDATA markers", () => {
  assert.equal(
    xmlText("<xml><Encrypt><![CDATA[encrypted-value]]></Encrypt></xml>", "Encrypt"),
    "encrypted-value",
  );
  assert.equal(xmlText("<xml><Token>plain-value</Token></xml>", "Token"), "plain-value");
});
