# TODAYSMISSION 项目进度记录

> 快照日期：2026-08-31
> 记录依据：当前工作区文件、开发计划、Git 状态与本次质量检查

## 总体状态

- 当前定位：MVP 前端原型，处于 Phase 04（Pack Detail / Mission Browsing）实现阶段。
- 工作区状态：已跟踪 `origin/main`；当前有多项未提交修改及新增测试文件。
- 当前可运行性：`npm test`、`npm run lint` 与 `npm run build` 均通过。
- 后端状态：尚未接入 Supabase、认证或持久化；页面数据来自本地 fixture repository。

## 阶段进度

| 阶段 | 状态 | 当前证据 |
| --- | --- | --- |
| Phase 00：项目基线与执行规则 | 基本完成，仍需补记录 | Next.js 16.3.3、TypeScript、ESLint、路径别名、lint/build 已可用；locale、完整基线记录尚未补齐 |
| Phase 01：全局视觉基础与 App Shell | 部分完成 | 全局 CSS、页面 metadata、基础 layout 已存在；中英文路由、loading/error/not-found 与完整 Shell 尚未完成 |
| Phase 02：Card System | 基本完成 | Pack Card、3:4 卡片样式、fixture 数据和缺图/文案基础边界已存在 |
| Phase 03：Home / Pack Arc Carousel | 基本完成，待设备验收 | 已支持上下双 Carousel、joined Pack 数据、独立几何模型、Pointer/RAF 拖动、惯性与 Snap、键盘操作、Reduced Motion、数量控制、双轮状态恢复和 Pack 导航 |
| Phase 04：Pack Detail / Mission Browsing | 基本完成，待验收 | Pack Detail Server Page、静态参数生成、Mission 横向浏览/展开/收拢、返回 Home 的双轮状态恢复和过渡动画已实现；Take Mission、Mission 状态和 CTA 流程仍待完成 |
| Phase 05：Take Mission 与 Login Overlay | 未开始 | 登录、OTP、返回上下文和 Taken 状态尚未实现 |
| Phase 06：Completed Slider 与 Card Reveal | 部分完成 | 已有完成 Mission 的日期/画廊浏览和返回日历链路；完成滑块、Reveal 与完成提交尚未实现 |
| Phase 07–08：Voice Listening / Recording | 未开始 | 语音播放、录音、试听、重录和提交尚未实现 |
| Phase 09：Profile / Card Collection | 部分完成 | 已有 mock 用户菜单、主题/退出的原型状态；Profile 和卡片收藏尚未实现 |
| Phase 10–11：Supabase / 发布前验收 | 未开始 | 尚未接入后端和真实设备验收 |

## 本次已确认完成

- 首页通过 `getPacks()` 从统一 repository 读取 fixture，并渲染弧形 Pack Carousel。
- Pack 详情通过 `/pack/[slug]` 提供，并使用 `generateStaticParams()` 生成 fixture 对应的静态路径。
- Carousel 支持拖拽、惯性、Snap、鼠标滚轮、左右方向键、数量增减、Reduced Motion，以及进入详情后的返回位置恢复。
- 页面包含基础响应式样式和 `ViewTransition` 页面/卡片过渡实现。
- 当前 fixture 可生成首页、404 和 24 个 Pack 详情路径。
- 新增 53 项 Node 测试，覆盖弧形几何、双轮导航状态、shared-element 边界和主 landmark 结构。
- 新增 Calendar Carousel、Pack Deck、Mission Gallery、Safari 原生滚动和完成日期路由；完成日期可从日历进入对应 Mission Gallery。
- 测试范围已扩展至 286 项，覆盖多 viewport、日历输入、完成日期映射、双轮设置、Deck、原生滚动和动画清理。

## 未包含

- 产品设计确认单与展示验收记录。
- 完整的中英文 locale URL 方案与语言切换。
- Mission 的 Guest / Taken / Completed 持久状态。
- Take Mission、登录/OTP overlay、完成提交、语音播放/录音、个人资料和卡片收藏。
- Supabase、认证、数据写入及生产错误/加载状态。
- iPhone Safari、Android Chrome、Desktop Safari/Chrome 的真实设备交互验收。

## 验证结果

执行于 2026-08-31：

- `npm test`：通过，286/286 项测试通过；Node 仅提示 `.ts` 测试导入的模块类型 warning。
- `npm run lint`：通过。
- `npm run build`：通过；TypeScript 检查通过，静态页面生成通过。
- 生成路由：`/`、`/_not-found`、`/pack/[slug]`（24 个 Pack 路径）、`/completed/[date]`（21 个完成日期路径）。
- 已执行：模型/组件结构/交互逻辑自动化测试；尚未执行真实浏览器手工验收和移动端真机验收。

## 后端接入预留

- UI 通过 `data/contracts/pack-summary.ts` 的领域契约消费数据，不直接依赖数据库表结构。
- `data/repositories/get-packs.ts` 是当前统一读取入口，后续可替换为服务端数据访问层。
- 当前所有数据来自 `data/fixtures/pack-fixtures.ts`，没有假装具备生产认证或持久化能力。

## 剩余风险与下一步

1. 完成 Phase 04 的设计确认：Take Mission 入口、Mission 状态视觉、CTA 和 URL 恢复规则。
2. 补上 Phase 05 的 Fixture Auth / Login Overlay，再进入完成滑块与 Reveal。
3. 对 Calendar、Pack Deck、Mission Gallery 执行真实浏览器和移动端验收，并记录结果。
4. 在进入生产接入前补充 locale、错误边界、Shell 和真实数据边界。
5. 在提交前确认本记录与代码状态一致，并整理当前未提交修改。

## 变更记录

| 日期 | 记录 |
| --- | --- |
| 2026-08-29 | 创建本项目进度快照；完成工作区、开发计划、源代码和 lint/build 检查。 |
| 2026-08-30 | 更新双 Carousel、Mission 展开收拢、导航恢复与测试进度；完成 53 项测试、lint、build 检查。 |
| 2026-08-31 | 更新 Calendar、Pack Deck、Mission Gallery、Safari 原生滚动和完成日期路由进度；完成 286 项测试、lint、build 检查。 |
