---
title: "利用 Tailscale 和 Windows 远程桌面实现安全远程控制"
date: 2026-08-27T20:00:00+08:00
draft: false
categories: ["技术文章", "工具教程", "远程控制"]
tags: ["Tailscale", "Windows", "远程桌面", "RDP", "网络"]
summary: "不做端口映射，借助 Tailscale 私有网络和 Windows 自带 RDP，从外网安全连接自己的电脑。"
toc: true
---

很多人需要在外出时访问家里的 Windows 主机，却不想把 3389 端口直接暴露到公网。Tailscale 可以在设备之间建立基于 WireGuard 的加密私有网络，Windows 自带的远程桌面（RDP）则负责画面传输和输入控制。两者结合后，只要主机在线，就能像在局域网中一样连接。

## 一、准备工作

需要两台设备：被控制的 Windows 主机，以及用于连接的 Windows、macOS、Linux、iOS 或 Android 客户端。

- Windows 主机建议使用专业版、企业版或教育版。家庭版不能作为 RDP 服务端，但仍可作为客户端。
- 两台设备都安装 Tailscale，并登录同一个账号或同一个 tailnet。
- 主机需要保持开机并联网。若要长期访问，请关闭自动睡眠，或在 BIOS 中配置网络唤醒。
- 远程账户必须设置密码；Windows Hello PIN 不能代替 RDP 登录密码。

## 二、在 Windows 主机安装 Tailscale

1. 打开 [Tailscale 官网](https://tailscale.com/download)，下载 Windows 安装程序。
2. 完成安装后，从系统托盘打开 Tailscale，点击 **Log in**，使用自己的账号登录。
3. 登录成功后，在管理后台确认这台电脑已出现在设备列表，并完成首次授权。

在 PowerShell 中也可以查看当前状态：

```powershell
tailscale status
```

记下主机的 Tailscale IPv4 地址（通常是 `100.x.y.z`），或者记下设备名称。后续优先使用 MagicDNS 名称，地址变化时不需要重新修改连接配置。

## 三、开启 Windows 远程桌面

### 图形界面方式

1. 打开 **设置 > 系统 > 远程桌面**。
2. 开启 **远程桌面**，确认提示。
3. 点击 **远程桌面用户**，把需要登录的本地账户加入列表。管理员账户默认已经具备权限。
4. 在 **设置 > 系统 > 电源和电池** 中，将睡眠时间调整为“从不”（至少在接通电源时如此）。

Windows 会自动创建远程桌面防火墙规则。不要为了“方便连接”而关闭整个防火墙，也不要把路由器的 3389 端口转发到公网。

### PowerShell 方式

以管理员身份打开 PowerShell，执行：

```powershell
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' `
  -Name 'fDenyTSConnections' -Value 0
Enable-NetFirewallRule -DisplayGroup 'Remote Desktop'
```

确认服务正在运行：

```powershell
Get-Service TermService
```

## 四、从客户端连接

先在客户端安装 Tailscale 并登录同一 tailnet，确认主机状态为 **Connected**。

### Windows 客户端

1. 按 `Win + R`，输入 `mstsc` 并回车。
2. 在“计算机”中填写主机的 Tailscale IP 或 MagicDNS 名称，例如 `100.101.102.103`。
3. 点击“连接”，输入 Windows 账户名和密码。

### macOS、Linux、iOS 和 Android

安装 Microsoft 官方 Remote Desktop 客户端，新增 PC 时把主机地址填写为 Tailscale IP 或设备名称，再输入 Windows 账户凭据即可。首次连接出现证书提示时，核对设备名称后再接受。

连接前可用 Tailscale 自带的连通性检查：

```bash
tailscale ping <主机名称或IP>
```

看到 `pong` 说明 Tailscale 网络可达；若 ping 正常但 RDP 失败，问题通常在 Windows 版本、账户权限或防火墙规则。

## 五、安全加固建议

- 在 Tailscale 管理后台开启设备审批，定期删除不再使用的设备。
- Tailscale 账号启用多因素认证；Windows 账户使用强密码，避免与其他服务复用。
- 默认不开放公网端口。若 tailnet 中有多人，使用 ACL 只允许指定用户访问主机的 TCP 3389。
- 在 RDP 客户端中关闭“保存密码”，公共电脑上使用完立即退出 Tailscale。
- 保持 Windows、Tailscale 和远程桌面客户端更新。不要安装来路不明的 RDP 破解或“优化”工具。

一个最小 ACL 片段示例（按实际邮箱和设备名称修改）：

```json
{
  "acls": [
    { "action": "accept", "src": ["you@example.com"], "dst": ["tag:home-windows:3389"] }
  ],
  "tagOwners": { "tag:home-windows": ["you@example.com"] }
}
```

## 六、常见问题排查

### Tailscale 显示离线

检查主机是否联网、Tailscale 服务是否启动，并在托盘菜单中重新登录。命令行可执行 `tailscale netcheck` 查看网络环境。

### 能 ping 通，但 mstsc 提示无法连接

确认主机是支持 RDP 服务端的 Windows 版本；检查“远程桌面”开关、`TermService` 服务和 **Remote Desktop** 防火墙规则。若修改过端口，还需在客户端使用 `主机地址:端口`。

### 登录被拒绝

使用 `计算机名\\用户名` 或 `MicrosoftAccount\\邮箱` 的正确格式，确认账户已加入远程桌面用户组，并使用账户密码而不是 PIN。

### 连接很卡

先在 Tailscale 管理后台确认两台设备是否通过中继连接。尽量使用有线网络或 5 GHz Wi-Fi，降低 RDP 分辨率和色彩深度；视频剪辑、3D 应用等高带宽场景不适合 RDP。

## 七、停止使用时如何回滚

在 Windows 的“远程桌面”设置中关闭远程桌面，再从 Tailscale 管理后台删除设备，最后在应用和功能中卸载 Tailscale。若曾经手动添加防火墙规则，删除对应规则并确认路由器没有遗留端口转发。

完成这些步骤后，RDP 只存在于你的 Tailscale 私有网络内，不需要公网 IP、DDNS 或路由器端口映射，维护成本也更低。
