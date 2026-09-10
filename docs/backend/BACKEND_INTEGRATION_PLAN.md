# TODAYSMISSION 后端接入计划书

> 版本：v0.1，2026-08-31。状态：接入方案草案，尚未开始后端实现。
> 适用场景：前端继续迭代，同时分批接入真实内容、认证和个人数据。
> 本轮已完整阅读 [后端接入手册](D:/todaysmission/todaysmission/BACKEND_INTEGRATION_GUIDE.md)，并核对当前工作区代码、前端计划和原产品计划的相关章节。
> 当前 HEAD：`62e0f3e`；已有未提交前端修复属于基线，不能只按 HEAD 重建项目。
> 本文是执行顺序与决策记录，不是安装依赖、修改 UI、创建数据库或发布生产环境的授权。

## 1. 目标与执行方式

第一阶段目标是让**现有浏览体验使用真实数据**：公开 Pack、Pack 内 Mission、当前用户昵称、用户 Pack、完成日历、某日完成内容，以及真实 Logout。

不要求前端全部完成后才能接后端，也不把一次接入当成冻结全部产品设计。采用以下方式推进：

1. 先稳定数据身份、内容契约和权限边界，再逐个替换 Repository。
2. 卡片排版、SVG、尺寸与动效留在前端，数据库提供内容和有限的展示配置。
3. 每个批次包含自己的输入、改动范围、验证和退出条件；前端小修改可以插入当前阶段，不重启整份计划。
4. 新增业务规则只在用到它的阶段确认；未定的语音、Profile 不阻塞公开内容读取。
5. 区分“真实读取接通”“用户能真实完成任务”“可上线”三个里程碑，不能混称为后端全部完成。

继续使用原定的 **Next.js + Supabase Auth / PostgreSQL / Storage**，不另搭独立后端服务器。Storage 在语音等实际资源需求出现时再接，不作为卡面渲染的前置依赖。

本轮不处理登录界面、Take / Complete 实现、语音、Profile、CMS、部署及生产写入。它们的依赖和接续位置会在本文列出。

## 2. 卡片实现核查与目标结构

### 2.1 当前代码是不是 HTML/CSS + SVG？

**准确结论：当前主卡片已经是 HTML/CSS 排版，不是整张图片；但 Pack 和 Mission 卡面还没有接入 SVG 图形，主要使用文字符号和 CSS 装饰。**

| 对象 | 当前实现与证据 | 与目标的关系 |
| --- | --- | --- |
| 首页 Pack、Pack 详情封面 | [PackDeck.tsx](D:/todaysmission/todaysmission/features/packs/components/PackDeck.tsx:14) 的 `PackDeckCover` 用 `span` 渲染标题、描述、编号、数量；`deck.symbol` 直接作为文本节点 | HTML 部分已具备；图形尚是字符 |
| Pack 堆叠背卡 | 同文件的 `PackDeck` 用三个装饰性 `span` 和 [PackDeck.module.css](D:/todaysmission/todaysmission/features/packs/components/PackDeck.module.css) 绘制 | CSS 堆叠，不是三张真实 Mission 缩略图，也不需要为它们发请求 |
| Mission 卡面 | [MissionStreamCard.tsx](D:/todaysmission/todaysmission/features/packs/components/MissionStreamCard.tsx:8) 使用 `article/div/h2/p`，读取 `card.title/note/tag/code`；`card.symbol` 是文本 | HTML 部分已具备；圆、方、三角等主要来自 `● ■ ▲ ◆ ◐` 字符 |
| 卡面装饰 | [MissionStreamCard.module.css](D:/todaysmission/todaysmission/features/packs/components/MissionStreamCard.module.css) 与 Pack CSS 用伪元素、圆形、斜条、渐变、阴影实现 | 已是 CSS，不需要重做为图片 |
| 现有 SVG | [CalendarMonth.tsx](D:/todaysmission/todaysmission/features/calendar/components/CalendarMonth.tsx:25) 的日历网格，以及 [HomeUserMenu.tsx](D:/todaysmission/todaysmission/features/packs/components/HomeUserMenu.tsx:77) 的图标 | 项目使用 SVG，但不能据此称卡面已是 HTML/CSS + SVG |
| 旧照片组件 | [PackCard.tsx](D:/todaysmission/todaysmission/components/card/PackCard.tsx:1) 仍使用 `next/image` | 在当前 `app/components/features` 源码中未发现其调用；不是现行卡片主链路 |
| 图片字段 | [pack-summary.ts](D:/todaysmission/todaysmission/data/contracts/pack-summary.ts) 仍必填 `imageSrc/imageAlt`；[pack-fixtures.ts](D:/todaysmission/todaysmission/data/fixtures/pack-fixtures.ts) 仍含 Picsum URL | 属于遗留契约，不应成为新数据库的卡片必填图片模型 |

调用链也已核对：`ArcCarousel` / `NativePackCarousel` → `PackDeck`；`MissionGallery` → `PackDeckCover` / `MissionStreamCard`。以上结论来自源码核查，本轮没有打开浏览器做视觉验收。

