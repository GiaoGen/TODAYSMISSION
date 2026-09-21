TODAYSMISSION Explore / Pack 页面后端接入说明
一、路由结构
/explore
当前是新的 Pack 浏览首页：
- 页面中央只显示一张 Pack Cover，不做堆叠。
- Pack Title 显示在 Cover 下方。
- 横向连续拖动切换 Pack：
  - 桌面端支持鼠标拖动、滚轮、键盘方向键。
  - 移动端支持触摸滑动。
  - 一次手势可以跨越多张，不限制一次一张。
- 拖动过程中，页面背景在相邻 Pack 的主题色之间连续过渡。
- 只有当前居中的 Cover 可以点击。
- 点击后通过共享元素过渡进入 /pack/[slug]。
- 从 Pack 页面返回时恢复之前浏览的 Pack 位置。
- 页面右上角有账户 Icon：
  - 未登录：进入 /login?next=/explore
  - 已登录：弹出托盘，目前只有 Log out
  - 登出后清理客户端 Session Snapshot 并刷新页面状态。
当前 /explore 数据完全来自静态文件，而不是数据库：
- doing-things-alone
- fear-of-rejection
- talking-to-strangers
主要文件：
- [explore/page.tsx](D:/todaysmission/todaysmission/app/explore/page.tsx)
- [ExplorePackCarousel.tsx](D:/todaysmission/todaysmission/features/packs/components/ExplorePackCarousel.tsx)
- [ExploreAccountControl.tsx](D:/todaysmission/todaysmission/features/packs/components/ExploreAccountControl.tsx)
- [explore-pack-content.ts](D:/todaysmission/todaysmission/features/packs/model/explore-pack-content.ts)
二、/pack/[slug] 当前存在两套实现
路由会先查新的静态 Explore Pack：
const previewPack = getExplorePackPreview(slug);
如果命中上述三个 slug，就直接渲染新的：
<ExplorePackPreview />
只有没有命中静态数据的 Pack，才会进入原来的真实数据库页面：
<MissionPackDetail />
因此需要特别注意：
即使数据库中存在 fear-of-rejection，现在也会被静态 ExplorePackPreview 提前截获，不会进入已经接好后端的 MissionPackDetail。

而且新的静态分支当前不会渲染 PackUserState，所以没有读取：
- 当前用户
- Pack Membership
- Active Mission
- 已完成 Mission
- Pack 完成进度
主要入口：
- [pack/[slug\]/page.tsx](D:/todaysmission/todaysmission/app/pack/[slug]/page.tsx)
- [ExplorePackPreview.tsx](D:/todaysmission/todaysmission/features/packs/components/ExplorePackPreview.tsx)
后端接入时应该把真实数据和 Server Actions 接进 ExplorePackPreview，同时保留它现有的视觉和动画，不能只修改旧的 MissionPackDetail。
三、进入 Pack 页后的完整交互
1. 入场动画
从 /explore 点击 Pack Cover 后：
1. Cover 通过 View Transition 连贯移动到 Pack 页面中央。
2. 使用 7 张代理卡片播放视觉分发动画。
3. 实际 Gallery 显示完整 Mission 数量，不是 7 张。
4. 动画完成后进入可操作状态。
7 张卡片只负责动画表现，不代表真实 Mission 数量。
Fear of Rejection
真实数量为：
- 13 个普通 Mission
- 13 张 Mission Artwork
- 13 张 Mission Card
- 不包括 Hidden Mission
2. Gallery
Pack 页面 Gallery：
- 水平连续拖动。
- 无限循环。
- 桌面端使用自定义惯性与吸附。
- 移动端/粗指针设备使用原生横向滚动。
- 所有卡片保持等宽、等高、水平对齐。
- 移动端中央卡片两侧会露出相邻卡片的一部分。
- 卡片锁定、翻转或提交期间禁止横向切换。
- 页面刷新后应恢复正确的中心位置，不能偏到屏幕顶部。
四、未 Take Pack 时
页面默认展示的是全部 Mission Artwork，不是 Mission Card。
当前只有 Fear of Rejection 具有完整的：
- Mission Artwork
- Mission Card 配置
- 卡片说明
- 正反面结构
- Take Pack 动画
因此现在只有这个 Pack 显示 take this pack。
另外两个 Pack 暂时只能浏览 Artwork。
五、Take This Pack
当前视觉行为：
1. take this pack 是胶囊按钮。
2. 点击后按钮向内收缩消失。
3. 所有 Mission Artwork 播放收回动画。
4. 视觉动画仍只使用 7 张代理卡片。
5. 中央内容从 Artwork 换成 Mission Card。
6. Mission Card 从中央向左右两边平均分发。
7. 分发完成后，在相同位置展开 take this mission。
当前问题：
- 这套行为完全是前端本地状态。
- 没有调用 takePackAction。
- 没有验证登录。
- 刷新后会恢复未加入状态。
后端接入后的正确顺序应该是：
1. 用户点击 take this pack。
2. 如果未登录，进入：
/login?next=/pack/[slug]
3. 登录返回后重新读取真实 Membership。
4. 调用已有：
takePackAction(packId)
5. 服务端确认 Membership 创建成功后，才播放 Artwork 收回和 Mission Card 分发动画。
6. 请求失败时不能提前分发，按钮恢复并显示错误。
7. 已加入用户重新进入 Pack 时应直接进入 Mission Card 状态，不再重复 Take Pack。
已有 Server Action：
- [features/packs/actions.ts](D:/todaysmission/todaysmission/features/packs/actions.ts)
已有 Membership 表语义：
type PackMembership = {
  packId: string;
  activeMissionId: string | null;
  joinedAt: string;
};
六、Mission Card
Fear of Rejection 的 13 张 Mission Card：
- 使用四张透明小羊 PNG，平均重复使用。
- 背景为纯色，没有渐变。
- 每张卡片颜色不同或色相接近但有区分。
- 正面只显示：
  - TODAYSMISSION
  - Fear of Rejection
  - Mission Title
  - 透明小羊角色
