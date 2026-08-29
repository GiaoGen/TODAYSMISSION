# TODAYSMISSION（暂定名）— MVP 前端优先开发计划书

> 文档状态：前端执行基线  
> 适用范围：MVP v0.1 前端架构、页面、组件、交互、动效、前后端衔接与质量验收  
> 当前技术基线：Next.js 16.3.3、React 19.2、TypeScript、Tailwind CSS 4  
> 产品名称：暂未最终确定。开发阶段使用 `TODAYSMISSION` 作为工作代号，不把品牌名称散落硬编码在组件中。

---

## 0. 给所有执行任务的最高优先级指令

### 0.1 任何前端设计都必须先与产品负责人确认

**任何涉及前端设计的工作，在写实现代码之前，都必须先与产品负责人交流并获得明确确认。未得到明确确认，不得自行开始实现。**

“前端设计”包括但不限于：

- 页面布局、信息层级、元素位置与页面密度；
- Card 的视觉、尺寸、留白、圆角、边框、遮罩与图片裁切；
- 字体、字号、字重、行高、字距、颜色和视觉 Token；
- Button、Slider、Carousel、Overlay、Player、Recorder 等控件外观；
- Hover、Focus、Pressed、Disabled、Loading、Empty、Error 等状态；
- 拖动、吸附、卡片落下、淡入淡出、Overlay 切换等交互与动效；
- Mobile、Tablet、Desktop 的响应式表现；
- 中英文 UI 文案、换行方式和文化表达；
- 无障碍表现中会改变视觉或交互的部分；
- 计划书未明确规定的任何视觉或交互判断。

执行者在每个 UI 阶段开始前，必须先提交一份简短的“设计确认单”，至少包含：

1. 本次准备实现的范围；
2. 页面或组件的结构说明，必要时提供线框图、参考图或可比较的方案；
3. 默认、操作中、完成、加载、空数据、错误等状态；
4. Mobile 与 Desktop 的差异；
5. 动效触发、过程、结束和中断行为；
6. 中英文文案；
7. 尚未确定、需要产品负责人选择的问题。

只有产品负责人以明确语句确认方案后，才能实现该范围。以下表达不算确认：

- “先看看”；
- “大概这样”；
- “以后再说”；
- 没有回复；
- 仅确认其中一部分。

确认是有范围的。已经确认 Home Card，不代表 Pack Detail、Profile 或其他 Card 自动获得确认；已经确认 Mobile，也不代表 Desktop 自动获得确认。实现过程中如果需要偏离已确认方案，必须先说明原因并重新确认。

### 0.2 不得用通用模板代替产品设计

禁止为了快速产出而自行套用常见 SaaS、AI App、Dashboard 或 Landing Page 模板。尤其禁止擅自加入：

- Hero + 大标题 + Feature Grid；
- 多层 Rounded Panel 或 Card inside Card；
- Dashboard Metrics；
- 渐变光晕、Glassmorphism、大范围 Blur；
- 未经确认的品牌色、Web Font、图标体系或装饰动效；
- 与 Mission、Card、Voice 核心体验无关的 UI。

### 0.3 一次只执行一个已确认阶段

执行者必须先阅读本计划书及原始产品计划书，再确认当前被分配的阶段。不要跨阶段提前实现，也不要因为“顺手”增加功能、依赖、抽象或设计。

---

## 1. 前端开发目标

项目以前端优先驱动开发。优先用真实可操作的前端体验验证核心产品闭环，再接入 Auth、Database 和 Storage：

```text
Choose → Take → Nervous → Do → Complete → Reveal → Voice → Help the next person
```

前端阶段的首要目标不是堆齐页面，而是依次验证四件事：

1. 用户第一次看到 Card 时，能够理解这里有值得选择的内容；
2. Take Mission 的上下文连续、阻力足够低；
3. I am nervous 的 Voice 能够提供真实陪伴感；
4. Completed Slider 与 Card Reveal 能够产生“完成后获得这张卡”的感受。

MVP 仅包含三类产品页面：

- Home / Packs；
- Pack Detail（内部承载 Mission 的不同状态）；
- Profile / My Missions。

Overlay、Modal 和 Mission State 不是新增页面。

---

## 2. 开发原则

### 2.1 Mobile First，但不是只做 Mobile