另外，当前主体几何按 `1 / 1.42` 计算；全局仍残留 `--card-ratio: 3 / 4`。这是后续可单独整理的历史差异，本轮不统一比例，也不按旧计划恢复照片式卡片。

### 2.2 按本次方向采用的结构

| 层 | 负责什么 | 数据来自哪里 |
| --- | --- | --- |
| HTML | 标题、说明、标签、编号、数量、以后确认的业务操作 | Repository 返回的内容 DTO |
| CSS | 卡片比例、排版、颜色应用、堆叠、响应式、动画 | 前端代码与有限主题配置 |
| SVG | 几何符号、徽记、线条、插画等矢量图形 | 前端审核过的 SVG 组件，由图形 key 选择 |
| 后端 | 内容、稳定 ID、排序、发布状态、用户进度，以及必要的主题/图形 key | PostgreSQL 与 Auth |

推荐继续沿用 `PackDeckCover` 和 `MissionStreamCard` 的职责，在图形区域增加共享的小型 SVG 渲染组件。两类卡片不必强行合并为一个万能组件。

约定：

- 数据库不保存整张卡片截图、HTML、CSS 字符串或可执行 SVG 标记。
- 普通文案保持文本节点，不使用 `dangerouslySetInnerHTML` 注入后端内容。
- 后端存 `artwork_key` 一类的有限标识；前端用显式注册表找到本地 SVG，不按任意字符串动态导入文件。
- 只有出现多种真实排版时才增加 `template_key`；本阶段不造模板引擎、在线设计器或 CMS。
- 第一批可以沿用现在的配色字段，验证合法颜色；若后续统一主题，再增加主题 key。字号、间距、动画时长不入库。
- 文字符号可作为过渡兼容；未知图形 key 使用已约定的默认图形并记录诊断，不导致整页失效。
- SVG 使用明确的 `viewBox` 和尺寸，不让加载或图形变化撑开卡片；装饰性 SVG 不增加焦点或重复读屏内容。
- Gallery 存在循环副本，SVG 的渐变、mask、clipPath ID 必须按渲染实例隔离，不能只用 Mission ID，避免副本互相引用。

### 2.3 渐进迁移，不与后端切换绑成一次大改

1. 保留当前卡面与 DTO，把正式内容整理完整，确认哪些图形保持、哪些改成 SVG。
2. 在独立的小批次中为 `deck/card` 增加可选图形 key；让新字段存在时渲染 SVG，旧 fixture 暂时走符号回退。先替换一个 Pack 与一个 Mission 验收，再扩展。
3. 对图片字段做调用点检查，把当前主链路的 `imageSrc/imageAlt` 从必填兼容字段逐步改为可选或移出。处理旧 `PackCard` 的明确图片输入；不为了通过类型检查生成假 URL，也不强迫数据库保存无用图片列。
4. 真实数据映射保证完整 `deck/card`；当前类型的可选性不代表正式内容可以长期缺少排版字段。
5. 清理旧照片组件、fixture URL、Next 图片白名单放在单独的清理批次；确认无引用后再做，不混入认证修改。

用户已明确卡片采用 HTML/CSS + SVG 的方向；后续需要确认的是具体图形与视觉变化，不重复询问是否允许采用这个方向。

## 3. 当前接入基线与主要缺口

| 项目 | 当前事实 | 接入动作 |
| --- | --- | --- |
| 运行依赖 | Next.js `16.3.3`、React `19.2.8`；未安装 Supabase SDK | 保持框架版本，接入时锁定所选 SDK 版本 |
| 数据层 | `data/fixtures` → `data/repositories` → 页面 Props | 沿用边界，换成异步查询与 Mapper |
| 首页 | [app/page.tsx](D:/todaysmission/todaysmission/app/page.tsx) 同步读 mock 用户与内容 | 改成异步组装；认证后并行读取互不依赖的个人数据 |
| Pack 详情 | [Pack 页面](D:/todaysmission/todaysmission/app/pack/[slug]/page.tsx) 已异步解析 `params`，内部查 fixture | 查询真实 Pack 与有序 Mission；另定公开内容缓存策略 |
| 日期详情 | [完成日期页面](D:/todaysmission/todaysmission/app/completed/[date]/page.tsx) 枚举 fixture 日期静态生成 | 去掉个人日期枚举，按请求身份读取 |
| 认证与退出 | `loggedOut` 只存在于前端内存，Logout 只把名字改成 Guest | 接 Cookie 会话与真实退出；清除旧账号个人数据 |
| 日历范围 | [CalendarCarousel.tsx](D:/todaysmission/todaysmission/features/calendar/components/CalendarCarousel.tsx:34) 初始化时固定范围，今天取设备日期 | 统一日期口径；处理账号变更、跨午夜与时区更新 |
| 返回快照 | [pack-carousel-return-state.ts](D:/todaysmission/todaysmission/features/packs/model/pack-carousel-return-state.ts) 使用模块内存，无清空 API | 添加清理/用户隔离；普通刷新仍按稳定 ID 恢复 |
| 内容规模 | all 默认最多展示 12 个，三个轮盘相关组件设有 24 上限 | 13–24 的可达性与超过 24 的方案单独验收；查询成功不等于用户能看到 |
| 原型文案 | 日历 SVG 描述仍写“模拟记录”，Mission 业务标题可能是 `Mock Mission` | 正式内容批次同步处理无障碍描述、业务标题与卡面标题 |