- 卡片带轻微厚度。
- 圆角与 Pack Cover 一致。
- 卡片背面使用相同主题背景和前景色。
Mission Card 正面的 Artwork 是透明角色素材；完成后的 Mission Artwork 是独立的完整设计图片，两者不能混用。
七、Take This Mission 与任务锁定
点击 take this mission 后：
1. 当前 Mission 被锁定。
2. Gallery 停止横向滑动。
3. 按钮向内收缩并消失。
4. 整张圆角卡片沿水平中轴翻转。
5. 翻转采用 Safari 更稳定的两阶段结构：
   - 正面转到 90°
   - 内容交换
   - 背面从另一侧转回
6. 背面显示：
   - 左上方大字重 Mission Title
   - 居中的 Mission Description
7. 卡片背面的背景色延续正面主题色。
当前只是本地锁定，没有调用后端。
后端接入应调用：
takeMissionAction(packId, missionId)
已有结果：
type TakeMissionActionResult =
  | {
      ok: true;
      status: "committed" | "already_committed";
      activeMissionId: string;
    }
  | {
      ok: false;
      error: string;
    };
规则：
- 一个 Pack 同一时间只能有一个 Active Mission。
- 一旦 Take Mission，用户必须先完成它，才能 Take 其他 Mission。
- 锁定状态必须从 pack_memberships.active_mission_id 恢复。
- 页面刷新、重新进入或换设备后仍然保持锁定。
- 前端动画只能在服务端确认成功后进入最终锁定状态。
- 异步返回必须核对原始 packId 和 missionId，不能把结果写到另一张卡片。
八、卡片背面的心得 Reveal
卡片翻到背面、进入稳定说明状态后，可以通过纵向手势查看其他用户的心得。
从上往下滑
- 整张 Mission Card 向下移动。
- 从卡片顶部露出录音波形。
- 背景固定红色：
#d84f49
- 完整波形本身是播放/暂停按钮。
- 音频使用后端返回的签名播放 URL。
从下往上滑
- 整张 Mission Card 向上移动。
- 从卡片底部露出文字心得。
- 背景固定黄色：
#ebc94b
手势规则
- 8px 后判断横向或纵向意图。
- 横向手势交还给 Gallery。
- 纵向手势控制心得 Reveal。
- 达到 30% 阈值后即锁定为展开：
  - 一旦越过阈值，松手不再回弹。
  - 手指末端轻微反向移动也保持展开。
- 快速滑动超过约 460px/s 也可以展开。
- 未达到阈值才回弹。
- 收回时：
  - 心得层保持显示。
  - Mission Card 先完整覆盖心得层。
  - 覆盖完成后才隐藏并清理心得内容。
- 点击空白区域时，优先收回心得层，不能直接退出 Pack。
- 键盘：
  - ArrowDown 打开录音
  - ArrowUp 打开文本
  - Escape 收回
