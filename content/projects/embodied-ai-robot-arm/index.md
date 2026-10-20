---
title: "具身智能与机械臂学习"
slug: "embodied-ai-robot-arm"
date: 2026-10-20
description: "以机械臂操作为载体，探索机器人仿真、数据采集、策略学习与仿真到真实迁移。"
status: "live"
featured: true
emoji: "🦾"
tags: ["具身智能", "机械臂", "LeRobot", "MuJoCo", "Isaac Lab"]
---

我正在以机械臂任务为载体，实践具身智能从仿真环境、数据采集到策略训练和评估的完整链路。当前以 [LeRobot](https://github.com/muye26lab/lerobot) 为基础，围绕 MuJoCo 与 Isaac Lab 搭建实验环境，逐步比较不同策略在任务中的表现。

## 当前实践

- **仿真任务**：在 MuJoCo 中实现机械臂 Reach 与 Pick-and-place 任务，并建立脚本控制基线。
- **数据链路**：支持 LeRobotDataset 记录、读取与轨迹回放，包含任务描述、视频导出和闭环评估。
- **Isaac Lab**：打通 Reach 环境、PhysX step、多环境 scripted rollout 和数据采集；正式策略评估仍待完成。
- **策略实验**：完成 PPO 基线和 state-only TD-MPC 小规模训练。TD-MPC 当前三种子平均成功率为 `0.327`，仍属于早期基线，不能代表可部署能力。

## 接下来

近期将扩大采集数据，完成 Isaac Lab Reach 多种子评估和策略训练，再扩展到 Pick-and-place。后续会探索相机观测与 Pi0 等视觉策略；目前数据集还没有图像字段。仿真到真实迁移也尚未开始，需要先明确目标机械臂及其控制接口。

## 项目资料

- [代码仓库](https://github.com/muye26lab/lerobot)
- [项目框架与进度概览](https://github.com/muye26lab/lerobot/blob/main/docs/project-overview.html)