P0 环境：

- iPhone Safari；
- Android Chrome。

P1 环境：

- Desktop Chrome；
- Desktop Safari。

同一套几何和交互系统根据 viewport 调整 Card size、arc radius、可见卡片数量与间距。禁止先完成 Desktop，再把它压缩成 Mobile。

### 2.2 原生浏览器能力优先

核心交互优先使用：

- CSS transform / opacity；
- Pointer Events；
- requestAnimationFrame；
- MediaDevices / MediaRecorder；
- HTMLAudioElement。

MVP 不引入 Three.js、WebGL、Canvas Carousel、GSAP、复杂物理引擎或大型 UI Kit。新增任何运行时依赖前，执行者必须说明：解决的问题、原生方案为何不足、bundle 和兼容性成本、替代方案，并获得同意。

### 2.3 Server Component 默认，Client Component 按需

- `page.tsx`、`layout.tsx` 和数据读取默认保持 Server Component；
- 只有需要事件、Hook、浏览器 API 或连续交互的叶子组件使用 `"use client"`；
- Carousel、CompleteSlider、VoicePlayer、VoiceRecorder、Overlay Controller 等可以是 Client Component；
- 不得把整页标记为 Client Component 只为使用一个交互控件；
- Client Component 不能是 async function；
- Server 传给 Client 的 Props 必须是最小化、可序列化的 DTO。

### 2.4 不过度抽象

只为已经出现的重复和明确的后端边界抽象。禁止在开发前建立大量 `manager`、`controller`、`factory`、全局 Provider 或万能组件。

---

## 3. 建议的前端目录结构

目录以“路由负责组装、Feature 负责业务、Component 负责复用、Data 负责数据边界”为原则：

```text
app/
  [locale]/
    layout.tsx
    page.tsx
    pack/
      [slug]/
        page.tsx
        loading.tsx
        error.tsx
    me/
      page.tsx
      loading.tsx
      error.tsx
  layout.tsx
  not-found.tsx
  global-error.tsx
  globals.css

components/
  card/
  controls/
  feedback/
  overlay/

features/
  packs/
    components/
    model/
  missions/
    components/
    model/
  completion/
    components/
    motion/
  voice/
    components/
    media/
  auth/
    components/
  profile/
    components/

data/
  contracts/
  fixtures/
  repositories/
  mappers/

lib/
  i18n/
  media/
  validation/
  supabase/        # 后端接入阶段再建立

public/
  cards/
    packs/
    missions/
```

说明：

- 不要求为了符合示意一次性建立所有目录；在首次真实使用时创建；
- `app/` 只处理路由、Metadata、数据读取、错误边界和页面组装；
- 通用视觉组件放入 `components/`，仅被单一业务使用的组件留在对应 `features/`；
- 不使用大规模 barrel export，优先直接从文件导入，避免隐藏依赖和扩大 bundle；
- Next.js 16 使用 `proxy.ts`，不要按旧版本创建 `middleware.ts`；是否需要 Proxy 应在国际化或 Auth 阶段按实际需求决定。

---

## 4. 前端数据边界与后端接入准备

### 4.1 UI 不直接依赖 Supabase 表结构

前端组件只接收领域模型或 UI DTO，不接收 Supabase 原始行对象。建议最小领域对象：

```text
PackSummary
PackDetail
MissionSummary
MissionDetail
MissionProgress
MissionVoice
CompletedMissionCard
PackCompletion
```

DTO 只包含 UI 真正需要的字段。数据库未来增加内部字段时，不应迫使组件变化，也不得把私密字段传入 Client Component。

### 4.2 Fixture 通过统一读取入口提供

前端优先阶段允许使用 Fixture Data，但必须遵循：

- Fixture 必须清楚标识，不得伪装成真实用户数据；
- Page 和 Component 不直接 import 某个 Fixture 文件；
- 统一通过 `data/repositories` 中的读取函数获得数据；
- 后续将该实现替换为 Supabase 时，UI Props 和领域类型尽量不变；
- Fixture 同时覆盖正常、空数据、缺图、长文本和错误模拟场景。

### 4.3 预留的操作契约

前端交互应围绕以下操作定义清晰输入和结果，不要在组件中散落临时请求：

