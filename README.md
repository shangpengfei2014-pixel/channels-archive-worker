# 创作者素材归档助手

一个面向本人或已获授权素材的内部验证工具。当前支持视频号分享链接，提供两种入口：

- 公众号直聊：用户将视频号复制链接发送给公众号，公众号返回 10 分钟有效的短下载链接。
- H5 页面：用户在 `https://saveclip.cn` 粘贴分享链接，预览并下载命名文件。

完整搭建过程、配置步骤和排错记录见：

- [`docs/公众号视频号素材归档工具搭建教程.md`](./docs/公众号视频号素材归档工具搭建教程.md)
- [`docs/视频号素材归档系统运行维护手册.md`](./docs/视频号素材归档系统运行维护手册.md)
- [`docs/截图归档清单.md`](./docs/截图归档清单.md)
- [`docs/internal-evaluation.md`](./docs/internal-evaluation.md)
- [`docs/commercial-migration.md`](./docs/commercial-migration.md)
- [`docs/视频号解析Worker自部署记录.md`](./docs/视频号解析Worker自部署记录.md)

## 当前链路

```text
公众号用户发送视频号链接
-> 微信公众平台消息推送
-> https://saveclip.cn/api/wechat/callback
-> 视频信息解析适配器
-> 自建 Cloudflare 解析 Worker
-> 生成 10 分钟短链接 /d/<ticket>
-> 用户下载 作者_标题.mp4
```

企业微信客服入口作为备用：

```text
https://saveclip.cn/contact
```

## 本地检查

```sh
npm test
node --check server.js
```

## 服务器

```text
Ubuntu + Node.js + systemd + Nginx + Certbot
```

健康检查：

```text
GET https://saveclip.cn/health
```

当前内部部署状态（2026-09-17）：

- 公众号机器人和 H5 均已切换到自建解析 Worker。
- Worker 的 API 需要访问凭证；凭证不写入仓库、不写入网页。
- Worker 使用 Cloudflare Secret 保存元宝登录 Cookie，Node 服务只保存 Worker 地址和访问凭证。
- Cookie 过期后，按 [`视频号解析 Worker 自部署记录`](./docs/视频号解析Worker自部署记录.md) 更新，不需要改机器人代码。

部署模板：

```text
deployment/channels-archive.service
deployment/nginx.conf
scripts/deploy-server.sh
scripts/health-check.sh
```

## 配置文件

真实配置文件均已加入 `.gitignore`。不要把真实值写入 Git、教程或聊天记录。

```text
.env
.wecom-app-callback.env
.wecom-kf.env
.wecom-contact.env
.wechat-official.env
```

需要重新搭建环境时，参考：

```text
config/*.example
```

## 仓库说明（公开版）

以下两个文件**故意不进仓库**，本地保留、已加入 `.gitignore`：

| 文件 | 为什么排除 |
|---|---|
| `src/adapters/prototype.js` | 请求头里带有与个人账号、设备绑定的会话标识，公开等于公开自己的身份指纹。仓库内提供 [`src/adapters/prototype.example.js`](./src/adapters/prototype.example.js) 作为模板。 |
| `docs/publish_channels.py` | 一次性的公众号发文脚本，内含公众号 AppSecret。 |

首次运行：

```sh
cp src/adapters/prototype.example.js src/adapters/prototype.js
# 按文件内的 <YOUR_*> 占位符填入自己的值
cp .env.example .env
npm test
npm start
```

解析适配器改编自 [`ltaoo/wx_channels_download`](https://github.com/ltaoo/wx_channels_download)（Commons Clause 许可）。未取得授权前不得用于付费服务。

## 使用边界

当前解析层仍是内部学习交流版本，仅用于保存本人或已经获得授权的公开普通视频素材。正式对外运营前，必须替换为自研或已取得商业授权的解析接口，并补充限流、授权记录、投诉下架、隐私政策和日志脱敏。
