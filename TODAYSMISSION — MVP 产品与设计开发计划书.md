# TODAYSMISSION — MVP 产品与设计开发计划书

**版本：MVP v0.1**  
**目标：尽快进入 Coding，同时保证移动端性能、Chrome / Safari WebKit 兼容性，以及中国大陆 / 英语市场双端可用。**

---

# 1. 产品核心

TODAYSMISSION 是一个以 **Mission Challenge + Collectible Card + Real Voice Encouragement** 为核心的产品。

用户不是单纯“打卡任务”。

核心体验是：

**选择自己想挑战的问题**

↓

进入对应 Pack

↓

选择一个 Mission

↓

**Take this mission**

↓

真正去现实世界完成 Mission

↓

如果害怕：

**I am nervous**

↓

听曾经完成过这个 Mission 的用户留下的真实录音

↓

完成挑战

↓

拖动 Completed Slider

↓

设计 Mission Card 随着拖动落下

↓

完整覆盖原本的文字 Mission Card

↓

**获得 / 解锁这张 Mission Card**

↓

用户可以录下一段 Voice

↓

未来另外一个不敢完成这个 Mission 的人，可以听到这段 Voice

因此核心循环是：

**Choose → Take → Nervous → Do → Complete → Reveal → Voice → Help the next person**

TODAYSMISSION 不应被设计成传统：

- Habit Tracker
- Todo App
- 社交 Feed
- 打卡社区
- 心理咨询产品
- 游戏化任务列表

卡片、现实挑战和真实声音共同构成产品本身。

---

# 2. MVP 市场

## Primary Markets

TODAYSMISSION 第一阶段同时面向：

**中国大陆**

以及

**Global English-speaking Market**

两边在产品设计层面的优先级基本相同。

不是：

> 海外版 + 顺便支持中文

而是：

> 一个产品，从第一天支持中文和英文。

MVP 直接部署：

**Vercel**

不为中国大陆单独部署一套基础设施。

---

# 3. 语言架构

MVP 支持：

**Simplified Chinese — `zh-CN`**

**English — `en`**

Pack 和 Mission 内容分别保存中英文内容，不在前端即时翻译。

例如：

```text
title_zh
title_en

description_zh
description_en
```

这样未来可以真正针对不同文化调整 Mission wording，而不被逐字翻译绑定。

用户首次进入按照浏览器语言选择语言，同时保留手动切换。

技术路由可以采用：

```text
/en
/zh

/en/pack/[slug]
/zh/pack/[slug]

/en/me
/zh/me
```

这仍然只有 **3 种产品页面**。

语言不同不算新增页面。

---

# 4. 页面架构

MVP 只做三个核心页面。

## 01 — Home / Packs

作用：

**选择自己想挑战的 Pack。**

这是产品最强的第一视觉页面。

主要内容只有：

**Pack Card Carousel**

以及非常少量的信息。

不做传统：

- Hero Section
- 大标题
- 产品介绍
- Feature Grid
- 一堆说明文字
- 巨大 CTA Banner

用户进入以后应该很快理解：

> 这里有一些东西可以选择。

### Pack Card

Pack 必须拥有完整的设计卡片。

所有卡片统一比例。

MVP 基准：

**3 : 4 Portrait Card**

比例定义成全局 Design Token，不把宽高写死在各个组件中。

例如：

```css
--card-ratio: 3 / 4;
```

以后如果重新决定卡片比例，只需要改整个系统的一处。

### Carousel

视觉参考：

**Viscose Carousel**

但只参考：

- 大型圆环
- 卡片沿圆弧排列
- 只看到巨大圆环的一部分
- 当前 Card 成为视觉中心
- Drag / Swipe 转动
- Card 自动 Snap

不复制它的：

- 粘液效果
- Card merging
- Shader
- Thread
- Blur morph
- Heavy hover interaction

原 Viscose 项目实际上使用 Next.js / React，同时依赖 Three.js 和 GSAP；其核心卡片甚至不是 DOM Card，而是一个全屏 fragment shader 中的 SDF 图形。 