```text
getPacks(locale)
getPackBySlug(locale, packSlug, selectedMissionSlug?)
getProfileCollection(userId, locale)
takeMission(missionId, returnContext)
completeMission(missionId)
getMissionVoices(missionId)
submitMissionVoice(missionId, audioBlob, mimeType, duration)
```

具体使用 Server Action、Server Component 读取或 Route Handler，应在后端接入阶段依据当前 Next.js 与 Supabase 文档确定：

- 内部读取优先由 Server Component 通过 server-only Data Access Layer 完成；
- UI Mutation 倾向使用经过鉴权和输入验证的 Server Action；
- 浏览器媒体上传如需直接访问 Storage，必须依赖用户会话和严格 RLS，不得暴露 service role 或 secret key；
- 不得从 Server Component 反向请求本项目自己的 Route Handler 制造额外网络跳转；
- 每个写操作都必须重新验证身份、资源归属和输入，不依赖页面层的登录判断。

### 4.4 Supabase 安全准备

后端接入时必须满足：

- 暴露 schema 中的表全部启用 RLS；
- `mission_progress` 和 `mission_voices` 的读写策略同时校验 `auth.uid()` 与资源所有权；
- Update Policy 同时具有 `USING` 与 `WITH CHECK`；
- Storage 上传、读取和替换分别有明确策略；
- `service_role` / secret key 永不进入浏览器或 `NEXT_PUBLIC_`；
- Server Action 和 DAL 只返回 UI 所需字段；
- Supabase SDK 版本固定并提交 lockfile；
- 实施前核对当时的 Supabase changelog 和官方文档，不能只凭旧知识实现。

---

## 5. 状态模型

### 5.1 Mission 领域状态

核心持久状态：

```text
BROWSING → TAKEN → COMPLETED
```

建议使用判别联合或明确枚举表达，不用多个可能互相冲突的 Boolean：

```text
status: "browsing" | "taken" | "completed"
```

临时 UI 状态独立存在：

```text
Login Overlay
Nervous / Voice Overlay
Recording Overlay
Dragging / Revealing
Submitting / Failed
```

临时状态不得污染持久领域状态。例如打开 Voice Overlay 不改变 Mission status；完成 Card Reveal 后才提交或确认 completed。

### 5.2 URL 恢复上下文

当前 Mission 应能通过 URL 恢复，例如：

```text
/{locale}/pack/{packSlug}?mission={missionSlug}
```

这样可支持 Refresh、登录返回、Profile Card 回跳。Next.js 15+ 的 `params` 和 `searchParams` 是异步值，执行时必须按项目本地 Next.js 16 文档处理。若 Client Component 使用 `useSearchParams()`，必须放在合适的 Suspense Boundary 内，避免整页 CSR bailout。

### 5.3 登录返回意图

Guest 点击 Take Mission 时保存最小的 return context：

```text
locale + packSlug + missionSlug + intendedAction
```

OTP 成功后回到原 Pack 和 Mission，并继续 Take 操作。禁止默认跳回 Home。

---

## 6. 国际化计划

- MVP locale 仅为 `zh-CN` 与 `en`；URL 建议使用 `/zh` 与 `/en`，内部建立显式映射；
- `app/[locale]` 负责 locale 路由，所有动态 locale 输入必须验证；
- UI 字典与 Pack/Mission 内容分开：UI 字典负责控件文案，内容数据由内容字段或后端提供；
- UI Component 接收已经本地化的 `title`、`description`，不在视图里反复判断 `title_zh` / `title_en`；
- 首次访问可根据浏览器语言重定向，用户手动选择后必须保留选择；
- 不使用运行时外部翻译服务；
- 中英文必须分别检查换行、Card 内排版、按钮长度、语音说明和错误文案；
- 所有正式文案仍属于设计确认范围，未经确认不得自行补写品牌文案。

---

## 7. 样式与组件规范

### 7.1 Design Token

全局 Token 至少覆盖：

```text
--card-ratio: 3 / 4
color shell
surface / border / text hierarchy
spacing scale
type scale
control size
overlay layer
motion duration / easing
safe-area spacing
```

产品计划已经确认统一 3:4 Card 比例，但具体 Card 宽度、圆角、边框、字号、半径和动效数值仍需设计确认。

### 7.2 Tailwind 与 CSS 的职责

