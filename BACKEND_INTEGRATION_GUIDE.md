# TODAYSMISSION 后端接入手册

> 用途：把当前前端原型交接给另一个开发任务，在保留已确认视觉和交互的前提下接入后端。
> 整理日期：2026-08-31。
> 依据：当前工作区代码，含本轮日历 MissionGallery 修复；检查时 HEAD 为 `62e0f3e`，仍有未提交前端修改，不能只读取该提交作为交接基线。
> 本文只提供接入说明，不代表已经创建数据库、安装 SDK、实现认证或获得生产环境写入授权。
> 文中的仓库路径均相对于项目根目录：`D:/todaysmission/todaysmission`。

## 1. 新任务先读这里

### 1.1 接入目标

当前阶段优先把以下真实数据接到已有界面：

1. 当前登录用户的昵称与认证状态。
2. 所有可浏览的 Pack，以及当前用户参与的 Pack。
3. Pack 内的 Mission 卡片。
4. 当前用户的注册日期、完成日期集合、指定日期完成的 Mission。
5. 真实 Logout。

原产品计划选定 **Supabase Auth + PostgreSQL + Storage**，Next.js 承担页面与服务端数据访问。不要为这次接入另建一套独立后端服务器。

登录 UI、Take Mission、完成提交、语音和 Profile 是后续业务能力，不是当前界面已经具备的功能。任何新增界面、加载态、错误态或交互变化仍须先获得用户确认。

### 1.2 阅读顺序与信息优先级

1. `AGENTS.md`：本地 Next.js 版本规范。
2. 本手册：当前前端事实、接入边界与回归要求。
3. `FRONTEND_DEVELOPMENT_PLAN.md`：前端确认流程、分层、安全和质量要求。
4. `TODAYSMISSION — MVP 产品与设计开发计划书.md`：完整产品方向；第 27–30 节包含后端与初始数据模型。
5. 本手册列出的实际源码、测试。

注意：

- `PROJECT_PROGRESS.md` 已补充 286 项测试和新路由记录，但仍保留 53 项测试、3:4 卡片等历史描述；交接时区分历史与现状，以实际源码和最新验收为准。
- 更早的对话曾允许上下轮盘任意选择、菜单第三行临时预览；**当前代码已改成上方固定日历、下方切换两类 Pack**，不要恢复旧逻辑。
- 最初的照片样式和 3:4 要求后来被附件 HTML 设计替换。当前 Pack 与 Mission 的主体使用排版卡片，卡片比例主要为 `1 / 1.42`；不得因为旧计划写着照片/3:4 就擅自改回。
- 黑白深浅色用于页面与菜单；当前附件风格的卡片与日历标记含红、蓝、黄等颜色，接后端不是重新配色的授权。
- 用户此前要求不打开浏览器验证，由用户手动验收。新任务应沿用这一约束，除非用户另行明确授权。
- 保留所有已有未提交修改，不要用 checkout/reset 覆盖前端成果。

## 2. 当前真正实现了什么

### 2.1 运行基线

| 项目 | 当前状态 |
| --- | --- |
| 框架 | Next.js `16.3.3`，React / React DOM `19.2.8` |
| 语言与样式 | TypeScript strict、CSS Modules、Tailwind CSS 4 |
| 本机检查时 Node | `v24.15.0`；不是部署环境已配置相同版本的保证 |
| 后端依赖 | `package.json` 尚无 Supabase SDK 或 SSR 包 |
| 数据来源 | `data/fixtures/` → `data/repositories/` → 页面 Props |
| 真实登录、持久业务数据 | 尚未实现 |
| 已有质量基线 | 上一轮 286 项 Node 测试、lint、类型检查、production build 通过；不是后端或真机验收结论 |

### 2.2 页面与路由

| URL | 文件与链路 | 当前数据 |
| --- | --- | --- |
| `/` | `app/page.tsx` → `HomeCarouselEntry` → `HomePackCarousels` | 全部 Pack、用户 Pack、mock 昵称、日历 |
| `/pack/[slug]` | `app/pack/[slug]/page.tsx` → `MissionPackDetail` → `MissionGallery` | 一个 Pack 及其 Mission 数组 |
| `/completed/[date]` | `app/completed/[date]/page.tsx` → `MissionGallery` | 某天完成的 Mission，可能跨 Pack |

`[date]` 是严格的 `YYYY-MM-DD`。日历详情不是一个真实的 Pack；不要为了复用页面，在数据库里给每个日期创建一个 Pack。

`app/layout.tsx` 已提供持久的 `<main>`。当前无 `/login`、`/profile`、`/api/...` 或 locale 路由；这些只能作为后续建议，不能当成已有入口。

### 2.3 前端组件的正式名称

