# 商业版本迁移边界

当前版本用于验证 iPhone 端操作链路，不是收费运营版本。

## 当前内部部署进展（2026-09-17）

解析层已经从临时公开上游切换为自有 Cloudflare Worker。Worker 的访问凭证和元宝 Cookie 使用 Cloudflare Secret 管理，现有 Node 服务通过 `PROFILE_API_URL` 和 `PROFILE_API_TOKEN` 调用它。

部署和续期记录见 [`视频号解析Worker自部署记录.md`](./视频号解析Worker自部署记录.md)。

## 商业化前仍必须确认的部分

- 删除 `src/adapters/prototype.js`
- 确认自有 Worker、元宝及相关数据源的使用授权
- 在 Cloudflare Worker 中继续使用 Secret 保存 Cookie 和访问凭证
- 使用 `PROFILE_API_TOKEN` 限制现有 Node 服务到 Worker 的访问

## 可以保留的部分

- H5 页面
- 快捷指令入口
- 分享链接格式校验
- H.264 优先策略
- iPhone 下载和浏览器兜底入口

## 商业版本还需要增加

- 用户身份与授权记录
- 单用户和单 IP 限流
- 临时任务 ID 与短时下载链接
- 日志脱敏
- 投诉、下架和封禁机制
- 隐私政策、服务条款和版权声明