- Tailwind：常规 spacing、layout、typography、responsive 和基础状态；
- CSS Module / Component CSS：Carousel 几何、Card Reveal、复杂 CSS Variable、Pointer/RAF 驱动状态；
- 不把复杂动效数学拆成大量难以阅读的动态 class；
- 不在 JSX 中散落重复魔法数字；
- 不建立重复的 Tailwind 与 CSS Token 两套来源。

### 7.3 Card 规范

Pack Card、Text Mission Card、Designed Mission Card 和 Profile Card 必须共享：

- 同一比例 Token；
- 相同的几何基础；
- 可预测的图片容器；
- 明确的内容安全区；
- 稳定的布局尺寸，避免 CLS。

卡片图片优先使用 `next/image`，设置正确尺寸或 `fill + sizes`。当前视觉中心 Card 优先加载，远端 Card 延迟加载。Card Artwork 输出规格必须与产品负责人和美术方向确认。

### 7.4 可访问性

- 所有可操作元素必须使用正确语义，不能只用无语义 `div`；
- Carousel、Slider、Player、Recorder 必须有键盘和可读名称；
- Focus 状态不能被移除，视觉方案需要确认；
- Overlay 打开时管理焦点、关闭时归还焦点，并处理 Escape；
- 音频不得自动播放；
- 不只靠颜色表达状态；
- 支持 `prefers-reduced-motion`，减少或替代非必要位移；
- 触控目标尺寸和手势冲突必须在真机验证。

---

## 8. 交互与性能实现规范

### 8.1 Arc Carousel

- 使用 Pointer Events 统一 Mouse 与 Touch；
- Pointer down 后按需要使用 pointer capture；
- 几何计算尽量写成无副作用纯函数，便于测试；
- 高频 pointer position 保存在 ref 中，不让 React 每帧 setState；
- 每帧只批量更新 CSS Variable 或 transform；
- 只在拖动或 Snap 动画期间运行 RAF，静止立即停止；
- 处理 `pointercancel`、失焦、屏幕旋转和手势中断；
- 明确垂直滚动与横向/弧形拖动的竞争规则；
- 只维护当前 Card 周围必要元素的活跃状态。

### 8.2 Completed Slider / Card Reveal

- Slider progress 是单一事实来源，范围严格归一化为 `0...1`；
- progress 映射到 Card 的 translate、scale、opacity；
- 拖动过程不触发逐帧 React render；
- 释放后的回弹、完成阈值、锁定、失败重试都必须在设计确认单中说明；
- 只有真正完成交互后才提交持久 completed 状态；
- 提交失败时不能让 UI 假装数据已永久成功，需有已确认的恢复策略；
- 主要动画只使用 transform / opacity，避免 width、height、top、left、filter 和持续 blur。

### 8.3 Voice Player / Recorder

- 播放器状态与录音状态分离；
- 只有用户主动操作后播放或请求麦克风权限；
- 录音前使用 `MediaRecorder.isTypeSupported()` 从候选格式中选择当前浏览器支持的 MIME；
- 保存并传递 `Blob`、真实 `mimeType` 与 `duration`；
- 不假设 Safari 一定支持 `audio/webm`；
- 录音过程中处理权限拒绝、设备不存在、录音中断、页面隐藏、录音过短和提交失败；
- 组件卸载时清理 MediaStream Track、Audio URL、RAF、Timer 和事件监听；
- 不在用户设备上做额外音频转码；
- Waveform 如无明确产品价值，不得擅自引入重型计算或绘图库。

---

## 9. 分阶段执行计划

每一阶段都遵循：**提出设计确认单 → 获得明确确认 → 实现 → 自测 → 展示验收 → 才能进入下一阶段。**

### Phase 00 — 项目基线与执行规则

目标：建立可持续开发的技术基线，不实现产品视觉。

任务：

- 确认原始产品计划书、本计划书和当前 Next.js 16 本地文档；
- 检查 TypeScript strict、ESLint、路径别名和构建命令；
- 确定目录策略、命名规范、Fixture 数据边界；
- 确认 locale URL 方案；
- 建立最小质量检查流程。

退出条件：

- `lint`、TypeScript 检查与 production build 可执行；
- 没有引入未使用依赖；
- 技术目录决定已记录；
- 尚未擅自设计页面。

### Phase 01 — 全局视觉基础与 App Shell