本轮重新执行 `npm test`：**286 项通过，0 失败**。本轮未重新运行 lint、类型检查和 build；手册记载的这些通过结果属于上一轮基线，不冒充本轮结果。

## 4. 后端与前端的边界

```text
Supabase Auth / PostgreSQL
          ↓ 当前请求的可信身份、RLS
server-only Repository
          ↓ 校验、排序、字段选择、Mapper
前端 DTO
          ↓ Server Page 组装
现有 Home / Gallery / Calendar
          ↓
HTML + CSS + 本地 SVG

后续写入：用户操作 → Server Action → 鉴权/校验/数据库约束 → 成功结果 → 安全时机更新界面
```

### 4.1 职责规则

- Server Page 直接调用 Repository，不反向请求本应用 `/api/...`。
- 服务端客户端与查询模块用 `server-only` 隔离；客户端组件只接最小、可序列化 DTO。
- Repository 使用当前请求身份，不建立跨用户复用的全局会话客户端；用户 ID 不从浏览器参数直接采信。
- 图形组件不查数据库，卡片不各自请求；一个 Pack 详情按批读取内容，避免逐张卡查询。
- Logout、Take、Complete 使用业务边界清楚的 Server Action；即使页面检查过身份，Action 也要重新检查。
- Proxy 负责会话刷新衔接等必要工作，不读取整套业务数据，也不作为唯一授权防线。
- 不因接入引入 React Query、SWR、Realtime、全局状态容器或动画库；有实际需要时再评估。
- 只在实际认证回调、外部客户端、Webhook 等需要 HTTP 入口时新增 Route Handler。

### 4.2 分阶段新增的目录

以下是拟新增位置，不表示文件已经存在，也不要求一次建齐：

```text
lib/supabase/
  server.ts              # 当前请求 Cookie 下的客户端
  client.ts              # 浏览器认证确有需求时添加
  proxy.ts               # 会话刷新衔接
proxy.ts                 # Next.js 16 根入口
data/
  contracts/             # 保持现有 DTO，按需补当前用户/操作结果
  mappers/               # Pack、Mission、日期与资料映射
  repositories/          # 替换现有 fixture 实现
  database.types.ts      # 接真实 schema 后生成，不交给 UI 依赖
features/auth/           # 本阶段确需的 Action；UI 确认后再添加
supabase/                # 环境确定后的迁移、开发种子和权限验证资料
```

认证、日期、图形各自独立，不创建一个同时管理用户、动画、缓存和业务的“大 Store”。

## 5. 数据契约与领域模型

### 5.1 Repository 目标

| 读取入口 | 返回目标 | 关键语义 |
| --- | --- | --- |
| `getPacks()` | `Promise<readonly PackSummary[]>` | 可浏览已发布内容，显式稳定排序 |
| `getPackBySlug(slug)` | `Promise<PackDetail \| null>` | Pack 可见性与 Mission 可见性一致；Mission 按内容顺序排序 |
| 新 `getCurrentUser()` | 最小当前用户 DTO 或 `null` | 无会话可返回 `null`；认证服务故障不能假装 Guest；昵称缺失走明确资料规则 |
| `getJoinedPacks()` | `Promise<readonly PackSummary[]>` | 先取得可信身份，再按确认后的“参与”定义查询 |
| 新 `getMissionCalendar()` | `Promise<MissionCalendarData>` | 已登录用户的注册日期、去重排序完成日期；取代 mock 命名 |
| `getCompletionDates()` | `Promise<readonly string[]>` | 当前用户范围的聚合；可作为日历 Repository 内部读取 |
| `getCompletedMissionsByDate(date)` | `Promise<CompletedMissionDay \| null>` | 严格日期校验、当前用户、当天完成、跨 Pack、稳定排序 |

此表的函数名和输出是接入目标，不是已实现 API。个人 Repository 在服务端内部获得或复用可信认证上下文，不提供让客户端指定任意 `userId` 的读取入口。

Guest 不调用个人读取再捕获错误伪造成“没有完成”。首页应显式区分 Guest 和已登录无记录；当前 `calendar` 必填，因此接入认证时需要一处小范围契约调整，不能硬塞假注册日期来保持 Props 完全不变。

### 5.2 内容与身份

