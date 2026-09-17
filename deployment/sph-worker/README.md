# SaveClip 视频解析 Worker

这是当前内部使用的自建 Cloudflare Worker 源码，负责调用元宝接口解析视频号分享链接。

## 部署

在本目录执行：

```sh
npx wrangler deploy
npx wrangler secret put COOKIE
npx wrangler secret put ACCESS_CREDENTIAL
```

真实 Secret 不得写入仓库。部署完成后，将 Worker 的 API 地址写入 Node 服务的：

```text
PROFILE_API_URL=https://<worker-name>.<account-subdomain>.workers.dev/api/fetch_video_profile
PROFILE_API_TOKEN=<与 ACCESS_CREDENTIAL 相同的值>
```

详细的 Cookie 更新和故障排查见：

[`../../docs/视频号解析Worker自部署记录.md`](../../docs/视频号解析Worker自部署记录.md)

此 Worker 仅用于本人或已获得授权的视频号公开普通视频素材。