设计确认重点：

- 黑白 Shell、背景、文字层级；
- System Sans Stack；
- spacing / type / control / motion Token；
- 全局 Navigation、语言切换和基础页面安全区；
- Mobile 与 Desktop Shell。

实现任务：

- locale layout 与基础路由；
- 全局 CSS Token；
- Loading、Error、Not Found 的结构与已确认视觉；
- Metadata 使用可替换的品牌配置。

退出条件：中英文基础路由、错误边界和 Shell 可访问且响应式稳定。

### Phase 02 — Card System

设计确认重点：

- Pack Card、Mission Text Card、Mission Designed Card；
- Card Artwork 占位规则；
- 文字安全区、长文本和中英文换行；
- Card 的默认、选中、不可用与加载状态。

实现任务：

- 全局 3:4 Card Primitive；
- 三类 Card 的业务组件；
- `next/image` 尺寸与加载策略；
- Fixture 长文本和缺图用例。

退出条件：同一 Card 系统能稳定覆盖 Mobile / Desktop 和中英文极端内容。

### Phase 03 — Home / Pack Arc Carousel

设计确认重点：

- 圆环构图、可见弧线、Card 数量和当前项层级；
- Drag、Snap、Selection；
- Mobile 与 Desktop radius / card size；
- 键盘操作、Reduced Motion 和手势冲突。

实现任务：

- 独立几何模型；
- Pointer + RAF 驱动；
- URL 导航到 Pack；
- 性能与取消流程。

退出条件：iPhone Safari、Android Chrome、Desktop Chrome/Safari 的拖动与 Snap 均可用，无持续 RAF 和明显卡顿。

### Phase 04 — Pack Detail / Mission Browsing

设计确认重点：

- Mission Carousel 或浏览方式；
- Text Mission Card 与 CTA 位置；
- Mission 切换、URL 同步和 Refresh 恢复；
- Guest / Taken / Completed 的视觉差异。

实现任务：

- Pack Detail Server Page；
- 选中 Mission 的 URL 恢复；
- Mission Stage 状态模型；
- Take Mission 入口先连接 Fixture Repository。

退出条件：可在不接后端时完整浏览 Pack，并能从 URL 恢复当前 Mission。

### Phase 05 — Take Mission 与 Login Overlay 原型

设计确认重点：

- Login Overlay 结构；
- Email 输入、OTP 输入、发送中、重发、错误、成功；
- Overlay 与 Mission 上下文的关系；
- 登录成功后的自动继续反馈。

实现任务：

- 前端状态原型；
- return context；
- 可替换 Auth Adapter；
- 焦点、键盘与滚动锁定。

退出条件：Fixture Auth 流程能够模拟从 Take → Login → 返回同一 Mission → Taken，且未把假登录当作生产能力。

### Phase 06 — Completed Slider 与 Card Reveal

设计确认重点：

- Slider 轨道、Handle、提示文案；
- progress 到 Card motion 的完整映射；
- 阈值、回弹、完成锁定和 Reduced Motion；
- 完成提交失败或中断的视觉处理。

实现任务：

- progress 模型；
- Pointer / Keyboard 行为；
- transform-only Card Reveal；
- 完成后的领域状态切换。

退出条件：P0 真机交互流畅；拖动不逐帧触发 React render；可取消、可恢复、可访问。

### Phase 07 — I am nervous / Voice Listening

设计确认重点：

- Voice Overlay 构图；
- Avatar、Play、Progress、Duration、Next Voice；
- 无 Voice、加载失败、播放失败；
- Overlay 关闭和返回 Mission 的方式。

实现任务：

- Audio 状态机与资源清理；
- 与 Mission ID 强绑定的 Fixture Repository；
- 播放进度、切换和错误处理。

退出条件：音频不会自动播放，切换与关闭无资源泄漏，不出现社交 Feed 式 UI。

### Phase 08 — Voice Recording

设计确认重点：

- 权限前、录音中、停止、试听、重录、提交状态；
- Voice 是否可跳过——若产品规则仍未确定，Completed 与 Recording 必须保持独立；
- 时长限制、错误和权限拒绝文案。

实现任务：

- MIME 能力检测；
- MediaStream / MediaRecorder 生命周期；
- Preview Object URL；
- 提交契约与 Fixture Upload Adapter。

