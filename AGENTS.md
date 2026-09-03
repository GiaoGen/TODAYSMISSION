TODAYSMISSION — Agent 工作约定

1. 使用原则

本文件记录项目长期约定和已确认的产品方向，不代表所有功能都已实现。实现状态、文件路径和可执行命令以当前仓库为准。

用户最新明确要求优先于本文件中的旧产品方案；保留本次任务未要求改变的行为。不要将旧方案当成禁止迭代的理由。

用户只要求 prompt、建议或评估时，只交付对应内容，不直接修改代码。要求实现时，完成必要修改和验证，不停留在提议阶段。

常规实现细节自行判断。仅在无法从代码和上下文确定、且会实质改变产品行为时提出一个简短问题。

2. 产品与业务语义

TODAYSMISSION 帮助用户通过现实中的小任务，尝试独处、社交、面对拒绝等原本不敢做的事。

Pack 是围绕一个具体问题精心设计的任务合集；Mission 是其中的单个任务。内容由开发者维护，不擅自改成 AI 即时生成或随机任务系统。

用户加入的是整个 Pack。joined 表示 Pack membership，不能用当前浏览或选中的 Mission 替代，也不要重新引入每个 Mission 都需要 Take 的流程。

用户可以浏览公开内容；加入 Pack 沿用现有登录流程。身份、membership、完成进度均以真实服务端数据为准。

用户可以切换 Mission，以适应当天的环境和条件；切换不等于加入、完成或修改任务记录。

Pack 进度 X/N：X 是当前用户已完成的 Mission 数，N 是当前 Pack 对用户可见的 Mission 总数，使用一致的数据范围。仅 joined 时展示，不能用卡片序号代替 X。

3. 两种录音必须区分

完成凭证：用户完成 Mission 时提交的录音，连接现有凭证上传和完成提交流程。前端滑动、录音结束或单独上传成功，都不能绕过服务端完成判定。

心得鼓励：完成 Mission 后另行分享的经验录音，供尚未完成、感到紧张的用户通过 I am nervous 收听。它不是普通社区动态，也不是完成凭证的公开展示。

不混用两条流程的 action、对象路径、可见性或发布状态，不因 UI 合并而自动公开完成凭证。

心得沿用现有资格、去重和审核机制：永久账号、完成对应 Mission 后才可分享；提交后默认未发布，由开发者审核发布。

收听沿用已有永久账号、已加入 Pack、对应 Mission 未完成及内容已发布等限制；保留私有存储和服务端签名 URL 机制。不要为了前端方便放宽访问规则。

4. 当前确认的交互方向

以下是已确认的目标行为。执行局部任务时只修改相关部分，不自动补做整份清单。

首页保留现有 Pack 轮盘与卡包视觉；Pack 封面独立设计，Mission 卡片复用通用结构与主题资源。

点击未加入的 Pack：封面移至中央停留，下方显示 take this；真实加入成功后，才播放已有 Mission 分发动画。

点击已加入的 Pack：沿用现有过渡并直接分发 Mission，不增加确认步骤。加入失败不提前展开，登录返回后重新依据真实 membership 展示。

Pack 进度是卡片附属 UI，随卡片进出场，不提前悬浮、闪现或重复出现。

同一视口内的 Mission 卡片等宽等高、水平对齐；不恢复中心放大、两侧缩小、下沉或变灰的景深效果。

Mission 常态操作区保持简洁：完成胶囊及下方「图标 + 换一个」。必要的录音状态和错误按需显示，保留现有心得入口的可达性，不擅自删除业务能力。

胶囊初始显示 swipe to complete；圆形抓握点采用卡片主题色，轨道采用相近但可区分的颜色；填色及 Congratulations! 随实际行程变化。

拖动时，完成版设计卡片随同一行程下落，最终以相同尺寸、比例和圆角覆盖文字卡片；往回拖或取消时同步回退。