TODAYSMISSION 不采用这套实现。

我们只是借用它的：

> **Carousel Composition**

而不是：

> **Rendering Technology**

---

# 5. Pack Detail — 产品核心页面

这是整个 MVP 最重要的页面。

一个 Pack 中包含多个精心设计的 Mission。

用户在这里：

**浏览 Mission → Take Mission → 执行 → 害怕时听 Voice → 完成 → 解锁 Card → 录 Voice**

不再额外拆一个 Mission Detail Page。

Mission 是 Pack Detail 内部的不同状态。

---

# 6. Mission 的两个 Card 状态

这是 TODAYSMISSION 最重要的视觉逻辑之一。

## 未完成 Mission

用户不能直接看到完整设计 Mission Card。

最初出现的是：

**Text Mission Card**

例如：

```text
GO TO
THE MOVIES
ALONE.
```

视觉主体是任务本身。

文字卡和最终设计卡：

**完全相同尺寸**

**完全相同 3:4 比例**

这样两者才能自然发生 Reveal。

---

# 7. Take this mission

用户可以：

- 浏览 Home
- 浏览 Packs
- 查看 Mission

而不需要登录。

只有第一次真正点击：

**Take this mission**

才要求登录。

逻辑：

```text
Guest
↓
Browse Mission
↓
Take this mission
↓
Login Overlay
↓
Login success
↓
Mission = Taken
```

登录不制作独立的大型页面。

采用：

**Modal / Overlay**

因此用户不会因为注册流程离开 Mission 上下文。

---

# 8. 登录方案

MVP 推荐：

**Email OTP**

不把 Google Login 作为核心登录方式。

原因很简单：

中国大陆和英语市场需要使用同一个基础机制。

用户：

```text
输入 Email
↓
收到验证码
↓
输入验证码
↓
完成登录
```

Supabase Auth 原生支持 Email OTP，并且能够直接与数据库 RLS 权限系统结合。

未来可以增加：

Apple / Google / 其他登录方式。

但不属于 MVP 必需功能。

---

# 9. Mission Taken 状态

用户 Take Mission 后，页面状态改变。

原来的：

**Take this mission**

消失。

此时出现两个最重要的行为入口：

### I am nervous

以及

### Completed Slider

这里不能加入大量解释文字。

页面应该让用户自然意识到：

**害怕 → I am nervous**

**完成 → Slide**

---

# 10. I am nervous

这是核心产品功能，不是社区。

它不叫：

- Reviews
- Community
- Feed
- Experiences
- 心得社区

用户已经接下 Mission，但真正执行之前产生恐惧、犹豫或者退缩时：

点击：

**I am nervous**

进入一个非常轻的 Voice Listening Overlay。

这里播放：

**真正完成过同一个 Mission 的用户留下的录音。**

它的意义不是：

> 看别人怎么评价这个 Mission。

而是：

> 听听那些曾经和我一样害怕，但后来真的做了的人说了什么。

因此 Voice 数据始终绑定：

```text
Mission ID
```

不同 Mission 的 Voice 不混在一起。

MVP 不增加：

- 评论
- Follow
- 私信
- 社交 Feed
- 用户讨论区

也不把 Voice 设计成传统内容平台。

---

# 11. Voice Player

Voice Overlay 保持非常简单。

核心只有：

**身份标识 / Avatar**

**Play**

**Waveform / Progress**

**Duration**

以及切换到另一段 Voice 的方式。

这里不出现评论卡片式的大量矩形容器。

整个页面仍然保持黑白 UI。

Voice 是内容本身。

---

# 12. Completed Slider

传统：

```text
[ Complete ]
```

不符合 TODAYSMISSION 的产品感。

因此完成 Mission 使用：

**Completed Slider**

用户必须真实拖动滑块。

更重要的是：

## Slider Position = Card Reveal Progress

Slider 从起点向终点移动时：

隐藏在 Text Mission Card 上方 / 后方的：

**Designed Mission Card**

开始向下移动。

例如概念上：

```text
0%

Designed Card
    ↑
    ↑ hidden

[ TEXT MISSION ]
```