退出条件：Safari / Chrome 使用各自支持格式完成 Record → Preview → Re-record → Submit；资源全部正确释放。

### Phase 09 — Profile / Card Collection

设计确认重点：

- Personal Card Collection 的构图；
- Pack Completion 如何由 Pack Card 表达；
- 空集合、加载、错误；
- 从 Card 返回对应 Mission。

实现任务：

- Collection 数据契约；
- Card 列表或几何展示；
- Pack Completion 计算展示；
- URL 回跳。

退出条件：Profile 由 Card 主导，不退化为 Dashboard 或带勾的任务列表。

### Phase 10 — Supabase 接入

目标：在尽量不改 UI 契约的前提下，用真实数据替换 Fixture。

任务：

- 核对最新 Supabase changelog 与官方文档；
- 接入 Email OTP、SSR Session、Database、Storage；
- 建立 server-only DAL、Mapper 和最小 DTO；
- 逐项替换 Repository；
- 落实 RLS、Storage Policy、输入验证、错误映射；
- 验证未登录恢复与真实上传播放。

退出条件：Fixture 不进入生产路径；每个用户只能读写被授权的数据；客户端不存在 Secret；关键路径有真实集成验证。

### Phase 11 — 整体移动端打磨与发布前验收

任务：

- 真机检查 Safe Area、动态 viewport、软键盘、滚动锁定；
- 检查 Carousel / Slider 手势冲突；
- 检查麦克风权限、后台切换、音频播放；
- 检查中英文长文本与字体回退；
- 检查 Reduced Motion、键盘与 Screen Reader 基础路径；
- 执行 lint、类型检查、build、关键流程测试与 bundle 检查。

退出条件：P0 设备完整走通核心闭环，P1 浏览器无功能性缺陷，未出现超出预算的依赖或持续主线程任务。

---

## 10. 代码规范

### 10.1 TypeScript

- 保持 `strict: true`；
- 禁止用 `any` 逃避建模；外部输入先视为 `unknown` 并验证；
- Props、领域对象、操作结果显式定义；
- 状态优先使用判别联合，避免互斥 Boolean；
- 不重复声明数据库类型与 UI DTO；由 Mapper 明确转换；
- 动态 route params、search params、locale、slug 必须验证。

### 10.2 React

- 组件保持单一职责，复杂逻辑移入相邻 Hook 或纯函数；
- 不在组件内部定义新组件；
- 不用 Effect 计算可在 Render 推导的状态；
- 高频瞬时值使用 ref，不放入导致全树重渲染的 Context；
- 使用函数式 state update 处理依赖旧值的更新；
- Event Listener、Timer、RAF、MediaStream 和 Object URL 都必须清理；
- 不为简单表达式滥用 `useMemo` / `useCallback`；
- 列表 key 使用稳定 ID，不使用 index 代替业务 ID。

### 10.3 Next.js

- 写代码前阅读仓库 `node_modules/next/dist/docs/` 中与任务有关的当前版本文档；
- 默认 Server Component，缩小 `"use client"` 边界；
- Server Component 直接读取服务端数据，不请求自身 API；
- `params`、`searchParams`、`cookies()`、`headers()` 按 Next.js 16 异步 API 使用；
- 错误、Loading、Not Found 使用 App Router 文件约定；
- 图片使用 `next/image` 并提供正确 `sizes`；
- 内部导航使用 `next/link`；
- 密钥和数据库访问只存在于 server-only 边界。

### 10.4 命名与文件

- 组件名使用 PascalCase，Hook 使用 `useXxx`，普通函数使用 camelCase；
- 文件和目录统一使用清晰、可搜索的命名，避免 `utils.ts`、`common.ts` 成为杂物箱；
- 一个文件只承担一个主要职责；
- 公共 API 明确，内部实现不随意跨 Feature 引用；
- 注释解释“为什么”，不复述代码“做了什么”；
- 删除无用代码，不保留大段注释掉的旧实现。

### 10.5 CSS 与 Motion

- Token 统一来源；
- 动画只在需要时设置 `will-change`，结束后移除；
- 不把 layout read 与 write 在同一帧反复交错；
- 使用 transform / opacity 驱动核心 Motion；
- 不使用未经确认的任意像素和颜色；
- Reduced Motion 是每个动效组件的验收项，不是发布前补丁。

