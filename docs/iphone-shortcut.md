# iPhone 双击背面快捷入口

## 最终体验

```text
视频号复制链接
-> 双击 iPhone 背面
-> 自动打开 saveclip.cn
-> 自动解析
-> 点击“打开视频并保存”
-> 使用系统分享按钮保存到文件或相册
```

## 创建快捷指令

在 iPhone 打开“快捷指令”App：

1. 点击右上角 `+`
2. 名称填写：`素材归档`
3. 添加操作：`获取剪贴板`
4. 添加操作：`URL`
5. URL 内容填写：

```text
https://saveclip.cn/?shortcut=1&authorized=1&auto=1&url=剪贴板
```

在 URL 编辑框中，最后的 `剪贴板` 不是手工输入的文字。请点击变量按钮，插入上一步“获取剪贴板”的变量。

6. 添加操作：`打开 URL`
7. 保存快捷指令

## 绑定双击背面

打开 iPhone：

```text
设置
-> 辅助功能
-> 触控
-> 轻点背面
-> 轻点两下
-> 素材归档
```

## 首次使用

第一次运行快捷指令时，iPhone 可能要求确认访问 `saveclip.cn`。选择允许。

快捷指令 URL 中的 `authorized=1` 表示使用者已阅读并接受：仅处理本人或已经获得权利人授权的公开视频素材。

## 临时测试入口

域名和 HTTPS 生效前，可以临时使用：

```text
http://SERVER_IP/?shortcut=1&authorized=1&auto=1&url=剪贴板
```

正式使用时应切换回：

```text
https://saveclip.cn/?shortcut=1&authorized=1&auto=1&url=剪贴板
```