拖动：

```text
██████░░░░

Designed Card
        ↓

[ TEXT MISSION ]
```

继续：

```text
█████████░

[ DESIGNED ]
[   CARD   ]
     ↓
[ text ... ]
```

最终：

```text
██████████

[ DESIGNED ]
[ MISSION  ]
[   CARD   ]
```

设计 Card 完全落下。

Text Mission 被覆盖。

Mission 正式 Completed。

---

# 13. Card Reveal 的产品意义

这里不是单纯做一个漂亮动画。

它代表：

> **你完成了这个 Mission，因此获得了这张 Card。**

所以 Mission Card 本质上是：

**Completion Artifact**

而不是普通 UI Thumbnail。

这也自然解释了为什么 Profile 页面以 Card 为核心。

用户以后看到自己的 Profile，不是在看：

```text
✔ Movie Alone
✔ Ask Someone
✔ ...
```

而是在看：

> **自己真正获得过的一组 Card。**

---

# 14. Completed Animation 技术原则

这个动画必须保证移动端性能。

因此只允许主要操作：

```css
transform
opacity
```

Card 落下主要使用：

```css
transform: translate3d(...)
```

Slider 的 Pointer Position 直接映射：

```text
progress 0 → 1
```

再映射到：

```text
card translateY
card scale
card opacity
```

不使用：

- Canvas
- WebGL
- Three.js
- Shader
- 大范围实时 Blur
- 大范围 Filter
- Physics Engine

拖动过程中不需要 React 每一帧重新 render。

使用：

**Pointer Events + requestAnimationFrame + CSS transform**

Release 后再把最终状态交还 React State。

---

# 15. Voice Recording

Mission 完成以后，产品提供录音步骤。

用户留下的不是：

**文字心得**

而是：

**Voice**

录音未来进入对应 Mission 的 Voice Pool。

供下一个点击：

**I am nervous**

的人听。

MVP 不做自动语音转文字。

因为该功能目前没有被确定为产品需求。

---

# 16. Voice Recorder UI

录音界面仍然保持极简。

核心：

**Microphone**

**Recording State**

**Duration**

**Stop**

**Playback**

**Re-record**

**Submit**

不设计传统：

```text
标题
描述
输入框
表单框
很多按钮
```

录音前只有在真正需要麦克风时才请求权限。

Web 端使用：

**MediaRecorder API**

MediaRecorder 已经属于主流浏览器广泛支持的 Web API；具体录制格式不能假定 Chrome 和 Safari 完全一致，因此实现时使用 `MediaRecorder.isTypeSupported()` 检测当前浏览器可用 MIME，而不是强制所有设备输出同一种格式。

这对于 Safari WebKit 尤其重要。

因此系统存储：

```text
audio file
mime_type
duration
```

播放器使用浏览器原生可播放格式。

不在用户设备上进行额外音频转码。

---

# 17. Profile

第三个核心页面：

**Profile / My Missions**

主要功能：

查看：

**已经完成的 Mission**

以及：

**Pack Completion**

Profile 依然必须由 Card 主导。

不是 Dashboard。

不要出现：

- 巨大统计面板
- 一堆矩形 Metrics Card
- Pie Chart
- 企业后台式 Progress Panel

---

# 18. Profile Card Collection

用户完成 Mission 后获得的 Designed Mission Card 出现在这里。

因此 Profile 第一视觉应该类似：

**Personal Card Collection**

而不是传统：

```text
My completed missions
---------------------
Mission 1 ✓
Mission 2 ✓
Mission 3 ✓
```

Pack 完成情况同样尽量利用：

**Pack Card**

本身表达。

Pack 和 Mission Card 使用同一个 Card Ratio 和视觉系统。

---

# 19. 全局视觉语言

## 核心色彩

UI Shell：

**Black**

**White**

**Neutral Gray**

不建立复杂 Accent Color System。

Mission / Pack Card Artwork 本身属于内容视觉，不需要被 UI Accent Color 限制。

---

# 20. Typography

禁止形成现在很多“设计网站模板”的套路：