---

## 11. 测试与质量门槛

### 11.1 每个阶段最低检查

- ESLint 通过；
- TypeScript 通过；
- Next.js production build 通过；
- 无明显 Console Error / Hydration Error；
- 已确认范围的 Mobile 与 Desktop 手工验收；
- 新增交互具备正常、取消、错误和清理路径；
- 未加入范围外功能或依赖。

### 11.2 优先自动化的内容

- Carousel 几何、Clamp、Snap target 等纯函数；
- Mission 状态转换；
- locale / slug / DTO Mapper；
- MIME 格式选择；
- Pack Completion 计算；
- 核心 E2E：Browse → Take → Login Return → Complete → Reveal → Record → Profile。

测试工具在首次编写真实测试时再安装，不提前建立空测试体系。安装前说明用途和维护成本。

### 11.3 真机验收不可替代

模拟器不能替代以下项目：

- iOS Safari Pointer / Scroll 行为；
- Android Chrome 手势冲突；
- 麦克风权限和真实 MediaRecorder MIME；
- 移动端音频播放限制；
- Safe Area、动态地址栏、软键盘与 viewport；
- 低性能设备上的拖动和 Card Reveal 流畅度。

---

## 12. Definition of Ready

一个前端任务只有同时满足以下条件才可以进入实现：

- 任务属于当前 Phase；
- 输入、输出和不做事项清楚；
- 所需产品规则已确认，或已明确采用可替换的临时策略；
- 设计确认单已经得到产品负责人明确确认；
- 依赖的数据契约或 Fixture 已定义；
- 浏览器和响应式验收范围明确；
- 没有依赖另一个尚未完成的核心交互。

不满足时，执行者应先列出问题与建议选项并等待确认，不得猜测设计后继续。

---

## 13. Definition of Done

一个前端任务完成必须同时满足：

- 实现与已确认设计一致；
- 没有擅自扩展范围；
- 正常、加载、空、错误、取消和权限状态按任务需要处理；
- 中英文均已检查；
- Mobile 与 Desktop 均已检查；
- 键盘、Focus、语义和 Reduced Motion 达到本阶段要求；
- 高频交互无不必要 React 重渲染和持续 RAF；
- 资源、事件、Timer、MediaStream 正确清理；
- lint、类型检查、build 通过；
- 相关测试通过；
- 后端边界清楚，没有把 Fixture 或数据库结构耦合进 UI；
- 变更说明包含：做了什么、没有做什么、如何验证、尚存风险。

---

## 14. 当前已知但不阻塞前端架构的问题

以下问题不得由执行者擅自决定：

1. 最终产品名与品牌资产；
2. Card Artwork 的具体美术语言；
3. 完成 Mission 后 Voice 是否强制；
4. Voice Pool 的数量、筛选和排序；
5. Email OTP 的正式邮件文案与交付方案；
6. Completed Slider 的具体阈值、回弹、完成锁定和庆祝强度；
7. Home 与 Pack Detail 的最终 Carousel 几何参数；
8. Profile Collection 的最终布局；
9. 任何正式中英文品牌文案。

这些问题可以通过可替换的状态或数据契约避免阻塞技术基础，但相关 UI 开始前必须向产品负责人确认。

---

## 15. 执行汇报模板

其他任务在开始前应使用以下格式：

```text
当前阶段：Phase XX
本次范围：
不会处理：

设计方案：
- 页面/组件结构：
- 状态：
- Mobile：
- Desktop：
- Motion：
- 中英文文案：

需要你确认的问题：
1.
2.

在获得明确确认前，我不会开始实现上述前端设计。
```

完成后应使用以下格式：

```text
已完成：
未包含：
验证结果：
与已确认设计的差异：无 / 说明
后端接入预留：
剩余风险或下一步：
```

---

## 16. 最终判断标准

每一次前端变更都必须回答：

1. 它是否帮助用户完成 Mission？
2. 它是否强化 Card、Mission、Voice 三个核心元素？
3. 它是否值得让移动端承担对应性能成本？
4. 它是否已经与产品负责人沟通并明确确认？
5. 它是否保持了清晰代码结构，并为真实后端接入留下稳定边界？

任何一项答案为否，都不应直接进入 MVP 实现。