| 名称 | 路径 | 职责 / 接入时注意 |
| --- | --- | --- |
| `HomeCarouselEntry` | `features/packs/components/HomeCarouselEntry.tsx` | 客户端准备与本地设置读取入口，不额外包裹轮盘 DOM |
| `HomePackCarousels` | `features/packs/components/HomePackCarousels.tsx` | 首页编排、集合切换、双轮冻结、导航快照、昵称和菜单回调 |
| `HomeUserMenu` | `features/packs/components/HomeUserMenu.tsx` | 中央昵称、左侧切换图标、右侧菜单图标、深浅色和 Logout |
| `ArcCarousel` / `TransformArcCarousel` | `features/packs/components/ArcCarousel.tsx` | 选择滚动实现；非 Safari 的 Pack 轮盘拖动与惯性 |
| `NativePackCarousel` | `features/packs/components/NativePackCarousel.tsx` | Safari 原生横向滚动，同时保留轮盘造型 |
| `PackDeck` / `PackDeckCover` | `features/packs/components/PackDeck.tsx` | Pack 堆叠造型与封面排版，不负责业务查询 |
| `CalendarCarousel` | `features/calendar/components/CalendarCarousel.tsx` | 月份手势、范围、快照与日期导航 |
| `CalendarMonth` | `features/calendar/components/CalendarMonth.tsx` | 弧形月历网格、完成标记、日期点击和转场锚点 |
| `MissionPackDetail` | `features/packs/components/MissionPackDetail.tsx` | Pack 详情适配到共享 Gallery |
| `MissionGallery` | `features/packs/components/MissionGallery.tsx` | Mission 卡片流、展开/收拢、水平浏览、返回导航 |
| `MissionStreamCard` | `features/packs/components/MissionStreamCard.tsx` | 单张 Mission 的排版和装饰，尚无 Take/Complete 业务操作 |
| `PackCard` | `components/card/PackCard.tsx` | 旧照片卡片组件，不是当前 Pack/Mission 主视觉的替换目标 |

### 2.4 当前交互事实

- 上轮盘固定 `calendar`；昵称左侧图标只把下轮盘在 `joined` 与 `all` 之间切换。
- 切换下轮盘不应卸载上方日历，不应重置正在浏览的月份。
- 当前菜单只有深浅色切换与 Logout。Logout 仅写入内存中的 `loggedOut: true`，把昵称显示为 `Guest`；它不销毁真实会话，也不清除个人数据。
- 点击底部主 Pack 进入 Pack 详情；点击有完成标记的日期进入当天 Mission 详情。
- 两种详情都支持空白点击 / Escape 返回。主页面上下两轮的退场与回场需要同时进行。
- Pack 详情有循环浏览；日期详情是有限列表，不能无限复制。同一日期的第一张 Mission 是共享转场卡片，不另渲染重复 hero。
- 当前日历标记颜色由日期映射为装饰色，不表示任务类型、数量、等级或其他数据库状态。

## 3. 已有数据契约：接入优先保持它们

### 3.1 内容 DTO

真实定义位于 `data/contracts/pack-summary.ts`：

```ts
type PackDeckAppearance = {
  number: string;
  description: string;
  symbol: string;
  background: string;
  foreground: string;
  missionCount: number;
};

type PackSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  deck?: PackDeckAppearance;
};

type MissionCardAppearance = {
  title: string;
  note: string;
  tag: string;
  code: string;
  symbol: string;
  background: string;
  foreground: string;
};

type MissionSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  card?: MissionCardAppearance;
};

type PackDetail = PackSummary & {
  missions: readonly MissionSummary[];
};
```

Mapper 应返回上述前端 DTO，而不是把数据库行或整个 Auth User 透传给客户端。

重要细节：

- `deck` 和 `card` 在类型上可选，但当前附件样式依赖这些内容。真实数据只提供 `title/imageSrc` 虽能通过类型检查，却会出现默认符号、缺少文案或配色退化；接入必须验收完整排版字段。
- `MissionStreamCard` 标题优先取 `card.title`；`mission.title` 是回退值。当前 fixture 的业务标题仍可能是 `Mock Mission 01`，不能直接拿它当正式内容种子。
- `imageSrc/imageAlt` 是兼容字段；当前主视觉不靠下载这些照片绘制。不要误以为替换图片 URL 就完成了卡片接入。
- `deck.missionCount` 是内容数量，不是用户完成数量；应与该用户可见的 Pack Mission 内容范围一致，不要保留 fixture 的固定值。
- Pack ID / Mission ID 必须稳定；不要用数组下标、随机数或每次请求新生成的值。日历详情和 Pack 详情中的同一 Mission 必须使用同一个 ID。
- Pack `slug` 用于路由，需唯一且可稳定查找。当前 Mission slug 会在不同 Pack 中重复；原模型的一对多关系下，可采用 Pack 内唯一，不能误判为全局唯一。
- 卡面 `number/code` 是展示字段，不是主键。图库顶部的 Mission 序号由展示位置生成，不代表业务 ID。
- 文案、符号、颜色应验证类型、长度和允许值；按现有文本节点渲染，不引入后端 HTML 注入。

