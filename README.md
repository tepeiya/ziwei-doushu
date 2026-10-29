<div align="center">

# 紫微斗数 · 开源排盘引擎

### 算法是公开的传统智慧，不应该被锁在围墙里

[![CI](https://github.com/tepeiya/ziwei-doushu/actions/workflows/ci.yml/badge.svg)](https://github.com/tepeiya/ziwei-doushu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)
[![Dataset: CC BY 4.0](https://img.shields.io/badge/dataset-CC%20BY%204.0-green.svg)](./DATASET-LICENSE)

**中文** · [English](./README.en.md)

</div>

> **📌 关于本 fork（`tepeiya/ziwei-doushu`）**：本仓库在上方开源排盘引擎之上，叠加了一套**商业化 + 生产化**改造——用户 / 会员 / 支付、AI 流式解读、合盘 / 流年、年度运势、分享 PDF、SEO 页、AI 输出审查，以及 Prisma+Postgres / Redis / 强密码哈希 / 启动期密钥校验等生产加固。上游 README 的「开源边界 / 协议」章节仍然有效（倪师原话仍限非商用）。本 fork 的部署与改造清单见 [部署指南.md](./部署指南.md) 与[第十一章](#十一商业化生产化改造本-fork-新增)。

> **2026-10-25 补充（本 fork）**：本 fork 已在开源引擎之上完成一套完整的**商业化 + 生产化**改造，成果位于 `feature/commercialization` 分支，主要包含——
> - **商业化闭环**：用户 / 会员 / 支付（月卡 · 年卡 · 单次，沙箱支付可闭环，预留微信 / 支付宝商户号）、AI 流式解读（SSE + 无 Key 降级）、合盘 / 流年 / 年度运势、分享海报与 PDF 导出、SEO 结构化内容页（182 页）。
> - **生产加固**：Prisma+Postgres 双数据层（未设 `DATABASE_URL` 时回退 JSON 文件）、Redis 缓存 / 限流（未设 `REDIS_URL` 时回退进程内内存、故障自动降级）、强参数异步 scrypt 密码哈希（版本化格式、旧数据兼容）、启动期生产密钥校验（占位 / 弱密钥拒绝启动）、AI 输出审查中间件（软过滤 + 硬阻断 + 免责尾注 + 审计钩子）。
> - **部署脚手架**：`Dockerfile`（Next 16 多阶段）、`docker-compose.yml`（app + Postgres + Redis + Nginx/HTTPS）、`.env.production.example`、[部署指南.md](./部署指南.md)。
>
> 上游 README 的「七、开源边界」「九、协议」仍然有效：倪海厦《天纪》原话仍限非商用，本 fork 已对相关内容做中性化改写并标注「无任何商业关联」。详见[第十一章](#十一商业化生产化改造本-fork-新增)。

> **2026-10-26 补充（本 fork）**：在 `feature/commercialization` 分支完成**前端重写 + 移动端适配**，已通过 `tsc`（0 错误）与 `next build`（231 个静态页全部生成）。要点——
> - **补全墨金设计系统**：新增 `--t-*` 设计令牌与 `.card-glass` / `.card-inner` 卡片类，使 `ChartBoard` / `InsightPanel` / `StarDetailPanel` / `PatternsCard` / `ChartSummary` / `TimeNav` / `PalaceCell` / `FamousPersonCard` / `ChatPanel` 共 9 个富组件恢复正确渲染；新增 `.with-tabbar` 工具类（移动端底部安全区内边距，md+ 复位）。
> - **统一导航壳 `SiteNav`**：桌面 sticky 顶栏（排盘 / 合盘 / 流年 / 年运 / 知识库 / 古籍库 + 主题切换 + 登录 / 我的）；移动端固定底部 Tab 栏（首页 / 排盘 / 合盘 / 知识 / 我的）；首页传 `header={false}` 仅显示底栏。
> - **重写 `/chart` 命盘工作台**：接入真实 `/api/chart`（含浏览器端 `generateChart` 兜底）、大限流年 `TimeNav`、AI 解读 `InsightPanel`（六维度 + 自由追问 + PDF 导出）、格局识别 `PatternsCard`、`/api/charts` 命盘存档，替换旧开源 Demo 占位。
> - **全站移动端适配**：合盘 / 流年 / 年运 / 知识库 / 古籍库 / 登录注册 / 我的 / 定价 / 支付 / 关于 / 隐私 / 条款 / 古籍章节 / 搜索 / SEO 落地页 / 预览页统一接入 `SiteNav` + `with-tabbar`，并移除旧版「开源版不含此接口」误导文案。
> - **构建期阻断修复**：`lib/ziwei/patterns.ts` 移除多余 `server-only`（纯计算模块，供客户端组件复用）；新增客户端 `components/Providers.tsx` 注入 `SessionProvider`，修复 `useSession` 在静态预渲染期的崩溃。

**一、项目理念**：紫微斗数是中国传统命理学的瑰宝，倪海厦老师在《天纪》中系统梳理了正宗的紫微斗数体系。我们希望通过技术手段让更多人接触和学习这门学问。

开源排盘算法和知识库，是因为我们相信：**算法是公开的传统智慧，不应该被锁在围墙里**。真正的价值在于解读的深度、用户体验的打磨、以及持续运营的积累。

**二、项目信息**：基于<strong>倪海厦《天纪》</strong>教学体系的紫微斗数排盘系统，包含完整排盘算法、四化系统、格局知识库、古籍原文数据，以及一套完整开源的紫微斗数解读数据：**v4.0 解读数据集——67.5 万张命盘 × 13 维 = 877 万段解读，正文约 204 亿字，解压后 56.6 GB**（2026-10-15 发布）。

| 数据集 | 命盘 | 解读段数 | 解压后 | 覆盖年份 | 每张盘解读字数 |
|---|---|---|---|---|---|
| **v4.0 解读数据集**（2026-10-15） | **674,976** | **8,774,688** | **56.6 GB** | **1950–2026**（只含真实日期） | **约 3.0 万字** |
| v3.0 样本数据集 | 518,400 | 6,739,200 | 33.1 GB | 1924–1983 | 约 2.1 万字 |
| 变化 | +30% | +30% | **+71%** | +17 年 | +44% |

<sub>v3.0 每张盘解读字数按 2,160 张盘抽样估算，其余数字为全量统计；两版每张盘都是 13 维。</sub>

在线体验：[metisziwei.com](https://metisziwei.com/?from=gh-readme)，排盘、AI 解读、命盘历史全部开放。

## 功能总览

本仓库**不是"只有排盘 + 合盘"两个功能**，而是一套**多模块的紫微斗数产品**。以下为当前代码与导航中实际存在的全部模块；部分功能需配置对应环境变量才完全可用，未配置时**优雅降级**（如 AI 解读缺 Key 时给出提示、支付走沙箱）。

### 核心命理功能

| 模块 | 路由 | 说明 |
|------|------|------|
| 排盘 | `/chart` | 命盘工作台：起盘、大限 / 流年导航 `TimeNav`、格局识别 `PatternsCard`、AI 六维解读 `InsightPanel`（自由追问 + PDF 导出）、命盘存档 |
| 合盘 | `/heming` | 双人命盘比对（倪师体系 `heming-knowledge.ts` 合命方法论） |
| 流年运势 | `/fortune` | 流年飞星分析（AI 流式 `/api/fortune`） |
| 年度运势报告 | `/annual` | 年度运势 PDF 命书（会员专享） |
| AI 解读 | `/api/interpret` | 六维度 + 自由追问的流式解读，无 Key 时降级为提示 |

### 内容与知识

| 模块 | 路由 | 说明 |
|------|------|------|
| 知识库 | `/knowledge` | 14 主星 × 12 宫位结构化知识（`lib/seo/`） |
| 古籍库 | `/library` + `/library/search` | 《紫微斗数全书》等原文 + 全文搜索（405 处古籍引证） |
| SEO 落地页 | `/seo` | 182 个结构化内容页，用于搜索引擎收录 |

### 账户与商业化（本 fork 新增）

| 模块 | 路由 | 说明 |
|------|------|------|
| 用户 / 会员 / 支付 | `register` / `login` / `profile` / `pricing` / `pay/*` | 月卡 · 年卡 · 单次，沙箱支付可闭环，预留微信 / 支付宝商户号 |
| 命盘存档 | `/api/charts` | 命盘历史记录 |

### 底层引擎能力（`lib/ziwei/`）

排盘内核还内置：大限 / 流年、四化与飞星（生年 / 大限 / 流年四化 + 自化）、十二神煞、1100+ 行格局知识库（紫府同宫、日月并明等）、真太阳时校正、晚子时换日策略、亮度流派切换；并附带已开源的 **v4.0 解读数据集（67.5 万盘 × 13 维 = 877 万段解读）**。

### 生产化能力（本 fork 新增）

健康检查 `/api/health`、结构化日志与全局异常捕获、集中式环境变量校验、AI 输出审查中间件、分享海报 / PDF、Redis 缓存与限流、Prisma+Postgres 双数据层（未设 `DATABASE_URL` / `REDIS_URL` 时回退 JSON 文件 / 内存）。

> **导航入口**：桌面端顶栏为 **首页 / 排盘 / 合盘 / 流年 / 年运 / 知识库 / 古籍库**；移动端底部 Tab 为 **首页 / 排盘 / 合盘 / 知识 / 我的**。
>
> **开源边界提醒**：本 fork 的界面**已重写**（不是"最小可运行示例"，见[第六章](#六界面从-demo-到产品前端)与[11.6](#116-前端重写与移动端适配本-fork-新增)），是一套完整可用的产品前端；但**线上商业版 `metisziwei.com` 的完整界面与功能仍不在开源范围内**。部分模块（AI 解读、支付、年运 PDF）需配好 `AI_PROVIDER` / `*_API_KEY`、`DATABASE_URL`、微信 / 支付宝商户号等才完全可用；确定性解读正文（`db-analysis.ts` / `STAR_DB`）目前仍为占位，需接入 v4.0 数据集等内容源。

> **注：关于六亲判断**
>
> 紫微斗数在六亲（父母、兄弟、子女等）判断上存在一定局限。倪师在《天纪》中指出：“斗数批六亲本来就比较差一点。”（[2上 · 00:25:27](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1527)）在传统术数中，铁板神数在核对六亲方面有其独特优势（[2上 · 00:03:15](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=195)）；倪师仍以紫微斗数为核心，是因为它能结合地理、环境与人事进行综合判断，形成“上知天文、下知地理、中知人事”的完整体系（[2上 · 00:25:43](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1543)）。因此，与六亲相关的分析仅供参考；[metisziwei.com](https://metisziwei.com/?from=gh-readme) 上父母、兄弟、子女三个维度也附有同样的说明。

---

## 目录

| | 章节 | 一句话 |
|---|------|--------|
| 〇 | [功能总览](#功能总览) | 排盘 / 合盘 / 流年 / 年运 / 知识库 / 古籍库 / 会员支付 + 引擎与生产化能力一览 |
| 一 | [本轮更新](#一本轮更新2026-10-15) | 13 维断语按倪师原话与《全书》逐句校正，发布 67.5 万命盘 × 13 维解读数据集 v4.0 |
| 二·新 | [13 维解读数据集 v4.0](#二新13-维解读数据集-v402026-10-15) | 2026-10-15 新版断语，67.5 万命盘，按年份下载 |
| 二 | [51.8 万命盘样本数据集](#二518-万命盘样本数据集) | 规格、下载、用途、许可 |
| 三 | [快速开始](#三快速开始) | 克隆到跑起来 |
| 四 | [排盘引擎](#四排盘引擎) | 能做到什么、文件怎么分、古籍数据 |
| 五 | [倪师《天纪·紫微斗数》原话](#五倪师天纪紫微斗数原话) | 14 讲 + 2 段补充、1848 条，一图看全，每条可回放 |
| 六 | [界面：从 Demo 到产品前端](#六界面从-demo-到产品前端) | 本 fork 已重写前端，与线上商业版仍有差距 |
| 七 | [开源边界](#七开源边界什么不在里面) | 什么开源、什么不开源 |
| 八 | [维护节奏与贡献](#八维护节奏与贡献) | 同步节奏、issue / PR 口径 |
| 九 | [协议](#九协议) | 代码 MIT / 数据 CC BY 4.0 / 古籍公版 / 倪师原话非商用 |
| 十 | [关于与联系](#十关于与联系) | 项目理念、技术栈、联系方式 |
| 十一 | [商业化生产化改造（本 fork 新增）](#十一商业化生产化改造本-fork-新增) | 功能、架构、环境变量、部署、合规 |
| 十二 | [小程序端（Taro）](#十二小程序端taro) | 技术栈、目录、构建运行、与 Web 端关系、进度 |

---

## 一、本轮更新（2026-10-15）

本轮跟随网站 2026-10-15 发版（网站内容版本 `ca268829f7a9`）：

![本轮更新总览](./docs/update-20261015.png)

**1. 发布 13 维解读数据集 v4.0** —— 674,976 张命盘（公历 1950–2026 年每一个真实日期 × 12 时辰 × 男女）× 13 维 = **8,774,688 段解读**，正文约 204 亿字。解压后 56.6 GB（v3.0 为 33.1 GB，增加 71%），压缩后只有 161 MB，按年份分 77 个文件，可以只下需要的年份，也可以一次下全年份总包。下载见 [Release v4.0-13d](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d)，规格和字段见[第二·新章](#二新13-维解读数据集-v402026-10-15)。发布前 77 个文件逐个解压，与原始数据逐字节比对一致。

**2. 13 维断语按倪师原话与《全书》原文逐句校正**（断语库仍不开源，校正结果体现在 v4.0 数据集里）：

- 标着倪师或《全书》却查不到出处的引文，删掉或换成逐字可查的原话；倪师原话注明《天纪》第几集、几分几秒
- 不会发生的四化（如七杀化权、紫微化忌）相关的句子删去；只在某种条件下才成立的断语补上条件
- 「力量强时……落陷时……」这类两头说的句子，改为按命盘只显示成立的那一种
- 健康：哪个脏腑要留意，改按倪师的看法——全盘杀星最集中的那一宫，按它的地支对应脏腑；不再按星的五行推脏器
- 网站知识库「古籍引证」由 244 处增至 405 处，每一处都能在《紫微斗数全书》原文里逐字找到

**3. 排盘引擎同步**（[PR #39](https://github.com/Renhuai123/ziwei-doushu/pull/39)）—— `dst-cn.ts` 新增 `chinaDSTSpan(year)`，查某年中国夏令时起止；`cities.ts` 补全省直辖县级单位与新疆兵团各市的经度（神农架、海南各市县、阿拉尔等），出生地选这些城市时真太阳时校正可用。

**4. 许可** —— [`DATASET-LICENSE`](./DATASET-LICENSE) 适用范围加上 v4.0；写明解读里引用的倪师原话不在数据授权范围内，与第五章倪师原话的 CC BY-NC-SA 4.0 一致。v3.0 样本数据集及其条款不变。

> **2026-10-24 补充**：项目理念移到页首——标题下居中一句「算法是公开的传统智慧，不应该被锁在围墙里」，紧接两段理念原文（前标「项目理念」），原有介绍段前标「项目信息」；第十章「项目理念」改为指向页首。

> **2026-10-20 补充**：星曜亮度默认改为《斗数全书》，与主流排盘软件默认一致，此前默认的「现代修正 v2」仍可在流派设置里选；补齐天姚、天刑、天喜、大耗、解神、截空、副截、旬空的亮度，月德不再标亮度。用 5 张金标准盘逐宫核对，星曜落宫与亮度全部吻合。注意：v4.0 数据集（10-15）是按旧默认「现代修正 v2」生成的，其中亮度字和少量随亮度变化的解读句会与新默认不同。

> **2026-10-06 ~ 10-07 补充**：README 加「注：关于六亲判断」（倪师原话 + 出处链接，中英两份）；网站链接加渠道码 `?from=`；同步倪师原话语料勘误（主星南斗、北斗归属）。

### 上一轮更新（2026-09-21）


> **2026-10-03 补充**：倪师《天纪·紫微斗数》原话 1848 条单独成章（第五章）；合并外部贡献 #29（时辰序号校验）；引擎拒绝不存在的公历日期，数据集补字段口径与已知问题；提交 package-lock.json；站点地址改为可配置；合盘演示改用本地引擎起盘、AI 接口缺失时明确提示；补齐贡献指南、行为准则、问题与 PR 模板；新增英文简介 [README.en.md](./README.en.md)；去掉两个用不上的部署工具包（vercel CLI、@cloudflare/next-on-pages），依赖从 483 个减到 185 个；随后升级到 Next.js 16 修掉 postcss 漏洞，GitHub 安全提醒从 51 条清零。

![本轮更新总览](./docs/update-20260921.png)

时隔三个月，本仓库完成一次完整更新（[PR #28](https://github.com/Renhuai123/ziwei-doushu/pull/28)，26 个文件、+2736 / −108 行）：

**1. 排盘引擎同步到线上口径** —— `algorithm.ts` 从 181 行到 641 行，另更新 sihua / types / constants / patterns / cities / famous；新增 8 个模块（1367 行）：

| 模块 | 作用 |
|------|------|
| `true-solar-time.ts` | 真太阳时校正（经度差 + 均时差） |
| `dst-cn.ts` | 中国 1986–1991 夏令时 |
| `lunar-solar.ts` | 农历 / 公历互转与闰月边界 clamp |
| `school-data.ts` / `school-tables.generated.ts` / `school-config.ts` | 星曜亮度流派数据与对照表、闰月与晚子时口径配置 |
| `shier-shen.ts` | 十二神煞 |
| `yunxian-context.ts` | 运限上下文（含童限） |

**2. 补上回归测试与 CI** —— 此前本仓库没有任何测试。现在 5 条排盘回归，`npm test` 一条命令跑完，每次 push 与 PR 在 GitHub Actions 上自动跑。

**3. 修掉样本时辰注释错位**（[#26](https://github.com/Renhuai123/ziwei-doushu/issues/26)）—— `famous.ts` 里 11 条名人样本有 7 条的时辰注释与 `hour` 索引不符（`hour` 一直是**时辰地支索引 0–11**，不是 0–23 的小时数）。已改正并加回归钉住。

**4. 积压 issue 从 18 条清到 4 条**，留下的都是还在走的。

**5. 文档与许可** —— 新增 [`DATASET-LICENSE`](./DATASET-LICENSE)；README 补齐引擎能力清单、维护节奏、开源边界；修正两处不实描述（数据集「口径与线上完全一致」、界面「完整的 Next.js 15 前端」）。

---

## 二·新、13 维解读数据集 v4.0（2026-10-15）

> **下载位置：上游仓库右侧 [Releases → v4.0-13d](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d)**

v4.0 用 2026-10-15 版网站断语库重新生成：13 个分析维度的断语已按倪海厦《天纪》逐字稿与《紫微斗数全书》原文逐句校正——查不到出处的引文删去或换成逐字可查的原话（倪师原话注明《天纪》集数与时间码），不会发生的四化相关句子删去，有条件的断语写明条件。

### 规格

| 项目 | 说明 |
|------|------|
| 命盘数 | **674,976 张**（公历 1950–2026 年 × 真实每月天数 × 12 时辰 × 男女） |
| 解读段数 | **8,774,688 段**（每张盘 13 维） |
| 维度 | 命格总览、性格、感情、事业、财运、健康、兄弟、子女、迁移、人际、田宅、福德、父母 |
| 大小 | 解压后 56.6 GB；压缩后 161 MB（77 个年份文件，zstd；另有一个全年份总包 `ziwei-interp-v4-all.tar`） |
| 正文 | 约 204 亿字，每张盘约 3.0 万字 |
| 生成方式 | 排盘引擎 + 断语库确定性生成，不经 AI，同一输入恒得同一输出 |
| 内容版本 | `ca268829f7a9`（与网站同期的 ANALYSIS_CONTENT_VERSION） |

**每行一张盘**（JSON Lines），字段：

| 字段 | 含义 |
|------|------|
| `k` | 键：`YYYY-MM-DD-时辰序号-性别`，如 `1990-01-01-0-male` |
| `y` / `m` / `d` | **公历**出生日期；只含真实存在的日期（不再有 2 月 30 日之类） |
| `h` | **时辰序号 0–11**（子 = 0 …… 亥 = 11），不是钟点；对照表见上一节 |
| `g` | `male` / `female` |
| `ms` | 命宫第一颗主星；命宫无主星时为 `null` |
| `t` | 各维字数 |
| `c` | 13 维解读全文（Markdown），键为 `overview` / `personality` / `love` / `career` / `wealth` / `health` / `family` / `children` / `move` / `friends` / `home` / `spirit` / `parents` |

**口径说明**
- 是本命盘视图的解读；网站上按读者当前年龄改写的句子、各维末尾附加的倪师法则段、AI 解读都不在数据集里。
- 按时辰序号直接排盘，未按出生地做真太阳时校正。

### 下载与解压

```bash
# 一次下全部：gh release download v4.0-13d --repo Renhuai123/ziwei-doushu -p "ziwei-interp-v4-all.tar"
# 只要某几年就只下那几年，例如 1990 年
zstd -d --long=27 year-1990.jsonl.zst          # 得到 year-1990.jsonl
shasum -a 256 -c SHA256SUMS.txt --ignore-missing # 校验
```

`--long=27` 必须带上（压缩时用了长窗口）。Windows 可用 [zstd 官方发布包](https://github.com/facebook/zstd/releases) 里的 zstd.exe，参数相同。

### 引文说明

解读里引用的倪海厦《天纪》原话**不属于本数据集的授权范围**：它们是为说明断语出处而注明集数与时间码的简短引用，著作权归原权利人；要把这些原话单独成批使用，按第五章倪师原话的 [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md) 处理。《紫微斗数全书》原文属公有领域。

### 许可

与 v3.0 相同：**CC BY 4.0，可自由商用，唯一要求是保留来源标注**（上面「引文说明」里的倪师原话除外），完整条款见 [DATASET-LICENSE](./DATASET-LICENSE)。引用时请写：

> 本项目使用了 **紫微斗数开源解读数据集 v4.0**（674,976 张命盘 × 13 维）
> 来源：https://github.com/Renhuai123/ziwei-doushu
> 作者：王多鱼AI

---

## 二、51.8 万命盘样本数据集

> **下载位置：上游仓库右侧 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 页面**

我们开源了一套完整的紫微斗数命盘样本数据集，覆盖 **51.8 万种排盘组合**（年 60 × 月 12 × 日 30 × 时 12 × 性别 2），每条样本包含完整的命盘结构和基于倪海厦体系的解读文本。

### 2.1 数据规格

| 项目 | 说明 |
|------|------|
| 样本数量 | **518,400 条** |
| 总大小 | 压缩后 5.5 GB（分 3 卷），解压后 33.1 GB |
| 体系 | 倪海厦《天纪》正统（纯飞星派已下线） |
| 内容 | 命盘 JSON + 13 主题解读文本（命格总览、财运、事业、感情、健康等） |
| 验证 | 男女命差异化 100%、健康含子午流注 100%、女命含妇科保养 100% |
| 口径 | 由 **v3 版排盘引擎 + 当期断语库**生成；线上引擎在持续更新，新版输出与本数据集可能有差异 |

**字段口径**（每条样本由 `birthInfo` 生成，常被看错的是 `hour`）：

| 字段 | 含义 |
|------|------|
| `birthInfo.year` / `month` / `day` | **公历**出生日期：1924–1983 年（一个完整甲子），每月取 1–30 日 |
| `birthInfo.hour` | **时辰序号 0–11**，不是 0–23 点钟：子 = 0、丑 = 1 …… 亥 = 11 |
| `birthInfo.gender` | `male` / `female` |
| `birthInfo.longitude` | 固定 120（东经 120°，未做各地真太阳时校正） |
| 文件名 `YYYY-MM-DD-hHH-性别.json` | 其中 `hHH` 同样是时辰序号，例如 `h11` 是亥时，不是上午 11 点 |

时辰序号与钟点对照：

| 序号 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 时辰 | 子 | 丑 | 寅 | 卯 | 辰 | 巳 | 午 | 未 | 申 | 酉 | 戌 | 亥 |
| 钟点 | 23–1 | 1–3 | 3–5 | 5–7 | 7–9 | 9–11 | 11–13 | 13–15 | 15–17 | 17–19 | 19–21 | 21–23 |

23:00–23:59 出生（晚子时）按次日排盘、时辰取 0；00:00–00:59 出生（早子时）按当日排盘、时辰同样取 0。

**已知问题：约 2,520 条样本的日期并不存在。** 生成时每个月都取了 1–30 日，所以 2 月 30 日，以及非闰年的 2 月 29 日也生成了样本，共 105 个日期 × 12 时辰 × 2 性别 = 2,520 条，占 0.49%。v3 引擎遇到这类日期不报错，而是顺延成 3 月 1–2 日排盘，所以这些样本的内容与对应的 3 月 1–2 日样本重复。使用时请过滤掉：`month = 2` 且 `day = 30`，或 `month = 2` 且 `day = 29` 且该年不是闰年。引擎从 2026-10-03 起会直接拒绝不存在的日期，下一版数据集不会再有这类样本。

### 2.2 下载方式

前往 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 下载以下文件：

```
ziwei-samples-v3-part1.zip.001  (1.9 GB)
ziwei-samples-v3-part2.zip.002  (1.9 GB)
ziwei-samples-v3-part3.zip.003  (1.8 GB)
SHA256SUMS.txt                  (校验文件)
```

下载后合并解压：

```bash
# macOS / Linux
cat ziwei-samples-v3-part*.zip.* > combined.zip
unzip combined.zip

# Windows (PowerShell)
Get-Content ziwei-samples-v3-part*.zip.* -Encoding Byte -ReadCount 0 | Set-Content combined.zip -Encoding Byte
Expand-Archive combined.zip
```

### 2.3 用途

- 微调小模型的训练语料（51.8 万 input-output 配对）
- AI 对话的 RAG 检索源
- 修改 `patterns.ts` 后做 A/B 基线对比
- 紫微斗数研究与数据分析

### 2.4 数据许可与引用

📂 **完全开源 · 可自由商用** —— 你可以在任何项目里使用这套数据，包括但不限于：

- 商业产品 / SaaS / 付费应用
- AI 模型微调（开源或闭源模型均可）
- 二次开发、再分发、衍生数据集
- 学术研究、技术博客、教学课程

无需付费、无需申请、无需事先告知。

**唯一的要求是保留数据来源标注（attribution）**：

> 本项目使用了 **紫微斗数开源样本数据集 v3.0**（518,400 条）
> 来源：https://github.com/Renhuai123/ziwei-doushu
> 作者：王多鱼AI

放在哪里都行：

- **网页 / 产品**：About 页 / 关于我们 / 数据来源 / 页脚，写一行链接即可
- **AI 模型**：模型卡（Model Card）或数据集卡（Dataset Card）的 "Training Data" 字段
- **学术论文**：参考文献或致谢章节
- **二次发布的数据集**：README 或 metadata 文件里注明上游来源

仅此一条，其余都自由。完整条款见 [DATASET-LICENSE](./DATASET-LICENSE)。希望这套数据能帮你做出好东西 —— 做出来记得来小红书 / 抖音 / 闲鱼 **@王多鱼AI** 打个招呼 👋

---

## 三、快速开始（本 fork）

```bash
# 克隆【本 fork】——注意是 tepeiya，不是上游 Renhuai123
git clone https://github.com/tepeiya/ziwei-doushu.git
cd ziwei-doushu

# 切到改造分支：本 fork 的商业化 + 生产化成果都在 feature/commercialization
# （fork 的 main 仍是上游旧内容，请勿直接基于 main 部署）
git checkout feature/commercialization

# 安装依赖
npm install

# 环境变量：开发用 .env.example，生产用 .env.production.example
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

本 fork 相比上游**已内置后端 API 路由**：用户 / 会员 / 支付、AI 流式解读（`/api/interpret`）、合盘 AI 分析（`/api/heming`）、流年、年度运势等均已实现，不再需要你自己补接口。要让这些能力真正可用，需按 [第十一章](#十一商业化生产化改造本-fork-新增) 配置对应环境变量（如 `AI_PROVIDER` / `*_API_KEY`、`NEXTAUTH_SECRET`、`DATABASE_URL`、`REDIS_URL`、微信 / 支付宝商户号）。未配置时功能会优雅降级（如 AI 解读缺 Key 时给出提示、支付走沙箱）。

本地验证：

```bash
npm run typecheck   # TypeScript 全量类型检查
npm test            # 排盘引擎回归（768 盘 × 紫微铁律、夏令时、立春边界、红鸾天喜、样本时辰一致性、时辰序号边界、日期合法性、同宫双四化）
```

> **上生产别用上面的开发方式直接起**：见 [部署指南.md](./部署指南.md) 与[第十一章 11.4](#114-生产部署)，用 Docker / Vercel / PM2+Nginx 起服务，并切换到 Postgres + Redis。

---

## 四、排盘引擎

排盘内核全部在 `lib/ziwei/`。

### 4.1 能做到什么（与常见排盘库的差异）

| 能力 | 说明 |
|------|------|
| **真太阳时校正** | 按出生地经度算时差 + 均时差，避免东西向差一个时辰 |
| **中国夏令时** | 1986–1991 年的夏令时区间自动扣除 |
| **闰月四种口径** | 闰月归前月 / 归后月 / 按日切分 / 按本月，可配置，不写死一派 |
| **晚子时换日** | 23:00–23:59 按次日排盘、00:00–00:59 按本日；换日策略可切换 |
| **星曜亮度 7 档** | 庙 / 旺 / 得 / 利 / 平 / 不 / 陷，另保留 3 档粗分类做显示降级 |
| **亮度流派可切换** | 不同流派（含主流排盘软件的不同版本）对辅星亮度判法不一致，做成开关而非写死 |
| **四化与飞星** | 生年四化、大限 / 流年四化、飞星自化 |
| **十二神煞** | 本命层按生年支起，流年层改按流年支起 |
| **格局判定** | 1100+ 行规则库（紫府同宫、日月并明、七杀朝斗等） |

### 4.2 文件怎么分

| 文件 | 说明 |
|------|------|
| `algorithm.ts` | 完整排盘流程：安命宫、定五行局、安十四主星、安辅星、排大限流年 |
| `constants.ts` | 天干地支、十四主星、辅星常量 |
| `sihua.ts` | 四化飞星系统（禄权科忌），含各天干四化对照表 |
| `patterns.ts` | **1100+ 行格局知识库**：紫府同宫、日月并明、七杀朝斗等经典格局判定规则 |
| `heming-knowledge.ts` | 合盘方法论：倪师体系下双盘比对逻辑 |
| `types.ts` | TypeScript 类型定义 |
| `cities.ts` | 中国城市经纬度，用于真太阳时校正 |
| `famous.ts` | 历史名人命盘示例数据 |
| `school-data.ts` / `school-tables.generated.ts` / `school-config.ts` | 星曜亮度流派数据与对照表、闰月与晚子时口径配置 |
| `shier-shen.ts` | 十二神煞（本命按生年支起、流年层按流年支起） |
| `true-solar-time.ts` | 真太阳时校正（经度差 + 均时差） |
| `dst-cn.ts` | 中国 1986–1991 夏令时年份与区间 |
| `yunxian-context.ts` | 运限上下文（含童限处理） |
| `lunar-solar.ts` | 农历 / 公历互转与闰月边界 clamp |

### 4.3 古籍原文（`lib/classics/`）

- **骨髓赋**（`gusuifu.ts`）— 紫微斗数核心歌诀
- **紫微斗数全集**（`quanji.ts`）— 清代古本
- **紫微斗数全书**（`quanshu.ts`）— 陈希夷传本

### 4.4 SEO 知识图谱（`lib/seo/`）

14 主星 × 12 宫位的结构化知识数据，可用于内容生成或知识库构建。

---

## 五、倪师《天纪·紫微斗数》原话

![倪海厦《天纪·紫微斗数》一图看全](./docs/tianji-ziwei/overview.png)

倪海厦《天纪》紫微斗数部分的原话共 **1848 条**：正课 14 讲（第 2–15 讲上半）加 2 段补充，按讲分成 16 个文件，放在 [`docs/tianji-ziwei/`](./docs/tianji-ziwei/)。每条都带出处时间，点一下就跳回 B 站原视频的那一秒。

- **怎么读**：先在上图里找到想看的主题，再点进对应那一讲，比如 [5上](./docs/tianji-ziwei/5%E4%B8%8A.md)（紫微在子）、[13上](./docs/tianji-ziwei/13%E4%B8%8A.md)（杀破狼、科权禄三会）。
- **从哪来**：取自姊妹仓库 [nihai-tianji-corpus](https://github.com/Renhuai123/nihai-tianji-corpus)，以语料库为准，会随语料库同步。
- **能不能商用**：**不能**。这一章的内容单独采用 CC BY-NC-SA 4.0，详见[九、协议](#九协议)。

---

## 六、界面：从 Demo 到产品前端

界面代码在 `app/` 与 `components/`。**本 fork 已经重写前端**（统一导航壳 `SiteNav`、移动端底部 Tab 栏、`/chart` 命盘工作台接入真实 API、9 个富组件恢复渲染，见[11.6](#116-前端重写与移动端适配本-fork-新增)），是一套**完整可用的产品前端**，而非"最小可运行示例"。仍需注意：**线上商业版 `metisziwei.com` 的完整界面与功能不在开源范围内**，两者仍有差距：

| 页面 / 组件 | 本 fork（已重写） | 线上商业版（非本仓库，上游口径） |
|------|------|------|
| 排盘页 `app/chart/page.tsx` | 182 行 | 1227 行 |
| 解读面板 `InsightPanel` | 501 行 | 5088 行 |
| 命盘方格 `ChartBoard` | 285 行 | 1334 行 |
| 宫位格 `PalaceCell` | 201 行 | 1192 行 |
| 合盘页 `app/heming/page.tsx` | 348 行 | 1937 行 |

> 线上商业版一列为上游对其商业产品的口径，不在本仓库内，数字仅供对比参考；本 fork 一列为当前仓库实际行数（重写前端后，`/chart` 已从原 demo 的 75 行增至 182 行）。

**本 fork 已实现并可用**：出生信息表单、命盘方格与宫位详情、本命 / 大限 / 流年切换、古籍阅读器（全文搜索）、命理百科（14 主星 × 12 宫位）、亮暗主题、移动端适配、AI 流式解读、合盘、分享、年度运势、会员 / 支付。

**本 fork 仍未接入**：确定性解读正文内容本身（`db-analysis.ts` / `STAR_DB` 仍是占位实现，需自行接入 v4.0 数据集等内容源）。也就是说，盘能画、交互齐全，但**开箱即用的解读正文尚缺**——这正是与线上商业版最大的差距，也是后续数据集集成轨道要补齐的部分。

> **本 fork 补充**：前端与商业化能力已在 `feature/commercialization` 分支落地（提交 `81d30f6` 起），详见[第十一章 11.6](#116-前端重写与移动端适配本-fork-新增) 与上方的 2026-10-26 补充；断语内容（`db-analysis.ts`）仍是占位，需接入解读数据。

---

## 七、开源边界：什么不在里面

| | 内容 |
|---|---|
| ✅ **开源** | 排盘引擎（`lib/ziwei/`）、古籍公版原文（`lib/classics/`）、SEO 知识图谱（`lib/seo/`）、Demo 界面、51.8 万样本数据集、13 维解读数据集 v4.0 |
| ❌ **不开源** | 断语库（`lib/ziwei/db-analysis.ts` 是占位，线上是上万行的 13 主题断语）、AI 解读 prompt、后端 API（`/api/interpret` 等）、用户系统（登录 / 会员 / 支付）、服务端安全（签名、防刷、水印）、部署配置 |

如果你需要 AI 解读能力，可以参考 `lib/ziwei/patterns.ts` 和 `heming-knowledge.ts` 里的知识库，结合任意 LLM 自行构建 prompt。

---

## 八、维护节奏与贡献

这个仓库是**排盘引擎 + 数据集的开放快照**，不是一个全职维护的开源产品，说清楚免得大家猜：

- **引擎同步**：随线上发版同步 `lib/ziwei/` 的引擎层并打 tag；断语库、AI 解读、商业站前端不在同步范围内。
- **Issue**：会看，但回复可能不及时；带复现步骤或具体盘例（年月日时 + 性别 + 哪一条不对）的问题优先处理。
- **PR**：欢迎，尤其是回归测试、口径修正、文档。动到排盘口径的改动请附上依据（古籍原文或可核对的对照）。

---

## 九、协议

本仓库分四部分授权。前三部分是宽松协议，**商用没有限制**；倪师原话目录**不许商用**：

| 内容 | 协议 | 简单说 |
|------|------|--------|
| **代码**（`lib/`、`app/`、`components/`） | [MIT License](./LICENSE) | 拿去随便用，保留 LICENSE 文件即可 |
| **数据**（Releases 中的 51.8 万样本数据集 v3.0、13 维解读数据集 v4.0） | [CC BY 4.0](./DATASET-LICENSE) · 要求 attribution | 商用也行，**注明数据来源即可** |
| **古籍原文**（骨髓赋、紫微斗数全集 / 全书等） | Public Domain | 古书都是公有领域，不存在版权 |
| **倪师原话**（[`docs/tianji-ziwei/`](./docs/tianji-ziwei/)） | [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md) | 可以引用、转载，注明出处；**不许商用**，改编后用同样协议 |

**一句话**：代码和数据拿去用，商用也行，把来源链接带上就行；倪师原话只限非商业的学习研究（数据集解读里引用的倪师原话同样不在数据授权范围内）。

---

## 十、关于与联系

### 项目理念

见本页开头。想自己搭？代码都在这里，拿去用。嫌麻烦？来 [metisziwei.com](https://metisziwei.com/?from=gh-readme) 直接用。

### 技术栈

- **框架**：Next.js 16（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS + CSS Variables「墨金」设计系统（含 `--t-*` 令牌、`.card-glass`、`.with-tabbar` 移动端适配）
- **排盘**：基于 [iztro](https://github.com/SylarLong/iztro) + lunar-javascript
- **动画**：Framer Motion

### 联系

- 线上平台：[metisziwei.com](https://metisziwei.com/?from=gh-readme)（已完成 ICP 备案：渝ICP备2026013379号-1）
- 提问题、提修复：见 [CONTRIBUTING.md](./CONTRIBUTING.md)；使用交流请到 [讨论区](https://github.com/Renhuai123/ziwei-doushu/discussions)
- 💕 发财的小手点一下：小红书 / 抖音 / 闲鱼 / X 关注 **王多鱼AI**，第一时间看上线 + 解锁更多紫微干货～

---

## 十一、商业化生产化改造（本 fork 新增）

> 本章只描述本 fork（`tepeiya/ziwei-doushu`）在开源引擎之上新增的能力。上游 README 的「七、开源边界」「九、协议」仍然有效：倪海厦《天纪》原话仍为 CC BY-NC-SA（**非商用**），本 fork 已对相关内容做中性化改写、标注「无任何商业关联」，商业化使用时仍须遵守该许可。

### 11.1 新增功能

| 模块 | 说明 |
|------|------|
| 用户与会员 | 账号密码注册 / 登录（Auth.js v4，JWT session）、会员状态、命盘历史 |
| 支付与套餐 | 月卡 / 年卡 / 单次套餐，沙箱模拟支付闭环，预留微信 / 支付宝商户号接入点 |
| AI 流式解读 | `/api/interpret` SSE 流式输出，无 Key 时优雅降级 |
| 合盘 / 流年 / 年度运势 | 双盘比对、流年分析、`/annual` 年度运势报告 + PDF 导出 |
| 分享与 SEO | 分享海报、PDF 导出、`/seo` 下 182 个结构化内容页 |
| AI 输出审查 | 软过滤（绝对化措辞中性化）+ 硬阻断（诈骗 / 医疗断言 / 高危绝对化）+ 免责尾注 + 审计钩子 |
| 生产加固 | Prisma+Postgres 双数据层、Redis 缓存 / 限流、强参数密码哈希、启动期密钥校验 |

### 11.2 架构与目录（新增部分）

| 路径 | 作用 |
|------|------|
| `lib/auth.ts` | Auth.js 配置（Credentials + JWT） |
| `lib/db/index.ts` | 数据层：设 `DATABASE_URL` 走 Prisma+Postgres，否则回退 JSON 文件 |
| `lib/billing/index.ts` | 套餐 / 会员权益定义 |
| `lib/server/{llm,prompt,moderation,cache,ratelimit,secrets}.ts` | AI 客户端、解读 prompt、审查管道、缓存、限流、密钥校验 |
| `prisma/schema.prisma` | User / Membership / SavedChart / Order 四张表 |
| `app/api/{auth,register,chart,interpret,heming,fortune,charts,pay}/*` | 业务接口 |
| `app/{login,register,profile,pricing,pay,annual,fortune,seo}/*` | 页面 |
| `middleware.ts` | Edge 粗防护（限流兜底） |
| `instrumentation.ts` | 服务端启动钩子：校验生产密钥 |
| `Dockerfile` / `docker-compose.yml` / `.env.production.example` / `部署指南.md` | 部署脚手架 |

### 11.3 环境变量

开发：`cp .env.example .env.local`；生产：`cp .env.production.example .env.production`。关键变量：

| 变量 | 必填（生产） | 说明 |
|------|------|------|
| `NEXTAUTH_SECRET` | ✅ | 强随机，跨实例一致；占位值将被启动校验拦截（`openssl rand -base64 48`） |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` | ✅ | 生产 HTTPS 域名 |
| `AI_PROVIDER` / `*_API_KEY` / `OPENAI_*` | 用 AI 解读时 | OpenAI 兼容协议，缺省降级 |
| `DATABASE_URL` | 切 PG 时 | `postgresql://user:pass@host:5432/db`；不设则回退 JSON |
| `REDIS_URL` | 切 Redis 时 | `redis://host:6379`；不设则回退进程内内存 |
| `WECHAT_*` / `ALIPAY_*` | 真实收款时 | 企业商户号；留空走沙箱 |
| `PASSWORD_SCRYPT_COST` | 否 | 密码哈希成本（2^14~2^17，默认 16384） |
| `MODERATION_*` | 否 | AI 审查词表开关 |

### 11.4 生产部署

完整步骤见 [部署指南.md](./部署指南.md)（三种方式：Docker 编排 / Vercel / PM2+Nginx）。要点：

1. **数据层**：设 `DATABASE_URL` 后 `npx prisma migrate deploy` 建表，应用自动切 Postgres。
2. **缓存 / 限流**：设 `REDIS_URL` 后自动切 Redis（多实例共享、重启不丢）。
3. **密钥**：`NEXTAUTH_SECRET` 必须为强随机；生产启动会拒绝占位值。
4. **构建运行**：`npm ci && npm run build && npm start`（Docker 已写好多阶段镜像）。

### 11.5 合规与许可

- 定位为「传统紫微斗数 / 文化娱乐」，全站显著免责，避免医疗、投资建议等表述。
- 中国大陆运营须完成 **ICP 备案 + 公安备案**，经营性视属地口径办理许可证后再对公众收费。
- 支付须走**企业商户号**（微信 / 支付宝），个人无法合规收款。
- 倪师《天纪》相关品牌词已中性化、标注「无任何商业关联」；商业使用其原话仍受 CC BY-NC-SA（非商用）约束。
- 数据集仍按上游 CC BY 4.0（商用须署名），详见 [DATASET-LICENSE](./DATASET-LICENSE)。

### 11.6 前端重写与移动端适配（本 fork 新增）

本 fork 在 `feature/commercialization` 分支完成前端重写（提交 `81d30f6`，2026-10-26），让既有富组件与真实后端 API 真正落地，并做到移动端可用。

| 改动 | 说明 |
|------|------|
| 设计系统 | `app/globals.css` 新增 `--t-*` 设计令牌（映射 `--bg-*/--tx-*/--ac`）与 `.card-glass` / `.card-inner` 卡片类，9 个富组件恢复渲染；新增 `.with-tabbar` 移动端安全区内边距工具类 |
| 统一导航 `components/SiteNav.tsx` | 桌面顶栏 + 移动端底部 Tab 栏；传 `header={false}` 时仅渲染底栏（用于带自有 Hero 的首页） |
| 命盘工作台 `app/chart/page.tsx` | 重写为接入真实 `/api/chart` 的工作台：大限流年 `TimeNav`、AI 解读 `InsightPanel`、格局 `PatternsCard`、命盘存档 `/api/charts` |
| 全站接入导航 | 合盘 / 流年 / 年运 / 知识库 / 古籍库 / 登录注册 / 我的 / 定价 / 支付 / 静态页 / 古籍章节 / 搜索 / SEO / 预览页统一包 `with-tabbar` + `<SiteNav />`，并移除旧版「开源版不含此接口」误导文案 |
| 会话上下文 `components/Providers.tsx` | 客户端边界注入 `SessionProvider`（`useSession` 在 App Router 下必需），在 `app/layout.tsx` 挂载 |
| 构建修复 | 移除 `lib/ziwei/patterns.ts` 多余 `server-only`（纯计算，供客户端复用） |

**验证**：`npx tsc --noEmit` 0 错误；`npx next build` 成功，生成 231 个静态页面（含 182 个 SEO 落地页、古籍章节等），API 路由全部就绪。

## 十二、小程序端（Taro）

本 fork 另含一个 **Taro 小程序端**（目录 `miniprogram/`），与 Web 端共享同一套排盘引擎与设计语言，目标是把产品分发到微信/支付宝等轻量场景。

### 技术栈与目录

- **Taro 3.6（React + TypeScript）**：一套代码可编译到微信 / 支付宝 / 抖音等多端。
- 目录结构：`miniprogram/src/{pages,components,lib,engine}`，引擎通过 Taro alias `@engine` 直接复用仓库根目录的 `lib/ziwei`（**排盘在设备端本地计算，无需联网**）。
- 设计系统沿用 Web 端的「墨金」令牌（`src/theme.ts` / `src/app.css`）。

### 构建与运行

```bash
cd miniprogram
npm install
npm run dev:weapp      # 开发：监听编译到 dist/，用微信开发者工具打开
npm run build:weapp    # 生产：编译到 dist/
```

导入微信开发者工具时，`project.config.json` 默认用 `touristappid`（游客模式），正式发布请替换为你自己的 AppID。

### 与 Web 端的关系

| 端 | 定位 | 负责 |
|----|------|------|
| Web 端（`app/`） | 完整 SaaS | 后端 API、AI 解读、会员 / 支付、年运 PDF、古籍全文检索 |
| 小程序端（`miniprogram/`） | 轻量引流 + 本地排盘 | 设备端排盘 / 合盘 / 可视化；联网功能通过 `src/lib/api.ts` 调用 Web 端 |

小程序端的联网模块（流年 / 年运 / 会员 / 支付 / 古籍检索）页面已建好，只需在 `miniprogram/src/lib/api.ts` 把 `API_BASE` 指向已部署的 Web 端域名即可启用；未配置时自动降级为「待接入」提示，不影响本地排盘 / 合盘。

### 当前进度

- ✅ 已完成：本地排盘（命盘 4×4 环布局）、宫位详情、星曜亮度 / 五行 / 大运可视化、双人合盘比对、14 主星知识库。
- 🟡 待接入：流年 / 年运 / AI 解读 / 会员 / 支付（依赖 Web 端 `API_BASE`）；确定性解读正文（`STAR_DB`）与 Web 端一样，仍待 v4.0 数据集接入。
- 作为**专家 / 渠道前端**的潜力：排盘引擎已可在端侧运行，可封装为 WorkBuddy 专家可调用的算力入口（详见上方「商业化」讨论）。