主要文件：
- [SplitMissionExperienceReveal.tsx](D:/todaysmission/todaysmission/features/missions/components/SplitMissionExperienceReveal.tsx)
- [SplitMissionExperienceReveal.module.css](D:/todaysmission/todaysmission/features/missions/components/SplitMissionExperienceReveal.module.css)
Experience 数据契约
type MissionExperience =
  | {
      id: string;
      kind: "text";
      text: string;
    }
  | {
      id: string;
      kind: "audio";
      signedPlaybackUrl: string;
    };
当前调用：
getMissionExperiencesAction(missionId)
当前 Reveal 会：
- 按 audio / text 分开选择。
- 避免连续重复同一条 Experience。
- 对结果做约 8 分钟客户端缓存。
- 不暴露贡献者身份、用户 ID、Storage Path 或完成凭证字段。
- 空数据、加载中和加载失败都有单独状态。
当前阻塞点
静态 Mission ID 是：
one-small-ask
put-your-preference-on-the-table
...
但是已有 Server Action 强制要求 UUID：
UUID_PATTERN.test(missionId)
因此现在新的心得 Reveal 虽然已经连到 Action，但会返回：
That mission is unavailable.
后端接入必须让前端 Mission 同时拥有：
{
  id: "数据库 UUID",
  slug: "one-small-ask"
}
所有 Membership、Active Mission、Completion、Experience 和 Upload 操作必须使用 UUID，不能使用 slug。
九、完成滑块与录音/文本选择
Mission Card 背面下方有完成滑块。
滑动过程中：
1. 滑块跟手移动。
2. 页面背景根据滑动进度淡入当前 Mission Artwork 的模糊版本。
3. Blur 值固定，不做实时 blur 计算。
4. 当前实现大约使用固定 blur(22px)，只改变 opacity。
5. 卡片顶部伸出红色 Record 卡片。
6. 卡片底部伸出黄色 Type 卡片。
7. 两张卡片在中心直角交汇，没有圆角。
8. 滑动完成后滑块仍然保留。
点击 Record 或 Type 后：
- 被选择的一侧扩展到卡片的大部分区域。
- 不完全覆盖整张卡片。
- 另一侧保留一小条可点击区域。
- 点击保留区域可以切换到另一种提交方式。
- Record 使用经典录音 Icon。
- Type 使用书写 Icon。
- 下方滑块收起并转换为同尺寸的 upload 胶囊按钮。
当前新的 ExplorePackPreview 只实现了这部分视觉状态：
- 没有真正录音。
- 没有真实文本输入框。
- 没有上传文件。
- upload 只是本地模拟完成。
真实实现可以复用旧页面已经存在的：
- MissionProofRecorder
- MissionCompletionProofChooser
- MissionActionLayer
- 音频上传流程
- 文本提交流程
十、真实完成流程
Audio
现有后端流程：
1. 调用：
createMissionExperienceAudioUploadTarget(missionId)
2. 服务端验证：
   - UUID
   - 登录用户
   - Pack 已发布
   - 用户已加入 Pack
   - 当前 active_mission_id 就是该 Mission
   - Mission 未完成
   - 没有重复 Audio Experience
3. 返回私有 Storage 的 pathBase。
4. 客户端录音并上传到私有 Bucket。
5. 上传成功后调用：
completeMissionWithAudioAction(
  missionId,
  audioPath,
  completedLocalDate
)
6. 服务端通过 RPC 原子完成：
   - 创建 Audio Experience
   - 创建 Mission Completion
   - 清除或释放 Active Mission 锁定
   - 返回真实完成时间和本地日期