滑动完成后，原胶囊变为红色 Record；随后在同一形状内完成真实录音波形、右侧停止、停止后右侧试听与左侧上传的状态切换。

滑动完成后的设计卡片覆盖只是待提交的视觉状态。真实完成成功才更新 completed 与 Pack 进度；已完成的 Mission 重新进入时默认展示设计卡片，避免文字卡片闪现及重复提交。

「换一个」复用现有顺序、滚动、吸附与循环规则，不重新分发整套卡片。切换时保持当前 Mission、主题、录音和操作对象一致。

5. 前端实现约束

基于现有组件、主题、设计注册和动画机制修改；默认不重做页面、不替换技术栈、不新增依赖或抽象框架。

区分服务端业务状态与本地展示阶段。避免把“已展开”“已滑到底”“已上传”“已完成”合成一个布尔值。

对操作对象使用稳定的 Pack/Mission ID；处理异步回调过期，防止切换后将录音或完成结果写到另一张卡片。

保留现有 Pack 分发、收拢、返回位置恢复及 Gallery 拖动、惯性、吸附、键盘交互。修改手势时避免滑块、卡片拖动和页面退出相互触发。

桌面、移动端、Chrome 和 Safari/WebKit 都是目标环境；涉及滚动或动效时检查仓库中各实现分支。

高频手势优先更新局部 transform、CSS 变量或现有 motion value，避免每帧重渲染整套 Gallery。删除视觉效果时，同步清理专用 RAF、监听器及无用计算。

录音与播放复用已有实现；正确释放 MediaStream、AudioContext、对象 URL 和监听器。权限拒绝、上传失败或重复点击时应能恢复或重试。

保留触摸支持、可访问名称、可见焦点与 reduced-motion；颜色和状态不能成为唯一的操作提示。

复用现有文案与语言机制；按用户给定文案实现，不顺手混改其他语言或页面内容。

6. 数据与修改范围

技术方向为 Next.js、TypeScript、Supabase；具体版本、目录、样式和动效库以仓库为准，不凭记忆假定。

已接入真实数据的页面不回退到 mock，不用前端假成功或 localStorage 冒充真实 membership、上传或完成记录。

默认复用现有查询、Server Actions 和数据映射；需要补数据时只补必要字段，避免逐卡请求和重复读取。

未要求内容维护时，不新增、覆盖或批量写入 Pack/Mission 内容，不自动执行 seed。

前端任务默认不改数据库结构、认证协议、RLS、Storage 策略或部署配置；确需跨层修复时，先说明具体原因和最小影响范围，再依据已有授权推进。

保持服务端对用户、资源归属、资格、文件类型及大小的校验；不将私有密钥或 service-role 凭据暴露到客户端或日志。

不改无关文件，不覆盖用户未提交的修改，不做顺手格式化或整仓重构。提交、push 和部署按任务要求及已有明确授权执行。

7. 高效工作与交付

先读相关目录约定、package.json 和目标组件；用 rg 定位直接依赖，按需扩展。不要每次通读整仓、历史计划书或重复扫描已确认的信息。

一次解决本次要求的完整链路；不擅自追加功能、后台、付费流程、设计资源或大型测试体系。

使用仓库已有的 lint、类型检查及直接相关测试命令。交互修改重点验证正常流程、失败恢复、防重复提交、切换后的对象一致性；仅为必要风险补测试。

纯样式调整优先视觉检查，不为低影响变更堆砌测试。只有为解决具体风险或满足仓库检查要求时，才扩大全量验证。

Chromium 运行、WebKit 自动化和真实 Safari 验证应区分报告；没有实际跑过的环境、上传或接口，不声称已验证。

验证遇到环境或权限阻碍时，说明阻碍和未验证范围，不删除校验、放宽权限或伪造成功来通过检查。

最后用简短中文说明：改了什么、验证结果、剩余问题。仅列关键文件，不输出冗长工作流水账。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