```text
左上角
巨大 Serif Heading

下面一行
小号说明文字

右边
卡片
```

TODAYSMISSION 不采用这种结构。

MVP 甚至可以先不加载额外 Web Font。

优先：

**System Sans Stack**

原因：

- 移动端性能好
- 不产生字体 Flash
- 不依赖 Google Fonts
- 中国大陆访问稳定
- 中英文可以自动使用优秀系统字体

品牌感主要通过：

**Typography Scale**

**Letter Spacing**

**Whitespace**

**Alignment**

建立。

而不是靠一款夸张字体。

---

# 21. Shape Language

页面中真正允许成为明显矩形的东西应该主要只有：

**Cards**

其他交互控件尽量采用：

**Circle**

或者：

**Pill**

避免：

```text
Rounded Rectangle
Rounded Rectangle
Rounded Rectangle
Rounded Rectangle
```

形成典型 SaaS / AI App 风格。

尤其避免：

- Rounded Panel
- Nested Card
- Card inside Card
- Shadow Box
- Settings-like blocks

---

# 22. Card Design System

所有：

**Pack Card**

**Text Mission Card**

**Designed Mission Card**

统一：

**3:4**

但视觉内容不同。

统一尺寸的意义不仅是美术规范。

它还允许：

```text
Pack → Mission

Text Card → Designed Card

Mission → Profile Collection
```

发生自然视觉延续。

Card 应该成为 TODAYSMISSION 最主要的产品视觉资产。

---

# 23. Carousel 技术设计

Carousel 自己实现。

不复制 Viscose shader。

DOM 大致：

```text
Carousel
 ├ Card
 ├ Card
 ├ Card
 ├ Card
 └ Card
```

每张 Card 根据：

```text
index - activeIndex
```

获得一个相对角度。

然后计算：

```text
rotation
x
y
scale
```

最终只通过：

```css
transform
```

定位。

Drag 同时支持：

**Touch**

**Mouse**

统一通过：

**Pointer Events**

实现。

---

# 24. Carousel Motion

只保留三个重要 Motion：

### Drag

用户可以直接拖圆环。

### Snap

停止拖动以后自动吸附最近 Card。

### Selection

当前 Card 获得轻微：

**scale / position / opacity hierarchy**

不做粘液融合。

不做 Cursor Fluid。

不做复杂 hover。

移动端没有 Hover，因此整个核心交互从一开始按照：

> **Touch First**

设计。

Desktop 只是拥有更大的空间，而不是另一套产品。

---

# 25. Responsive 原则

不能：

> Desktop 做好以后压缩成 Mobile。

而应该：

**同一套几何系统根据 viewport 改变 radius / card size / visible arc。**

Mobile：

Card 占屏幕视觉比例更大。

Desktop：

圆环半径扩大，露出的弧线更多。

但交互逻辑完全一样。

---

# 26. 前端技术栈

MVP：

### Framework

**Next.js + React + TypeScript**

使用：

**App Router**

原因不是因为需要复杂 SSR。

而是：

- 路由简单
- Vercel 部署直接
- Server / Client boundary 清晰
- 后续 API / Auth 容易扩展

---

### Styling

**Tailwind CSS**

负责：

- spacing
- typography
- responsive
- layout
- 基础状态

但是：

Carousel geometry / card animation 等高度定制的视觉组件允许使用：

**CSS Module / Component CSS**

不要强迫所有动画数学都写成 Tailwind class。

---

### Animation

MVP：

**不安装 Three.js。**

**不安装 GSAP。**

核心交互优先：

```text
CSS Transform
CSS Transition
Pointer Events
requestAnimationFrame
```

只有未来真的出现 CSS + RAF 无法优雅解决的问题，再引入 Motion Library。

不要一开始为了“可能会用”装一整套动画框架。

---

# 27. Backend

MVP 使用：

**Supabase**

负责：

**Auth**

**PostgreSQL Database**

**Storage**

因此架构：

```text
Browser
   ↓
Next.js
   ↓
Supabase
```

部署：