### 3.2 日历 DTO

真实定义位于 `data/contracts/mission-calendar.ts`：

```ts
type MissionCalendarData = {
  registeredOn: string;
  completedOn: readonly string[];
};

type MissionCompletion = {
  completedOn: string;
  packId: string;
  missionId: string;
};

type CompletedMissionDay = {
  date: string;
  missions: readonly MissionSummary[];
};
```

- `registeredOn`、`completedOn`、`date` 都是日期键，不是随意截断的时间戳。
- `completedOn` 返回去重、排序后的日期集合；某天只完成一项也应能点击。
- 某日详情必须查询当前用户该日的完成记录，可跨 Pack，不能返回那个 Pack 的全部 Mission。
- 同一天当前实现按 `mission.id` 去重。若未来允许一项 Mission 一天多次完成，需要先确认展示规则，再决定是否改 DTO。
- 当前日历范围从注册月到设备“今天”；范围在组件初始化时保存。切换账号、跨午夜、时区变化后不能假设它会自动重新计算，接入需明确更新策略。

### 3.3 Repository 替换清单

下表左侧是现有同步函数；右侧是接入目标，**不是已经实现的接口**。

| 现有位置 / 函数 | 现在返回 | 后端替换目标 |
| --- | --- | --- |
| `data/repositories/get-packs.ts` → `getPacks()` | 24 个 fixture Pack | 当前可浏览的公开 / 已发布 Pack，稳定排序，返回 `Promise<readonly PackSummary[]>` |
| 同文件 → `getJoinedPacks()` | 固定挑选 5 个 Pack | 当前认证用户参与的 Pack；“参与”的定义先确认 |
| 同文件 → `getPackBySlug(slug)` | 对 fixture 数组查找 | 服务端查 Pack 和按明确顺序排列的 Mission，返回 `Promise<PackDetail \| null>` |
| `data/repositories/get-mock-user.ts` → `getMockLoginName()` | `mission_user` | 新建真实当前用户读取函数，返回最小用户 DTO 或未登录状态，再逐步移除 mock 命名 |
| 同文件 → `getMockMissionCalendar()` | `2026-05-12` + fixture 完成日期 | 当前用户的注册日期与完成日期集合 |
| `data/repositories/get-completed-missions.ts` → `getCompletionDates()` | fixture 日期去重排序 | 当前用户的完成日期聚合，不读取所有用户数据再在前端过滤 |
| 同文件 → `getCompletedMissionsByDate(date)` | 本地完成记录映射 | 当前用户、指定日期、真实 Mission，返回 `Promise<CompletedMissionDay \| null>` |

页面层改为 `async` 并 `await`，尽量保持传给视觉组件的 Props 不变。拿到可信用户身份后，可并行读取其用户 Pack 和日历；不要让每张卡片独立请求数据库。

错误语义必须明确：无记录可以返回空集合 / `null`；数据库不可用、权限配置错误、网络超时不能伪装成空集合。更不能在真实环境出错时静默回退到别人的 mock 内容。

## 4. 推荐接入结构

保持目前的分层，按实际需要新增小文件，不创建万能数据管理器：

```text
Supabase：Auth / 内容 / 用户进度
                ↓
服务端 Repository + 权限检查 + Mapper
                ↓
app/page.tsx、app/pack/[slug]/page.tsx、app/completed/[date]/page.tsx
                ↓
当前 Props → 已有轮盘 / 日历 / MissionGallery
```

建议新增位置（均未实现）：

- `lib/supabase/server.ts`：带当前请求 Cookie 的服务端客户端。
- `lib/supabase/client.ts`：确有浏览器 Auth 等需求时使用。
- `lib/supabase/proxy.ts` 与根目录 `proxy.ts`：按所选 SSR 版本接续 Cookie / 会话刷新。
- `data/repositories/get-current-user.ts`：验证身份、读取昵称与最小资料。
- `data/mappers/`：只在表字段与 DTO 已出现实际差异时建立。
- 与业务相邻的 Server Actions：Logout，以及后续确认后的 Take / Complete。

规则：