Text
调用：
completeMissionWithTextAction(
  missionId,
  text,
  completedLocalDate
)
服务端负责：
- 清理和验证文本
- 验证身份、Membership、Active Mission
- 防止重复完成
- 原子创建 Text Experience 和 Completion
- 释放 Mission 锁定
UI 只有在服务端成功后才能进入完成态
成功后前端才执行：
1. Record/Type 两张卡片撤走。
2. Upload 胶囊退出。
3. 彩炮动画出现。
4. 当前 Mission Card 变成对应 Mission Artwork。
5. Artwork 保持与卡片相同圆角。
6. Gallery 恢复正常横向滑动。
7. 当前 Mission 的模糊背景保留。
8. 滑到其他 Mission 时，模糊背景淡出/淡入对应的已完成 Artwork。
9. 更新 Pack 进度。
10. 更新 Session Snapshot。
当前 completedMissionIds 只是组件内的 Set，刷新会丢失，必须替换成服务端 Completion 数据。
十一、Pack 进度
后端最终需要返回：
- 当前用户是否已加入 Pack
- 当前 Active Mission
- 已完成 Mission ID 列表
- 当前 Pack 已完成数量
- 当前用户可见的 Mission 总数
语义：
X / N
- X：真实已完成 Mission 数。
- N：当前用户可见的 Mission 总数。
- 只有 joined 状态展示。
- 不能使用当前卡片序号代替完成数量。
- Hidden Mission 是否计入总数必须与用户可见范围一致。
已有 Session Snapshot 字段：
{
  joinedPackIds: string[];
  completedMissionIds: string[];
  completedDates: string[];
  completionCountsByPack: Record<packId, number>;
  activeMissionByPack: Record<packId, missionId | null>;
}
已有客户端更新函数：
addJoinedPack(...)
setActiveMission(...)
addMissionCompletion(...)
这些只能在服务端操作成功后更新，不能作为真实状态来源。
十二、完成后的 Mission
完成后：
- Mission 默认显示 Artwork，不再显示小羊 Mission Card。
- 不允许重复提交。
- 用户仍可在 Gallery 中正常切换。
- 已完成状态必须从 mission_completions 恢复。
- 当前用户自己的已完成 Experience 可以通过：
getMyMissionExperienceAction(missionId)
读取。
社区心得与完成凭证必须继续区分：
- 完成凭证：用于完成判定。
- 心得 Experience：供其他符合条件的用户查看。
- 不可因为 UI 合并而自动公开私人完成凭证。
- Audio 使用私有 Storage 和签名 URL。
十三、退出 Pack 返回 Explore
点击空白区域或按 Escape：
1. 如果心得 Reveal 已打开：
   - 第一次操作只收回心得层。
   - 不退出 Pack。
2. 否则：
   - 当前 Gallery 卡片先通过 7 张代理卡片收回中央。
   - Pack Cover 在顶部恢复并放大。
   - 动画完成后路由到 /explore。
3. 保存当前 Pack slug。
4. /explore 恢复该 Pack 为居中项。
5. 使用共享元素过渡，保持 Cover 连贯。
点击卡片、按钮、Slider、Record、Type、Upload 等控件不能误触退出。
十四、后端需要提供的新页面 DTO
建议新的 /explore 和 /pack/[slug] 最终使用同一套真实数据模型。
Explore Pack
type ExplorePack = {
  id: string;                 // UUID
  slug: string;
  title: string;
  coverUrl: string;
  background: string;
  foreground: string;
  joined?: boolean;
};
Pack Detail
type ExplorePackDetail = ExplorePack & {
  joined: boolean;
  activeMissionId: string | null;
  completedMissionIds: readonly string[];
  completedMissionCount: number;
  visibleMissionCount: number;
  missions: readonly ExploreMission[];
};
Mission
type ExploreMission = {
  id: string;                 // 数据库 UUID，所有 Action 使用它
  slug: string;
  order: number;
  title: string;
  description: string;

  artworkUrl: string;         // 完成态、未 Take Pack 浏览态
  characterUrl: string;       // Mission Card 透明小羊

  cardBackground: string;
  cardForeground: string;
  titleLines: readonly string[];
  titleSize: string;
  titleWidth: string;

  hidden: boolean;
  completed: boolean;
};
静态图片仍然可以留在前端 Registry，但数据库必须至少保存稳定的资源 Key；不要让业务数据依赖本地文件名。
十五、推荐接入顺序
1. 为三个 Explore Pack 建立真实 Pack UUID。
2. 为 Fear of Rejection 的 13 个 Mission 建立 UUID，并保留现有 slug。
3. 将静态视觉配置与真实 UUID 合并，先解决“slug ID 无法调用 Action”的问题。
4. /explore 改为读取已发布 Pack，同时保留现有 Cover 和主题 Registry。
5. 新的 /pack/[slug] 同时取得：
   - Pack 数据
   - 当前用户
   - Membership
   - Active Mission
   - Completion
6. 未加入用户保留 Artwork 浏览状态。
7. 接入 takePackAction，成功后才播放收放动画。
8. 已加入用户直接恢复 Mission Card 状态。
9. 接入 takeMissionAction，成功后锁定 Mission。
10. 接入真实 Audio/Text 输入与上传。
11. Completion 成功后才播放彩炮并切换 Artwork。
12. 接入社区 Experience Reveal。
13. 最后处理错误恢复、防重复点击、异步过期和刷新恢复。
最关键的两个事实是：
- 三个新 Explore Pack 当前仍是静态分支，会绕过旧的真实后端页面。
- 新页面的 Mission ID 当前是 slug，但所有现有 Server Action 都要求 UUID。