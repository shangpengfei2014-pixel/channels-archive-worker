import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseBestVideoUrl,
  cleanVideoUrl,
  createDownloadFilename,
  generateRid,
  isAllowedDownloadUrl,
  normalizeShareUrl,
} from "../src/lib.js";

test("normalizes supported share URLs", () => {
  assert.equal(
    normalizeShareUrl(" https://weixin.qq.com/sph/AZzH4QRzmX "),
    "https://weixin.qq.com/sph/AZzH4QRzmX",
  );
});

test("rejects unrelated URLs", () => {
  assert.throws(() => normalizeShareUrl("https://example.com/video"), {
    message: "请输入有效的视频号分享链接",
  });
});

test("keeps only durable raw-video parameters when available", () => {
  assert.equal(
    cleanVideoUrl("https://cdn.example/video.mp4?a=1&encfilekey=abc&token=def"),
    "https://cdn.example/video.mp4?encfilekey=abc&token=def",
  );
});

test("prefers h264 for iPhone compatibility", () => {
  assert.equal(
    chooseBestVideoUrl({
      h264VideoInfo: { videoUrl: "h264" },
      h265VideoInfo: { videoUrl: "h265" },
      videoUrl: "fallback",
    }),
    "h264",
  );
});

test("builds deterministic request IDs", () => {
  assert.equal(
    generateRid(() => 1_700_000_000_000, () => 0),
    "6553f100-00000000",
  );
});

test("allows only finder video download URLs", () => {
  assert.equal(
    isAllowedDownloadUrl("https://finder.video.qq.com/251/20302/stodownload?encfilekey=abc&token=def"),
    true,
  );
  assert.equal(
    isAllowedDownloadUrl("https://example.com/251/20302/stodownload?encfilekey=abc&token=def"),
    false,
  );
});

test("builds a readable filename from author and description", () => {
  assert.equal(
    createDownloadFilename("陈灏", "AI 做 IP#商业/认知"),
    "陈灏_AI 做 IP#商业 认知.mp4",
  );
});
