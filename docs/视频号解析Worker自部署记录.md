# 视频号解析 Worker 自部署记录

## 当前状态

- 状态：已投入内部使用
- 最近验证：2026-09-17
- Worker 地址：`https://saveclip-sph.shangpengfei2014.workers.dev`
- 代码来源：[`ltaoo/wx_channels_download`](https://github.com/ltaoo/wx_channels_download) 当前版本基础上的自部署版本
- 可复现源码：[`deployment/sph-worker/`](../deployment/sph-worker/)
- 使用范围：仅用于本人或已获得授权的视频号公开普通视频素材

## 为什么要自建

原先借用的公开解析 Worker 在 2026-09-17 前后增加了 API 访问凭证校验。现有 Node 服务仍按旧方式匿名调用，因此上游返回 `401`，机器人把它转换成“暂时无法解析这个链接，请稍后重试”。

自建后，链路变为：

```text
微信视频号分享链接
-> saveclip.cn Node 服务
-> PROFILE_API_URL + PROFILE_API_TOKEN
-> 自建 Cloudflare Worker
-> 元宝解析接口（使用 COOKIE Secret）
-> 视频信息和下载地址
```

## Secret 位置

Cloudflare Worker `saveclip-sph`：

| Secret | 用途 |
| --- | --- |
| `COOKIE` | 元宝登录态，包含浏览器可见和 HttpOnly Cookie |
| `ACCESS_CREDENTIAL` | Worker API 的私有访问凭证 |

Node 服务器 `/home/ubuntu/channels-archive-worker/.env`：

| 变量 | 用途 |
| --- | --- |
| `PROFILE_API_URL` | 自建 Worker 的 `/api/fetch_video_profile` 地址 |
| `PROFILE_API_TOKEN` | 与 Worker `ACCESS_CREDENTIAL` 相同的 Bearer 凭证 |

真实值不得写入 Git、文档、截图或聊天记录。

## 日常检查

```sh
curl -fsS https://saveclip.cn/health
curl -i https://saveclip-sph.shangpengfei2014.workers.dev/
ssh ubuntu@SERVER 'systemctl is-active channels-archive.service'
```

预期结果：主服务返回 `{"ok":true}`，Worker 首页返回 `200`，systemd 返回 `active`。

## 元宝 Cookie 过期时如何更新

1. 在已登录元宝的浏览器中重新登录或确认登录状态。
2. 获取完整 Cookie，必须包含 HttpOnly Cookie；只复制网页 `document.cookie` 通常不完整。
3. 在本地通过 Wrangler 重新上传 Worker Secret：

   ```sh
   npx wrangler secret put COOKIE --name saveclip-sph
   ```

4. 使用一个本人或已授权的视频号链接测试解析。
5. 如果 Worker 测试正常但机器人仍失败，检查服务器 `.env` 中的 `PROFILE_API_URL` 和 `PROFILE_API_TOKEN`，然后重启：

   ```sh
   sudo systemctl restart channels-archive.service
   curl -fsS https://saveclip.cn/health
   ```

Cookie 是登录凭证，不要通过聊天消息、截图或公开链接传递。

## 401 排查顺序

### Worker API 返回 401

通常是调用方缺少 `Authorization: Bearer ...`，或凭证与 Worker 的 `ACCESS_CREDENTIAL` 不一致。检查 Node 服务器的 `PROFILE_API_TOKEN`，不要把真实值打印到日志。

### Worker 返回 `parseShareUrl: http 401`

通常是元宝 Cookie 过期、不完整，或元宝更新了请求校验。先重新获取包含 HttpOnly Cookie 的完整登录态并更新 `COOKIE` Secret；若仍失败，再检查 Worker 源码中的元宝接口请求头是否需要随上游版本更新。

### Node 日志只显示通用提示

公众号和企业微信入口会把解析异常统一转换为用户提示。应查看服务器日志中的上游 HTTP 状态，并直接测试 Node 的解析接口；不要根据用户看到的通用提示判断是微信消息推送故障。

## 本次修复摘要

本次自建 Worker 使用当前 GitHub 项目版本重新部署，并做了两项兼容修复；可部署源码保存在 `deployment/sph-worker/`：

1. 删除项目中复制自旧元宝页面的固定身份、设备和版本请求头。
2. 保留当前接口需要的 `Content-Type`、`Origin`、`Referer`、`Accept`、`Accept-Language` 和 User-Agent，请求使用完整 Cookie。

修复后已完成以下验证：

- Cloudflare Worker 首页返回 `200`。
- Worker API 使用访问凭证和视频号样例返回 `200`。
- 现有 Node 服务调用 Worker 返回 `200`，响应包含 `signedDownloadUrl`。
- `saveclip.cn/health` 返回 `{"ok":true}`。
- `channels-archive.service` 状态为 `active`。