```text
Frontend / Next
→ Vercel

Database / Auth / Audio
→ Supabase
```

不自己搭服务器。

---

# 28. MVP 数据结构

只建立真正需要的数据。

## profiles

```text
id
username
avatar
created_at
```

---

## packs

```text
id
slug

title_zh
title_en

description_zh
description_en

card_asset

created_at
```

---

## missions

```text
id
pack_id

slug

title_zh
title_en

description_zh
description_en

card_asset

order
```

---

## mission_progress

表示：

某个用户和某个 Mission 的关系。

```text
user_id
mission_id

status

taken_at
completed_at
```

状态只需要满足现有产品逻辑，例如：

```text
taken
completed
```

Pack Progress 不另外保存。

直接根据：

```text
completed missions / pack missions
```

计算。

避免重复状态。

---

## mission_voices

```text
id

mission_id
user_id

audio_path
mime_type
duration

created_at
```

Voice 和 Mission 强绑定。

---

# 29. Audio Storage

录音文件不存进 PostgreSQL。

存：

**Supabase Storage**

数据库只保存：

```text
audio_path
```

Supabase Storage 本身就是为了将图片、音视频等文件与数据库记录分开存储。

播放时再取得对应资源。

---

# 30. Auth / Permission

Guest 可以：

```text
Read Packs
Read Missions
```

登录用户才可以：

```text
Take Mission

Complete Mission

Upload Voice

Read / modify own progress
```

通过 Supabase：

**RLS**

控制：

```text
mission_progress.user_id = auth.uid()
```

以及：

```text
mission_voices.user_id = auth.uid()
```

防止用户修改别人的 Mission Progress。

---

# 31. 静态 Card Asset

MVP Pack 数量和 Mission 数量有限，因此 Card Artwork 第一阶段直接作为项目静态资源。

例如：

```text
/public/cards/

packs/
missions/
```

不为了少量设计图提前造 CMS。

数据库只保存：

```text
asset key / path
```

未来 Card 数量扩大以后再迁移 CDN / Storage。

---

# 32. 性能原则

这是 MVP 的硬要求。

目标设备包括：

**iPhone Safari**

**Android Chrome**

**Desktop Chrome**

**Desktop Safari**

关键原则：

### 只动画 Transform / Opacity

尽量避免动画：

```text
width
height
top
left
filter
blur
box-shadow
```

---

### 不持续运行 RAF

只有：

**用户正在 Drag**

或者：

**正在进行动画**

时运行 `requestAnimationFrame`。

静止以后立即停止。

---

### Card Image 优化

卡片资源提前输出：

**WebP / AVIF**

按合理尺寸提供。

当前 Card 优先加载。

远处 Card Lazy Load。

---

### 限制同时活动的 DOM

即使一个 Pack 中未来有很多 Mission：

也没必要让几十张 Card 同时进行 transform / animation。

Carousel 重点维护当前 Card 周围有限的视觉元素。

---

### Avoid Blur UI

TODAYSMISSION 不采用大量：

```text
backdrop-filter
blur()
glassmorphism
```

既不符合黑白极简方向，也会增加移动 GPU 压力。

---

### `will-change`

只在 Drag / Animation 时使用。

不对整个页面永久：

```css
will-change: transform;
```

避免移动浏览器长期保存大量 compositor layers。

---

# 33. Safari / Chrome Compatibility

开发过程中优先遵循：

**Progressive Enhancement**

核心功能必须：

Safari / Chrome 都能执行。

尤其是 Voice Recorder：

不能写死：

```text
audio/webm
```

而应该：

```text
MediaRecorder.isTypeSupported(...)
```

动态选择当前设备支持的录音格式。

Carousel 不依赖浏览器特定 API。

使用标准：

**Pointer Events**

**CSS Transform**

**RAF**

---

# 34. 不使用的技术

MVP 明确不要：

**Three.js**

**WebGL**

**GLSL Shader**

**Canvas Carousel**

**GSAP**

**复杂 Physics Engine**

**Heavy Component Library**

**大型 UI Kit**

**Google Fonts runtime dependency**

**CMS**