- Pack / Mission ID 稳定，Pack 详情和日期详情对同一 Mission 使用同一个 ID。种子更新不能每次重建 ID。
- Pack slug 唯一且可稳定查找；Mission slug 按原有一对多模型在 Pack 内唯一即可。
- `deck.number`、`card.code`、图库显示序号均是展示信息，不是主键。
- 正式 `mission.title` 与 `card.title` 对齐内容含义；允许展示换行差异，但不保留一个正式标题和一个 `Mock Mission` 的双重身份。
- `deck.missionCount` 从当前可见 Mission 内容计算，不能用固定 8，也不能拿完成数替代。
- 多语言内容由 Mapper 选择成单一语言 DTO；先保留可扩展内容字段，不顺便添加 locale 路由或自动翻译。
- 业务字段、图形 key、颜色、长度在数据边界校验。缺失内容和未知装饰要有不同处理，不能把损坏正文包装成正常内容。

### 5.3 最小数据模型方向

以下是对原模型的增量建议，**不是已批准 schema 或可执行迁移**；有既有数据库时以检查结果做适配，不重建同名表。

| 领域 | 第一阶段需要的数据 | 延后或依赖决策 |
| --- | --- | --- |
| Auth 用户 + `profiles` | 可信用户 ID、昵称、注册时刻来源 | 时区；头像与 Profile 编辑后续接。profile 补建时间不能冒充账户注册时间 |
| `packs` | ID、slug、本地化标题/描述、发布状态、排序、封面编号、颜色或主题标识、图形标识 | 旧 `card_asset` 不再作为整卡图片必填条件 |
| `missions` | ID、pack_id、Pack 内 slug、本地化标题/说明、标签、展示 code、发布状态、排序、颜色/图形标识 | 只在明确需要时新增独立模板；不改成多对多 |
| `mission_progress` | user_id、mission_id、status、taken_at、completed_at | 是否允许重复完成，决定唯一约束以及是否另加完成事件 |
| 用户 Pack | 从进度推导，或显式参与关系 | 等参与定义确认；不自动创建 membership 表 |
| `mission_voices` / Storage | 本轮不建 | 播放/上传范围、可见性和产品规则另行确认 |

选择普通字段还是小型结构化展示字段，以实际 schema 和编辑需求为准。需要查询、排序、约束的业务字段保持明确；不把整个数据库行、自由 JSON 或 UI 配置透传给组件。

Pack 完成度继续由可见 Mission 与进度计算，不单独维护第二份 Pack Progress。以日期浏览的 Gallery 是完成记录的视图，不创建“日期 Pack”。

### 5.4 日期规则与一致性

建议保存服务端可信完成时刻；如果产品决定历史日期不随旅行/时区切换改变，再保存完成时确定的业务日期和时区。该建议需在日期阶段确认，不先固定为服务器时区或当前设备时区。

验收必须同时覆盖：

- 注册日期、日历“今天”、完成标记、当天详情采用同一产品口径；禁止直接截取 UTC 时间戳作为所有用户日期。
- `completedOn` 去重排序；当天 Mission 使用确定顺序，例如完成时刻再加稳定 ID，第一张共享转场卡不能随机变化。
- 当前 DTO 一天按 Mission ID 去重。若未来同一 Mission 多次完成需要显示多张，必须引入完成记录身份，不能直接去掉去重却保留原有 key。
- 非法日期、注册前、未来日期、有效但无记录日期分别定义结果；权限变化和内容下架后，日历标记与详情使用一致过滤口径。
- 日历范围不能只更新 Props 而沿用旧 `useState` 初始化值；账号变更要重建个人范围，普通内容刷新保留月份，跨午夜在安全时机更新。
- 第一阶段可整体读取有限历史日期；将来按月加载应显式改契约，不能悄悄截断历史日期使旧月失去标记。

## 6. 认证、权限、错误与缓存

### 6.1 认证与环境

1. 实施前确定 Supabase 开发项目，检查现有 schema、权限、Auth 配置、迁移历史与环境隔离；未指定项目时不猜测一个已有项目进行写入。
2. 环境只使用必要的 Project URL 与 publishable key；secret / service_role 不进浏览器、不进 `NEXT_PUBLIC_`，常规用户请求不依赖管理员客户端。
3. 原产品登录方式是 Email OTP。需要确认实际邮件模板、SMTP、发送限制与回调配置，不默认为 Magic Link，也不为测试擅自发邮件。
4. 身份验证按当前官方指引使用 `getClaims()`；需要最新 Auth 用户资料时使用 `getUser()`。`getSession()` 中的用户对象不能单独作为可信授权依据。参考 [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)。
5. Next.js 按本地版本使用异步 `cookies()` / `params`；在允许写 Cookie 的边界续接会话，保持请求与响应 Cookie 一致。Proxy 不能取代 Repository / Action 授权。
6. Logout 成功后失效个人读取、清理返回快照和旧账号界面；测试刷新、后退、预取缓存、多标签页与再次登录。失败时不能仅切成 Guest 宣称成功。
7. `HomePreferences.loggedOut` 退出认证逻辑；主题、轮盘偏好和运动状态仍留前端，不因接 Auth 全部入库。