- 服务端读取直接调用 Repository，不绕回本应用 `/api/...` 制造额外往返。
- 数据访问模块加 `server-only` 边界；不要把服务端数据库客户端导入任何轮盘组件。
- 不需要为了接入就引入 React Query、SWR、Realtime、全局 Context 或新的动画库。
- 外部客户端、Webhook 或真正需要独立 HTTP 接口时，才新增 Route Handler。
- 不升级 Next.js / React 来“顺便统一模板”；当前动画依赖本地版本的行为。

## 5. 数据模型：原计划与待确认项

以下是领域映射，不是可直接执行的 SQL，也没有批准创建全部表。

| 领域 / 原计划表 | 服务当前前端的用途 | 约束与注意 |
| --- | --- | --- |
| Supabase Auth 用户 + `profiles` | 身份、昵称、注册日期来源 | 资料与可信用户 ID 关联；先确定用户名和时区规则 |
| `packs` | 所有 Pack、封面、slug | 原计划含双语标题/描述与资源字段；当前还需要映射 `deck` 排版内容 |
| `missions` | Pack 内容、日历中的同一 Mission | 原计划是一项 Mission 属于一个 Pack，包含排序；补齐 `card` 的映射，不擅改成多对多 |
| `mission_progress` | Taken / Completed、完成日期、日历聚合 | 原计划字段为 user、mission、status、taken_at、completed_at；重复完成规则决定是否需要事件表 |
| 参与 Pack 的关系 | `getJoinedPacks()` 的数据来源 | 可能由进度推导，也可能需显式加入关系；未确认前不要自动新增 membership 表 |
| `mission_voices` + Storage | 后续语音 | 本轮只预留方向，不因做手册就提前实现 |

原计划明确：Pack 完成度从 Mission 进度计算，不额外保存一份容易不一致的 Pack Progress。

### 5.1 必须先确认的业务问题

1. **用户 Pack**：指主动加入的 Pack，还是只要 Take / Complete 其中一项就算参与？退出、完成后是否仍显示？
2. **完成是否可重复**：每个用户每项 Mission 只完成一次，还是可以在不同日/同一天重复？这决定进度唯一约束、幂等键和日期记录模型。
3. **日期所属时区**：按账户固定时区、完成时当地时区，还是其他产品规则？切换时区后，历史完成日期是否变化？
4. **Guest 首页**：未登录时固定上日历如何显示、用户 Pack 如何处理？当前 Props 需要注册日期，不能用假注册日期冒充真实用户。
5. **数据可见性**：未发布 Pack、下架 Mission、用户曾完成但现在下架的内容是否仍可查看？
6. **新增界面**：登录、无内容、加载失败、过期会话、重试提示的 UI 尚未确认。
7. **内容与规模**：正式文案/卡面由谁提供？Pack 超过 24 个时采用分页、筛选还是调整轮盘数量上限？

这些问题不阻碍核对环境、编写 Mapper 或读取公开 Pack，但阻碍对应业务规则和权限的正式落地。只在相关阶段询问，不用一次阻塞所有接入。

### 5.2 日期与一致性

- 建议保存服务端可信完成时刻，并在确认时区策略后生成前端日期键；不要直接使用服务器所在时区分组。
- 不要直接把 `completed_at.toISOString().slice(0, 10)` 当成所有用户的完成日期。
- 注册日期、完成日期集合、某日详情、日历中的“今天”必须遵守同一套日期规则。
- 同一天详情排序必须确定，例如完成时刻加唯一 ID 的稳定次序；这只是建议，具体顺序需确认。不能让第一张卡因数据库返回顺序随机改变。
- 用户 ID 从可信会话取得，不从 query/body 中相信一个 `userId`。
- 日期标记与详情必须来自同一套完成定义；一旦写入完成成功，相关日历与个人读取应能在正确用户范围内更新。
- 幂等、唯一约束和状态转换由服务端保证；并发点击不能产生重复记录或把 Completed 回退为 Taken。
- 建索引时围绕真实读取条件：用户、完成时间 / 日期、Mission 所属 Pack 与排序。结合查询计划验证，不按每列盲目建索引。

## 6. Auth、权限与环境

### 6.1 接入前需要的环境信息

- 用户明确指定的 Supabase 项目与开发环境；有既有 schema 时先读现状，不覆盖。
- Project URL、publishable key；敏感凭据通过本地环境配置，不写进本手册或聊天日志。
- 邮件 OTP、站点 URL、回调白名单、SMTP 的可用配置。
- 生产 / 预览 / 本地环境隔离方式；本轮手册不授权自动部署、购买服务或修改生产 schema。
- 为所选版本锁定 `@supabase/supabase-js` / `@supabase/ssr`，提交 lockfile；安装前遵守项目依赖确认流程。

可公开的配置名称按当前官方指引为 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。Secret / `service_role` 绝不能放入 `NEXT_PUBLIC_`，普通用户读取也不应借它绕过权限。参见 [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)。