理由不是这些技术不好。

而是：

> TODAYSMISSION 的核心体验根本不需要它们。

---

# 35. Component Architecture

第一阶段组件保持非常简单：

```text
components/

Card/
PackCard/
MissionTextCard/
MissionDesignCard/

Carousel/
ArcCarousel/

Mission/
MissionStage/
TakeMission/
NervousButton/
CompleteSlider/
CardReveal/

Voice/
VoicePlayer/
VoiceRecorder/

Auth/
LoginOverlay/

Profile/
CardCollection/
PackProgress/
```

不要在开发前建立大量：

```text
abstract
factory
controller
manager
provider
```

只在真正产生重复的时候再抽象。

---

# 36. Pack Detail State

Pack Detail 最重要的不是 URL，而是 State。

概念状态：

```text
BROWSING
↓
TAKEN
↓
COMPLETED
```

同时存在临时 UI 状态：

```text
Nervous Overlay

Recording Overlay

Login Overlay
```

它们不是新的 Product Page。

---

# 37. 未登录恢复逻辑

一个重要细节：

用户点击：

**Take this mission**

↓

Login

↓

成功以后

不能让用户回 Home。

必须回到：

**刚才那个 Pack + 刚才那个 Mission**

然后自动继续：

**Take Mission**

这样登录不会打断产品体验。

---

# 38. URL / Mission State

Pack Detail 可以通过：

```text
/pack/fear-of-rejection?mission=xxx
```

或者内部 slug 保存当前 Mission。

这样：

- Refresh 不丢失当前 Mission
- Login 回来知道用户刚才在哪
- Profile 点击 Card 可以返回原 Mission

不需要再增加 Mission Page。

---

# 39. MVP 开发顺序

为了最快进入 Coding，不按照：

> Database → API → Backend → UI

开发。

而按照最核心体验优先。

## Phase 01 — Project Shell

建立：

```text
Next.js
TypeScript
Tailwind
Routing
locale
global CSS
```

以及：

```text
/
/pack/[slug]
/me
```

---

## Phase 02 — Card System

先实现：

**统一 3:4 Card**

**Pack Card**

**Mission Text Card**

**Mission Design Card**

把整个产品的视觉基础确定下来。

---

## Phase 03 — Arc Carousel

实现：

**Touch / Mouse Drag**

**Arc Geometry**

**Snap**

**Responsive Radius**

先让：

Home Pack Carousel

真正达到视觉标准。

---

## Phase 04 — Pack Detail

加入：

**Mission Carousel**

**Mission Text Card**

**Take this mission**

这时候即使没有 Backend，也已经可以验证核心 UX。

前端开发阶段可以使用明确标注的 Fixture Data。

但不能在正式产品里用假数据冒充真实用户功能。

---

## Phase 05 — Completion Interaction

这是第一阶段最重要的 Motion。

实现：

**Completed Slider**

↓

**Slider Progress**

↓

**Designed Card Fall**

↓

**Card Reveal**

做到：

iPhone Safari

和

Android Chrome

都流畅以后，再继续增加功能。

---

## Phase 06 — I am nervous

实现 Voice Overlay：

```text
Open
Play
Pause
Progress
Next Voice
Close
```

先把真实产品交互做出来。

---

## Phase 07 — Recording

实现：

```text
Microphone permission
Record
Stop
Preview
Re-record
Submit
```

处理 Safari / Chrome MIME Difference。

---

## Phase 08 — Supabase

再接：

**Auth**

**Database**

**Storage**

把：

```text
Take Mission
Complete Mission
Voice
```

从前端状态变成真实数据。

---

## Phase 09 — Profile

读取真实：

**mission_progress**

生成：

**Completed Mission Card Collection**

以及：

**Pack Completion**

---

## Phase 10 — Mobile Polish

最后集中处理：

**iOS Safari**

**Android Chrome**

包括：

- Touch conflict
- Viewport height
- Safe Area
- Slider gesture
- Carousel gesture
- Audio permission
- Audio playback
- Font size
- Card scale
- Scroll locking
- Overlay

---

