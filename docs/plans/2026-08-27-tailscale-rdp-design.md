# Tailscale Windows 远程桌面教程设计

## 目标

新增一篇面向普通用户的中文教程，说明如何使用 Tailscale 组建私有网络，并通过 Windows 自带远程桌面（RDP）安全连接自己的电脑。

## 内容结构

- 原理、适用版本与前置条件
- 主机端安装 Tailscale、启用 RDP、设置账户与电源
- 客户端连接流程（Tailscale IP 与 MagicDNS）
- 安全加固：设备授权、强密码、ACL、最小暴露面
- 常见故障排查与卸载回滚

## 验证

文章使用现有 Hugo front matter 与 Markdown 约定，新增目录后运行 Hugo 构建，确认无解析错误且自动出现在文章列表。