### 6.2 认证不是改昵称

- 原计划使用 Email OTP；当前没有输入邮箱、发送/验证验证码或登录成功恢复界面。
- 服务端按当前官方指引验证身份；不能仅信任 `getSession()` 返回的用户对象。需要最新用户状态时采用相应的服务端校验。
- SSR 客户端需处理 Cookie，并在允许写 Cookie 的边界续接会话；不要把客户端 localStorage 中的布尔值当认证依据。
- Logout 成功后，应失效个人数据读取，并清理/按用户隔离前端临时快照；不能只把昵称改为 Guest，仍把上个账号的日历显示给下个账号。
- `HomePreferences.loggedOut` 是原型标记，应退出真实认证决策。`mockLoginName` 可以在小范围重命名，但不是强制重构整个首页的理由。
- `pack-carousel-return-state.ts` 当前没有专用清空 API。账号切换时需要补安全的重置/隔离边界，而不是误把模块级快照用于新用户。
- OTP 失败、过期、频繁重试与 Logout 失败需要明确反馈；新增视觉先确认。

SSR 的 Cookie 分工、身份验证方法及 Proxy 示例，以 [Supabase Next.js SSR 文档](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) 与仓库本地 Next.js 文档为准；认证流程参考 [Email OTP 文档](https://supabase.com/docs/guides/auth/auth-email-passwordless)。

### 6.3 权限最低要求

- 公开发布的内容按产品规则开放只读；个人资料、参与关系和进度按当前用户隔离。
- 对 Data API 可达的表启用 RLS，并配置对应角色的最小权限。不能把“已认证角色”当成“拥有这条数据”。
- 验证 SELECT、INSERT、UPDATE 的所有权约束；更新时不能允许改写 `user_id` 把记录转给别人。
- 不使用用户可编辑的 metadata 决定管理员身份；授权资料也需考虑缓存/令牌的新鲜度。
- 日历聚合查询、数据库视图、RPC 与普通表同样必须检查授权，不能在封装后意外越过 RLS。
- 不为消除权限错误直接改成特权函数或管理员客户端。
- 验收使用未登录、用户 A、用户 B 的真实权限上下文；只用后台管理员能查到数据不代表 RLS 正确。

RLS 规则应随 schema 一起检查，参考 [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。索引和权限的细化实施应遵循 Supabase / Postgres 技能，并在获授权的开发环境验证。

### 6.4 本次核对到的版本风险

这些是官方说明，不表示已经检查用户实际项目配置；新任务开始时应再次核对 changelog。

- Supabase SDK 已公告于 2026-06-30 结束 Node.js 20 支持。本机为 Node 24，但部署环境需单独核对。[Node 支持公告](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20)
- 新表是否自动暴露给 Data API 受项目设置与新政策影响。遇到查不到表，要分别检查 GRANT 与 RLS，不能通过关闭 RLS 解决。[Data API 变更](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- 2026-06-03 起，新免费项目使用默认 SMTP 时的邮件模板自定义受限。实施“邮箱验证码”前核实模板与 SMTP 可行性，不要默认新项目一定可以改模板，也不要擅自改成 Magic Link。[邮件模板变更](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

## 7. 私有页面、缓存和网络延迟

### 7.1 当前静态生成不能直接照搬

两条详情路由目前都有 `generateStaticParams()`，来源是 fixture。上一轮 build 生成 24 条 Pack 详情和 21 条日期详情；这是演示数据，不是完整的生产路由策略。

- `/completed/[date]` 的含义取决于当前登录用户。接真实数据时，应去掉 fixture 日期枚举，按请求身份读取；不要在 build 阶段查询并输出全部用户的完成日期。
- `/` 包含个人昵称、用户 Pack 和完成日历，不能按一个用户生成结果后作为所有人的共享缓存。
- `/pack/[slug]` 的纯公开内容可另行设计缓存；若混入个人状态，不得把个性化结果放进只按 slug 缓存的共享结果。
- 私有读取第一阶段优先保持简单、请求级隔离。不要只写“开启缓存”，必须说明缓存键、用户范围、失效方式及退出登录后的表现。
- 不要把权限异常捕获成 `notFound()` 掩盖配置问题；无权访问对外可以统一隐藏存在性，但服务端需保留安全的诊断信息。

本地参考：`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`、`node_modules/next/dist/docs/01-app/02-guides/data-security.md`。实现时核对当前安装版本，不把网上其他版本的缓存 API 原样套入。

### 7.2 请求更新不能打断动画

当前 `openPack/openCompletedDay` 在导航前冻结两轮并保存位置；返回使用同一共享元素名称与快照恢复。引入真实延迟后必须增加以下验收：

- 保留已有当前 Pack / 当前月日期的预取机制；预取失败不是业务数据已准备好的证明。
- 不先挂载一个空 Gallery 再填数据；特别是第一张 Mission 必须在目标页面进入时就确定。
- 不在拖动、惯性、展开或收拢中途重排数组、重置 track 或重新挂载当前 Gallery。
- 不使用当前时间、随机值、请求序号作为组件 key。相同业务内容维持相同身份。
- 同样数量但内容已变化的数组，也要验证选择与引用是否正确；不能只判断 `missions.length`。
- 导航失败、会话过期或请求取消后，不能把首页永久留在 `navigationLockRef` 锁定状态。具体恢复/错误 UI 先确认，再小范围接入。
- 不在每个 scroll/pointermove 中请求后端或 `router.refresh()`；写入成功后的数据失效与 UI 更新应安排在安全的交互边界。
- 账号变更需要有意地重置个人组件状态；普通内容刷新则尽量保留选择。不要用同一种全页重挂载处理两者。

## 8. 前端状态归属：不要全部搬进数据库

| 状态 | 当前实现 | 接入原则 |
| --- | --- | --- |
| 身份 / 登录 | mock 昵称 + 内存 `loggedOut` | 替换成可信 Auth 状态 |
| 参与关系、完成记录 | fixtures | 属于业务数据，存后端 |
| 下轮盘选择 | `carousel-settings.ts`，localStorage key `todaysmission:carousel-settings:v2` | 当前是设备设置，默认上 calendar / 下 all；是否跨设备同步另确认 |
| 深浅色 | `home-preferences.ts` 模块内存 | 当前刷新会重置；不要擅自声称已长期保存或新增账号设置表 |
| 正在看的 Pack、轮盘位置、日历月份 | `pack-carousel-return-state.ts` 的模块内存快照 | 只服务当前导航返回；不是业务进度，不写数据库；账号切换须清理/隔离 |
| 指针、速度、惯性、动画 phase、交互锁 | refs / DOM dataset / RAF | 保留前端管理，不放全局后端同步状态 |
| mock 数量 +/- | 轮盘内部 count，默认所有 Pack 展示最多前 12 个，可调到最多 24 个 | 开发调试用途，不是加入/退出或删除 Pack 的接口 |

## 9. 不能回退的动效与布局边界

重点保护文件：

- `features/packs/components/MissionGallery.tsx` / `MissionGallery.module.css`
- `features/packs/components/ArcCarousel.tsx` / `ArcCarousel.module.css`
- `features/packs/components/NativePackCarousel.tsx`
- `features/packs/model/native-scroll-controller.ts` / `native-mission-gallery.ts`
- `features/packs/model/pack-transition.ts` / `pack-carousel-return-state.ts`
- `features/calendar/model/calendar-day-transition.ts`
- `features/packs/model/carousel-swap-motion.ts`
- `app/globals.css`

### 9.1 路由与共享元素

- `HomeCarouselEntry` 不添加包住两轮的宿主 DOM；`MissionPackDetail` 也不随意加包装层。此前这样的层级变化曾导致轮盘无动画消失。
- 保留轮盘与详情的 `ViewTransition` 边界，保留 `pack-open` / `pack-close` 和导航的 `scroll: false`。
- 保留 Pack 的 `getPackTransitionName(id, placement)` 与日历的 `getDayTransitionName(date, placement)` 配对。
- ID 映射要保持共享名称稳定、可用且不冲突；不要让同一视图里的循环副本拥有重复共享元素名称。
- `getDayGalleryId(date)` 返回的 `completed-...` 只是前端导航标识，不是数据库实体。
- 不把冻结/快照流程移到数据更新之后；先记录当前可见位置，才能从原位置连续收拢与插回。

### 9.2 日历详情的最新修复

- 日期详情复用 `MissionGallery`，`completedDate` 决定有限列表分支。
- 第一张真实 Mission 本身承担共享转场；不再额外叠一张相同 hero 淡入淡出。
- 日历入场按实际 CSS 动画完成开放交互，不再固定锁住 1600ms；普通 Pack 的既有时序未在这一修复中统一改写。
- 日历多卡收拢时长为 360ms，随后沿日期路径执行 520ms 的缩小转场；不是飞出屏幕。
- 最终缩为一个不可见点，避免仍是小卡片时突然移除。
- Safari 的日历侧卡在展开时就使用稳定焦点样式；不得在 settled 阶段再制造一次尺寸跳变。
- 第一张卡即便已滑出可视区，也要参与收拢与返回；不能被可见区域裁剪逻辑直接删掉。

### 9.3 Safari / 移动端性能

- Safari 使用现有原生滚动分支；不要在 `pointermove/touchmove` 中持续写 `scrollLeft`。
- 不在滚动期间反复 `scrollTo`、强制 mandatory snap 或批量读布局。
- 用户明确导航时，为停止惯性而冻结当前原生偏移，与逐帧 JS 驱动滚动不是一回事。
- 保留当前手机、横屏、宽屏移动设备、平板和桌面比例。后端数据字段长度变化也需要真机验收。
- 数据接入可以改数据边界，不应顺手修改曲率、间距、深度、手势方向、回弹参数或桌面可见卡数。

## 10. 数据规模与当前尚未覆盖的情况

### 10.1 不是接上真实数组就支持无限数据

- Pack 轮盘当前最大展示数量硬限制为 24；`HomePackCarousels`、`ArcCarousel` 和 `NativePackCarousel` 都有相关限制。超过上限的数据会不可见，不能用“数据库查到了”当作验收通过。
- 普通 Pack 的无限滑动是同一组 Mission 的循环副本，不是网络分页。
- 当前日期数据整体传入首页；长期使用、多年历史的按月加载属于另一个明确的数据契约调整，不要只在返回值中截断日期造成旧月份无标记。
- 第一阶段可使用明确的小规模测试集，但必须记录限制和后续数据规模方案。

### 10.2 真实数据边界必须补验收

- 新用户没有任何加入或完成记录。
- 空 Pack / 空用户 Pack / 没有公开 Pack。
- 日历标记已预取，但对应 Mission 随后下架或权限变化。
- 登录状态变化后，旧日历仍挂载、月份范围仍指向旧用户。
- 列表重新排序、原选中 Pack 被删除、从详情返回时不再属于用户 Pack。
- 多语言长文案、缺失装饰字段、非法 slug/date、超长内容。

现有低层组件有部分空数组与数量边界保护，但这不等于已有完整的生产空态、失败态和账号切换流程。不能用复制假卡片填满空列表。

## 11. 推荐执行顺序及每一步验收

| 阶段 | 执行范围 | 退出条件 |
| --- | --- | --- |
| A：确认和基线 | 阅读本手册、检查差异、确认开发 Supabase 项目与已有 schema、核对 SDK/环境 | 不覆盖用户数据；记录基线；列出阻碍当前阶段的业务问题 |
| B：公开内容读取 | 在获授权开发环境建立/适配 Pack、Mission 数据与 Mapper，替换公开 Repository | `/` 和 Pack 详情读真实内容；稳定排序/ID；卡面完整；普通 Pack 动效无回退 |
| C：身份与个人读取 | 按已确认登录方案接 Auth、昵称、Logout、用户 Pack | A/B 用户隔离；Guest 行为明确；Logout 后不残留旧个人数据 |
| D：完成日历读取 | 统一时区策略，替换注册日期、完成日期、日期详情，调整私有路由生成与缓存 | 标记与详情一致；1/2/3/5/8 张卡可浏览；刷新及跨月返回正确 |
| E：已确认的业务写入 | 之后才做 Take / Complete、幂等、状态校验、刷新失效 | 真正写入成功才更新业务状态；权限、并发、失败恢复通过 |
| F：后续能力 | 语音、Profile、内容管理等另行立项 | 不混入当前只读浏览接入范围 |

实施要求：

1. 每阶段小步交付并验收，不一次改动所有组件。
2. 无真实完成入口时，可在授权开发环境准备明确标注的测试完成记录，以验收日期读取；不得伪称已完成用户业务闭环。
3. 数据库迁移、种子与权限变更需可复现并审查；不要为测试清空生产表。使用当时 Supabase 技能要求的迁移流程，不照猜测执行 CLI 命令。
4. 保留本地 fixture 作为测试资料；是否保留开发 mock 模式另行明确，生产失败不能自动启用 mock。
5. 本手册不要求另开新任务、部署或安装插件；用户自行选择后续执行环境。

## 12. 验证清单

### 12.1 现有前端检查

在仓库根目录运行：

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
```

本手册整理前最近一次结果：286 项测试通过、lint 通过、类型检查通过、build 通过。Node 的 `.ts` 导入模块类型 warning 属于已知测试运行提示，不要为消除提示随意改变整个项目模块模式。

重要测试位置：

| 测试文件 | 要保护的能力 |
| --- | --- |
| `tests/view-transition-boundaries.test.mjs` | 轮盘/详情转场边界与持久 main 结构 |
| `tests/pack-carousel-navigation.test.mjs` | ID 恢复、数量变化、上下轮导航快照 |
| `tests/completed-missions.test.mjs` | 日期对应内容、有限列表、单一转场卡、真实动画完成与清理 |
| `tests/native-scroll.test.mjs` | Safari 原生滚动、冻结/恢复、无逐帧滚动写入、日期返回 |
| `tests/deck-carousel.test.mjs` | 附件卡面、轮盘造型与深度 |
| `tests/calendar-carousel.test.mjs` / `tests/calendar-input.test.mjs` | 弧形日历、月份范围、手势与日期点击 |
| `tests/carousel-settings.test.mjs` / `tests/home-menu-state.test.mjs` | 固定日历、底部集合切换、本地设置和菜单状态 |
| `tests/arc-carousel-geometry.test.mjs` | 响应式几何与拖动方向 |

部分测试直接加载 fixture Repository、静态页面生成函数或提取组件内部逻辑。接后端后要把 fixture 场景保留为契约测试，并增加真实 Repository/权限集成测试；不能为了保持旧 fixture 静态生成测试通过而继续预渲染私有日期。

### 12.2 后端新增验收

- [ ] 未登录只能读取获准公开的内容，不能读取其他人的日历/进度。
- [ ] 用户 A / B 用同一 slug、同一日期访问时不会串数据。
- [ ] 直接调用 Data API 或篡改 ID 也无法越权，不仅是 UI 隐藏按钮。
- [ ] 真实昵称、参与 Pack、注册日期与完成日期来自同一个可信用户。
- [ ] 日历当天内容可跨 Pack；同一 Mission 的 ID、卡面、文案一致。
- [ ] 非法日期、注册前、未来日期、无完成记录按约定处理。
- [ ] 无会话的 build 不生成个人数据、不需要管理员密钥拉取所有用户记录。
- [ ] Logout、再次登录、切换账号后，缓存和本地快照不泄露上个用户内容。
- [ ] 数据库错误与空结果可区分，不静默回退 mock。
- [ ] 任何后续写入均有所有权检查、幂等和状态转换验证。
- [ ] 公开/私有缓存范围与失效点有明确记录。
- [ ] 新建开发数据或迁移可重复验证，未对未授权环境写入。

### 12.3 交给用户手动验收的视觉路径

1. 首页切换用户 Pack / 所有 Pack：下方退出再进入，上日历和月份不重置。
2. 点击 Pack 主图：上下两轮同时退场，主卡移动与 Mission 展开连续。
3. Pack 滑动后返回：从当前浏览位置收拢，封面插回轮盘原位置。
4. 点击有标记日期：当天卡片展开，第一张不闪、不重复，有限滑动。
5. 日期详情滑到最后一张后返回：原路径收回，最终缩成点，而不是小卡突然消失。
6. 只有一张 Mission：没有固定 1.6 秒的空等；无多余收拢等待。
7. Safari / iOS Safari、Chrome 移动端、桌面 Chrome、平板横竖屏分别检查；保留原生惯性与轮盘视觉。
8. 慢网络、会话过期、读取失败、账号切换、内容删除后，不出现页面永久锁定、跳卡或旧用户数据残留。

现有 Node 测试验证逻辑与结构，不直接证明合成动画无闪烁或真机帧率达标。保持这个区别，不把“测试全过”当视觉验收结论。

## 13. 可以直接复制到新任务的开场说明

```text
这是 TODAYSMISSION 的后端接入任务。

请先阅读根目录 BACKEND_INTEGRATION_GUIDE.md、AGENTS.md、
FRONTEND_DEVELOPMENT_PLAN.md，以及相关实际源码。

当前前端已完成轮盘、弧形日历、Pack/日期 MissionGallery、菜单与转场。
上轮盘固定日历，下轮盘在用户 Pack / 所有 Pack 间切换。
不要重做 UI、手势或动画，不要恢复旧版菜单和照片样式。

目标是按原计划使用 Supabase 接真实数据，优先保持现有 DTO 和组件边界。
先检查现状，说明接入顺序、缺少的配置、需要确认的业务规则，
并提出第一批最小改动；在我确认后再执行相应阶段。
特别要确认用户 Pack 的定义、完成是否可重复、日期时区和 Guest 行为。

不要把 mock Logout 当真认证，不要将个人日期详情按 fixture 方式静态生成，
不要把轮盘数量调试按钮接成数据库增删。
保留当前工作区未提交的修改。
不要自行打开浏览器验证，我会手动验收；可以运行代码、类型和构建测试。
不要对未明确授权的 Supabase 项目或生产数据库做写入。
```

## 14. 交付边界

本次仅新增接入手册。没有安装依赖、创建 `.env`、修改 UI、连接用户数据库、执行迁移、发送认证邮件或创建新的开发任务。

手册中的结构建议受 Next.js 的服务端数据边界与 Supabase / Postgres 安全规范约束；具体 SDK、迁移命令与权限语句需在下一任务实施时重新核对。官方更新入口：[Supabase Changelog](https://supabase.com/changelog)。