# 40. MVP Testing Priority

优先级：

### P0

iPhone Safari

Android Chrome

### P1

Desktop Chrome

Desktop Safari

不能出现：

> Desktop 完美，然后移动端降级到勉强可用。

TODAYSMISSION 从产品属性上就应该：

**Mobile First**

但 Desktop 同样获得完整体验。

---

# 41. MVP 明确不做

当前计划不擅自增加以下功能：

- 社交 Feed
- 评论
- Like
- Followers
- Private Message
- Leaderboard
- AI Recommendation
- AI Voice Analysis
- Voice Transcript
- Mission AI Generation
- 用户自己创建 Mission
- CMS
- Achievement System
- Points
- Level
- Streak
- Push Notification
- Native App
- NFC Card requirement
- Location Verification
- Photo Proof
- Mission Completion Proof

这些未来是否存在，需要重新经过产品判断。

MVP 不默认存在。

---

# 42. 尚未锁定，但不阻塞 Coding 的问题

目前唯一几个没有正式确定的产品规则：

### Voice 是否强制

尚未确定：

> 完成 Mission 后是否必须录 Voice 才算整个流程结束。

因此第一阶段前端：

**Completed**

和

**Voice Recording**

先保持两个独立 State。

等产品规则确定，只需要决定 Recording 是否允许 Skip。

不会影响架构。

---

### Voice 展示数量 / 排序方式

暂未确定：

点击：

**I am nervous**

之后系统选择哪些 Voice。

因此 MVP 数据结构只建立：

```text
Mission → Voices
```

暂时不设计复杂 Recommendation Algorithm。

---

### Card Artwork 具体美术语言

当前只确定：

- Card 是核心
- Pack 有设计 Card
- Completed Mission 解锁设计 Card
- Card 比例统一
- UI 黑白极简

具体 Card Illustration Style 后续单独建立：

**Card Art Direction**

不与应用 UI Design System 混在一起。

---

# 43. 最终技术栈

第一版最终建议锁定：

```text
Frontend
Next.js
React
TypeScript
Tailwind CSS
Custom CSS

Motion
CSS Transform
Pointer Events
requestAnimationFrame

Backend
Supabase PostgreSQL
Supabase Auth
Supabase Storage

Auth
Email OTP

Audio
MediaDevices
MediaRecorder
HTMLAudioElement

Deployment
Vercel

Language
zh-CN
en
```

核心原则：

**能用浏览器原生能力完成的，不引入重量级库。**

---

# 44. MVP Architecture

最终结构可以概括为：

```text
                    TODAYSMISSION

                         │
              ┌──────────┴──────────┐
              │                     │
             EN                    ZH
              │                     │
              └──────────┬──────────┘
                         │
                    HOME / PACKS
                         │
                    Arc Carousel
                         │
                         ▼
                    PACK DETAIL
                         │
                  Mission Carousel
                         │
                    Text Mission
                         │
                  Take this mission
                         │
                   ┌─────┴─────┐
                   │           │
            I am nervous    Do Mission
                   │           │
                 Voice         │
                   │           │
                   └─────┬─────┘
                         │
                 Completed Slider
                         │
                  Card Falls Down
                         │
                  Mission Card
                    Unlocked
                         │
                   Record Voice
                         │
                         ▼
                      PROFILE
                         │
                  Card Collection
```

这就是第一版 TODAYSMISSION。

---

# 45. MVP 的设计判断标准

后续每增加一个 UI、动画或者功能，都问三个问题：

**它有没有帮助用户去完成 Mission？**

**它有没有强化 Card / Mission / Voice 这三个核心元素？**

**它值不值得让移动端多承担这些性能成本？**

如果答案都是：

> No

就不应该进入 MVP。

TODAYSMISSION 第一版不需要“功能很多”。

需要的是：

**第一次打开看到 Card 就觉得有东西。**

**Take Mission 时没有阻力。**

**害怕的时候真的有人在耳边告诉你：我也做过。**

**完成滑动的时候真的有获得这张 Card 的感觉。**

这四件事情做好，MVP 就成立。