Email OTP 的发送/验证接口和失败处理实施时依据 [官方 Email OTP 文档](https://supabase.com/docs/guides/auth/auth-email-passwordless) 核对。登录后恢复 Pack/Mission 的 return context 只允许受控站内路径，不能接受任意重定向地址。

### 6.2 权限矩阵与业务保护

| 数据 | Guest | 已登录 A | 内容管理/维护 |
| --- | --- | --- | --- |
| 已发布 Pack / Mission | 按产品规则只读 | 按同样规则只读 | 通过明确授权的维护路径写入 |
| 未发布内容 | 不可读 | 默认不可读 | 权限另行设定，不从用户可编辑 metadata 判断 |
| A 的资料/进度/参与 | 不可读 | 只允许本人所需操作 | 不提供普通客户端的管理员旁路 |
| B 的资料/进度/参与 | 不可读 | 不可读写 | 按授权维护范围处理 |
| 完成日期聚合/详情 | 不可读 | 只能看本人 | 同样遵守所有权，不能经视图/RPC 意外放开 |

数据库验收同时检查表权限和 RLS：公开内容只开放所需 SELECT；个人记录约束所有权；UPDATE 检查旧行和新行归属。视图、RPC、函数要审查执行权限及是否绕过 RLS，不能为了修权限错误改用特权函数。参考 [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。

Take / Complete 阶段还要保证：客户端直接访问 Data API 时也不能伪造可信完成时间、越过状态转换或制造重复记录。RLS 的“只能改自己的行”不足以保证全部业务规则；届时选择数据库约束、受控操作入口和最小写权限共同实施。幂等与状态不回退必须在服务端/数据库保证。

### 6.3 空数据与错误分开

| 情况 | 处理原则 |
| --- | --- |
| 公开列表无内容、已登录用户无参与 | 合法空集合，进入已确认空态；不复制假卡填满 |
| 资源不存在或对当前用户不可见 | 对外可以统一不可用/404，服务端保留安全诊断 |
| 没有会话 | 明确 Guest / 未认证结果，不算数据库故障 |
| 会话过期 | 刷新失败后进入已确认的重新登录路径，清除旧个人数据 |
| 数据库不可用、超时、权限配置错误 | 失败路径与重试；不能吞成空列表或自动回退 fixture |
| 卡片字段不合法 | 识别内容错误；装饰字段只允许明确回退，不掩盖正文损坏 |

日志记录请求关联、操作类别、错误码等必要信息；不记录 token、OTP、整份 Auth User 或个人完成内容明细。错误界面的文案和表现按前端确认流程处理。

### 6.4 路由与缓存

| 范围 | 第一阶段方案 | 后续更新点 |
| --- | --- | --- |
| 公开 Pack 列表/详情 | 先明确请求时读取，不依赖 fixture 构建枚举；需要共享缓存时单独定义 | 内容发布/下架/排序改变时失效；按语言和公开可见性隔离 |
| 首页个人数据 | 请求身份下读取，不跨请求共享个人结果 | 登录、退出、参与、完成后更新 |
| `/completed/[date]` | 删除 fixture `generateStaticParams`，按用户与日期读取 | 完成写入、权限/内容变化后更新 |
| 未来带进度的 Pack 详情 | 公开内容与个人进度分开读取 | 不能只用 slug 缓存含个人状态的完整结果 |
| 浏览器预取/返回快照 | 保留正常预取与返回恢复，身份改变时清理或隔离 | 测试 A 退出后 B 访问同一 slug/date 和浏览器后退 |

移除 `generateStaticParams` 本身不等于解决缓存问题，还需核对请求 Cookie 边界、框架/托管缓存和构建产物。本轮不打开 Cache Components，不套用旧版缓存默认行为。

## 7. 分阶段实施与交付

### 阶段 A：接入准备与内容契约

**目标：形成可审查的第一批技术改动，不碰未确认业务。**

- 检查差异，保留已有 MissionGallery / Safari 修复；记录测试基线。
- 明确开发环境、已有 schema 和依赖安装范围，锁定 SDK 版本与 lockfile；不升级 Next.js / React。
- 整理少量正式内容样本、排序、发布规则、完整卡面字段；只把 fixture 当测试材料，不全量搬运 Mock 标题到数据库。
- 明确新内容 DTO 不以图片 URL 为必填条件；准备 Mapper 字段映射和权限清单。
- 为阶段 B 的慢网络、失败和空内容准备小范围前端状态方案。已有确认继续有效，只有新增或改变设计的部分需要补确认。

**交付/退出条件：** 环境目标明确；内容映射、依赖清单和第一批变更范围可审查；无未授权远端写入。

### 阶段 B：公开 Pack / Mission 读取

**目标：先接通公开内容。无需等待“参与 Pack”和重复完成规则。**

- 在获授权开发环境适配 `packs/missions`、最小公开读取权限和开发种子；迁移与种子可复现。
- 实现 server-only 查询与 Mapper，替换 `getPacks/getPackBySlug`，页面异步读取。
- 验证稳定 ID、slug、排序、可见性、Mission 数量与卡面内容完整性。
- 处理空列表、空 Pack、下架/不存在、查询失败和长文案；目标页进入时真实首卡已确定，不先挂空 Gallery 再补卡。
- 原有身份/日历尚未接入的部分仅留在明确的开发演示范围，不能作为完整真实首页发布；生产数据失败不触发 mock。

**交付/退出条件：** 首页公开内容和 Pack 详情来自数据库；普通轮盘与详情返回无已知回退；异常状态可退出/重试；用户可手动验收。

### 独立批次 V：补齐 HTML/CSS + SVG 卡面

**时机：可在 A/B 期间安排，不依赖 Auth，也不阻塞数据库公开读取。**

- 确认具体 SVG 图形样式，先完成一张 Pack 和一张 Mission。
- 增加有限图形 key 与本地 SVG 注册表，保留现有 HTML 排版、CSS 几何与共享转场边界。
- 验收缩放、长文本、色彩、循环副本 SVG ID、Safari 和 Reduced Motion，再扩展其余卡片。
- 图形本身改变通常只改前端资源；业务 ID 与进度不因换图形而改变。

**交付/退出条件：** 两类卡片实际包含 HTML/CSS + SVG，整卡不依赖栅格图；用户认可具体视觉。V 未完成时只能称“HTML/CSS 主卡面已接数据”。

### 阶段 C：认证、昵称、Logout 与用户 Pack

**前提：** 登录方案/入口与状态、Guest 首页、昵称规则和参与定义明确；OTP 环境可用。

- 接入 SSR Cookie 会话、必要的 Proxy、最小用户 DTO；替换 mock 昵称来源。
- 将已确认的最小登录 UI 接 OTP。当前没有登录入口，不能只做 SDK 初始化就宣称用户可以登录。
- 根据参与定义实现 `getJoinedPacks`，验证 Guest 与已登录空参与是不同状态。
- 将 Logout 改成真实退出；补快照清理、用户身份变化处理，保留主题与设备偏好各自职责。
- 验证认证服务失败、资料缺失、OTP 过期/重试限制与再次登录。

**交付/退出条件：** 真正能建立和退出会话；昵称/参与数据来自同一用户；A/B 切换和后退不残留旧个人内容。参与规则未定时可先交付认证子批次，但不宣称整个 C 完成。

### 阶段 D：完成日历与当天详情读取

**前提：** C 的身份边界可用；完成规则、时区、历史下架内容可见性明确。

- 替换注册日期、完成日期集合与当天 Mission 查询，去掉个人日期的 fixture 静态生成。
- 调整日历范围更新策略；保持下轮盘集合切换不重置上方月份。
- 同一套完成过滤用于日期标记和详情；验证跨 Pack、同日去重、稳定首卡。
- 没有 Complete 入口时，只在授权开发环境准备明确标识的完成测试记录；这只能证明读取，不能证明用户完成闭环。

**交付/退出条件：** 日期标记和详情一致，用户隔离、边界日期、跨午夜通过；1/2/3/5/8 张有限卡流及返回路径通过用户验收。

### 阶段 E：Take / Complete 真实业务写入

**前提：** 相关前端交互、状态规则、失败恢复和重复完成定义明确。

- 补最小操作输入/结果契约和 Server Actions，逐次校验身份、目标内容和状态转换。
- 由数据库保证唯一性/幂等；并发 Take 不覆盖 Completed，重复提交不重复记账。
- 写成功后更新用户 Pack、日历与相关进度；错误时保持可恢复状态，不假装完成已经持久化。
- 在前端动作定稿后接登录返回意图和 Mission 定位；不因后端接入另造 Mission 页面。
- 并发、跨标签页、重复点击、网络中断以及直接 Data API 绕过 UI 都进入验收。

**交付/退出条件：** 真实 Browse → 登录/恢复 → Take → Complete → 日历可见闭环通过；动画成功不等于写入成功。

### 阶段 F：语音、Profile、管理与发布

逐项另开实施批次：语音播放/录制与 Storage 权限、Profile、内容维护、规模方案、发布准备。音频独立保存，数据库保存资源路径和元数据；这些能力不提前混入 B–D。

本计划不绑定固定工期。阶段完成以可验证结果为准，避免前端改动或业务决策调整后继续使用失真的日期承诺。

## 8. 期间细碎修改的处理方式

### 8.1 按影响范围接住修改

| 用户修改 | 通常改哪里 | 是否需要数据库迁移 |
| --- | --- | --- |
| 字号、间距、圆角、层叠、SVG 画法 | 卡片 CSS / SVG 组件 | 通常不需要 |
| 正式标题、说明、标签、已有主题选值 | 内容数据/Mapper，必要时内容样本 | 通常不需要改表 |
| 新增一种确有业务含义的内容字段 | DTO → Mapper → schema/种子 | 视 schema 而定，采用增量兼容 |
| 菜单位置、详情返回细节 | 对应组件/运动模型 | 不把临时 UI 状态搬入数据库 |
| 加入/退出定义、重复完成、权限 | 领域模型、约束、Repository/Action、对应 UI | 可能需要，先记录影响再执行 |
| 新增语音、Profile、无限内容 | 新功能与独立契约 | 单独批次，不作为“小修”扩大当前范围 |

### 8.2 每次修改的简短记录

```text
变更编号 / 日期：
用户要求：
影响层：视觉 / DTO / 查询 / schema / 权限 / 动效
本次范围与不做事项：
与当前批次的依赖：
已沿用的确认 / 新增待定部分：
验证结果与剩余问题：
```

- 用户提出明确的小修改就是该范围的任务输入，不重复确认已经授权的部分。只有新引入的视觉方案、关键业务取舍或外部写入边界需要补充决策。
- 一批尽量只解决一个可描述的问题，例如“接公开 Pack”，或“把 Mission 符号换 SVG”。CSS 调整不顺手改变完成规则；数据库修改不顺手重调轮盘。
- 同一区域的前后端改动顺序执行；先吸收已有未提交修改，再做局部修改，不覆盖别人正在做的前端成果。
- DTO 需要演进时，优先新增兼容字段与 Mapper 过渡；完成调用点迁移后再删除旧字段。TypeScript DTO 不必因此建立公共 HTTP API 版本体系。
- 数据库采用可复现增量变更。涉及删除/重命名字段先做兼容和数据检查，不能为了回退 UI 清空进度或 reset 数据库。
- 开发 fixture 可继续用于视觉迭代和契约测试。若需要开发模式切换，必须显式、仅限开发，并确定公开/个人数据模式边界；失败时不自动切换，生产构建检查 fixture 不进入请求路径。

## 9. 不得因数据接入回退的交互

1. 保留持久 `main` 和现有 `ViewTransition` 边界，不在路由顶部随意加包裹层。
2. 保留 `pack-open/pack-close`、`scroll: false`、Pack/日期共享转场名称与稳定业务 ID。
3. 开始导航前同步冻结上下轮并保存可见位置；下轮切换只影响下轮，上日历继续保留月份。
4. 导航变慢、取消、失败、会话失效后要恢复交互锁；不把 `router.push` 当返回业务成功 Promise，也不靠任意超时宣称数据加载成功。
5. 不在拖动、惯性、展开、收拢中间重排列表或替换 Gallery；普通数据更新安排在安全边界，并按 ID 保留选择。
6. 原选中内容被删、相同数量换成另一组内容、列表重排都要验收；不能只检查 `missions.length`。
7. 日期详情保留有限列表和首张 Mission 单一共享转场，不再增加重复 hero；保留按实际动画结束解锁、收拢后沿原路径缩为点。
8. Safari 继续使用原生滚动分支，不在 pointer/touch/scroll 高频事件中写滚动位置或发请求。
9. 不把 count +/- 接成数据库增删，也不把循环副本当网络分页。
10. 账号变化的安全清理与普通内容刷新的选择保留分开处理；不能为保护动画保留旧用户私人数据。

具体时序与真机路径沿用 [接入手册第 9–12 节](D:/todaysmission/todaysmission/BACKEND_INTEGRATION_GUIDE.md:355)。新失败态、加载态与交互中断表现需要纳入对应前端批次验收。

## 10. 分阶段需要落实的决策

下表“建议起点”不是已确认产品规则，也不是要求现在一次性回答所有问题。

| 决策 | 建议起点 / 必须明确的内容 | 最晚需要 |
| --- | --- | --- |
| 开发项目与已有 schema | 使用明确隔离的开发环境；检查后适配，不覆盖未知数据 | A，远端操作前 |
| 正式内容与发布 | 小规模人工审核内容；明确谁提供中英文正文、配色和图形 | B，正式种子前 |
| 卡面 SVG 样式 | 先把当前几何符号映射为本地 SVG，再讨论更复杂插画 | V，实现前 |
| Guest 首页与登录入口 | 可浏览公开内容；不显示虚构个人日历；上方区域、用户 Pack 切换和登录入口的具体表现待确认 | C，UI/Props 调整前 |
| 用户 Pack 的定义 | MVP 可考虑从 Take/Complete 推导，避免独立加入操作；退出、完成后是否保留仍需确定 | C，参与查询前 |
| 昵称与注册日期 | 昵称缺失的处理与唯一性；注册日期建议取真实账户创建时刻并统一日期口径 | C–D |
| 重复完成 | MVP 可考虑每用户每 Mission 一次；若可重复，先确定记录身份与同日展示方式 | D 建进度模型前、E 写入前 |
| 日期时区与历史稳定性 | 选择账户时区/完成时当地时区等口径；说明切换时区后历史是否变化 | D |
| 下架内容与历史卡片 | 公开列表不显示未发布；历史完成是否保留卡面/快照需产品决定 | B 的公开规则；D 的历史规则 |
| 空、错、加载、重试 | 小范围状态方案，不复用假卡片掩盖问题 | 各阶段页面接真实请求前 |
| 规模与可达性 | 首批小内容集；正式发布前解决默认 12、最大 24 的限制，不静默丢尾部内容 | B 测试；发布前定方案 |
| Voice / Profile | 后续功能自己的规则与界面 | F，不阻塞 B–D |

## 11. 验证与发布门槛

### 11.1 每个实现批次

- 运行受影响的现有测试；代码批次完成时执行 `npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`。
- 更新因异步 Repository / 私有路由产生的旧 fixture 测试假设；保留几何、导航、Safari、有限日历卡流的真实回归保护。
- Mapper、日期规则、权限和状态转换做有意义的契约/集成测试；小型 CSS 修改不创建只重复实现的测试。
- 数据库 schema、索引、权限变更用迁移记录，配套开发数据和真实角色验证；不能只验证管理员能查到。
- 迁移工具按安装版本的帮助与当时官方说明选择流程；生成文件、审查、试跑和目标环境记录齐全，不在本文猜测 CLI 命令。
- 不自行打开浏览器。提供清晰手动路径由用户验收；自动化测试不等于视觉或真机帧率通过。

### 11.2 真实数据关键用例

| 类别 | 必验场景 |
| --- | --- |
| 公开内容 | 0/1/多 Pack、空 Pack、长中文/英文、缺字段、重复 slug、未发布、排序更新 |
| 数量 | 默认 12 的实际可达性、13–24、超过 24；不把固定截断当分页 |
| 身份隔离 | Guest、A、B；同一路由同一日期；退出后后退、刷新、预取、跨标签页 |
| 日期 | 无完成、跨 Pack、同日多个、注册前、未来、闰日、午夜/时区切换 |
| 数据变化 | 有标记后内容下架、选中 Pack 删除、同长度不同内容、刷新后顺序改变 |
| 错误 | 网络慢/断、数据库失败、权限配置错误、会话过期、导航取消与重试 |
| 卡片 | 图形 key 缺失/未知、SVG 副本 ID 不冲突、无整卡图片依赖、文本不溢出 |
| 写入 | 重复点击、并发、多标签、重试幂等、Completed 不回退、直接 API 越权/绕过 |
| 构建 | 无会话构建不枚举个人数据、不使用管理员密钥抓所有用户、不发布 fixture |

### 11.3 手动视觉路径

首页下轮切换 → Pack 打开/滑动/返回 → 完成日进入 → 滑到末卡再返回 → 单卡日期 → 慢网络/失败恢复 → Logout / A-B 切换。

P0：iPhone Safari、Android Chrome；再覆盖桌面 Chrome/Safari、平板横竖屏。保持原有上下轮同步、日历月份、Safari 惯性和日期缩回路径。

### 11.4 上线前才处理的事项

确定生产环境、邮件可用性、备份/迁移演练、回退策略、可见性规则、监控与发布授权。预览与生产不共用个人测试数据。任何线上回退不得破坏已经写入的用户进度；生产读取失败不得切回演示数据。

## 12. 当前外部版本风险与核对依据

本轮参考本地 Next.js `16.3.3` 文档中的 Fetching Data、Data Security、Proxy、Cookies、generateStaticParams；实际写代码前按涉及功能再核对，不能把旧模板直接套入。

Supabase changelog 的 Markdown 地址本轮未被网页读取工具支持，已改读官方网页与相关公告。以下是环境核对项，不表示用户项目已受影响：

- 新表 Data API 暴露需要检查显式 GRANT，RLS 是另一层控制；迁移应同时处理两者。新行为自 2026-05-30 起向新项目推出，公告计划于 2026-10-30 覆盖现有项目的新表；已有表的 grants 保留。参见 [Data API 变更公告](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)。
- 2026-06-03 起的新免费项目使用默认 SMTP 时，认证邮件模板自定义受限；Email OTP 所需配置必须先核实，不擅自改登录方式或购买邮件服务。参见 [邮件模板公告](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)。
- Supabase JS 库已公告于 2026-06-30 结束 Node.js 20 支持；实施时分别核对本地和部署运行时，不只看前端 package 文件。参见 [Node 支持公告](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20)。

实施前继续检查 [Supabase Changelog](https://supabase.com/changelog)，不在本计划锁死尚未安装的 SDK 版本。

## 13. 执行记录

| 日期 | 批次 | 状态 | 结果 |
| --- | --- | --- | --- |
| 2026-08-31 | 计划与源码核查 | 完成 | 全文阅读接入手册；核对卡片真实渲染、路由与数据边界；286 项现有测试通过 |
| 待安排 | A | 未开始 | 明确环境、内容映射、依赖与首批范围 |
| 待安排 | B / V | 未开始 | 公开内容读取；独立 SVG 卡面批次 |
| 待安排 | C / D | 未开始 | 身份与参与；个人日历读取 |
| 待安排 | E / F | 未开始 | 业务写入；后续功能与发布 |

本轮仅新增本计划书，未更改业务代码或已有接入手册，未安装依赖、读取密钥、连接数据库、执行迁移、发送邮件或部署。
