# TODAYSMISSION — Talking to Strangers

**Status:** Final Content Specification  
**Version:** 1.0  
**Pack Type:** Behavioural Challenge Pack  
**Public Missions:** 15  
**Hidden Final Mission:** 1

---

# 1. Pack Overview

## Pack Name

**Talking to Strangers**

## Pack Promise

> **Stop waiting for the other person to speak first.**

## Core Problem

这个 Pack 面向的不是“不会聊天”的用户，而是：

> 用户在现实中遇到一个可以自然互动的陌生人时，会因为害怕开场突兀、担心对方冷淡、找不到完美的第一句话，或不想暴露自己的社交意图，而在真正开口之前放弃互动。

典型想法包括：

- “突然开口会不会很奇怪？”
- “我不知道第一句话应该说什么。”
- “对方可能根本不想理我。”
- “还是等对方先说吧。”
- “再想一句自然一点的。”
- “现在已经错过时机了，算了。”

## Core Avoidance Pattern

> **出现自然互动机会 → 等待更好的开场或对方先说 → 机会消失**

短期内，沉默和离开会让紧张下降。

长期则会强化：

> “我无法主动和陌生人说话。”

TODAYSMISSION 要改变的不是用户的性格，而是这个开口前的回避循环。

## Training Goal

通过覆盖不同脚本强度、社交意图、回应不确定性、公开程度、主动距离和个人重要性的现实互动，让用户逐渐建立：

> **在安全且合适的情境中，我可以主动完成第一次接触，而不必等待对方先开始。**

这个 Pack 不训练：

- 成为外向的人
- 维持长时间对话
- 消除所有紧张
- 让陌生人喜欢自己
- 搭讪或获得联系方式
- 提出可能被拒绝的私人请求
- 把每个陌生人变成朋友

它训练的是：

> **主动开始互动。**

## Pack Boundary

一项行为只有在满足以下条件时，才属于 Talking to Strangers：

1. 对象与用户没有既存个人关系。
2. 用户主动发出第一次、清晰可感知的社交信号。
3. 场景允许这种接触，对方可以自由不回应或离开。
4. 成功主要由用户是否发起决定。
5. 对方是否回应、回应多久或是否友善，不影响完成。
6. 主要心理障碍是“主动接触陌生人”，而不是独自出现、提出请求或维持对话。

这个 Pack 与相邻 Pack 的边界是：

- **Fear of Rejection** 训练“提出可能被拒绝的真实请求”；本 Pack 不以获得 yes / no 为目标。
- **Doing Things Alone** 训练“行动不依赖陪伴”；本 Pack 必须实际向陌生人发起接触，独自出现本身不算完成。

---

# 2. Mission System

## 2.1 Pack Membership + Free Pick

用户加入的是整个 Pack，而不是逐张 Take Mission。

15 个公开 Mission **没有强制完成顺序**。

用户可以：

- 自由浏览
- 根据当天环境选择 Mission
- 在未提交完成前切换 Mission
- 先做更难或更简单的内容
- 暂时回避某几张

切换 Mission 不等于：

- 加入 Pack
- 完成 Mission
- 修改服务端进度

系统不要求：

> Mission 1 → Mission 2 → Mission 3

## 2.2 Difficulty Still Exists

“自由 Pick”不等于所有 Mission 难度相同。

整个 Mission Pool 刻意覆盖：

- Low-friction initiation
- Functional scripts
- Visible social intent
- Uncertain response
- Public visibility
- Active approach
- Familiar-stranger exposure
- Personal importance

不同用户的恐惧结构不同，因此用户端不建议显示：

- Easy
- Medium
- Hard
- Level 1–5

后台可以维护强度数据，用于内容审核、平衡与未来推荐。

## 2.3 Completion Standard

所有公开 Mission 共用一个基本完成原则：

> 用户在安全、合适的现实情境中，主动向陌生人发出任务要求的第一次接触。

完成不要求：

- 对方回答
- 对方微笑
- 对话持续特定时长
- 用户获得信息、认可或关系
- 用户完成时不紧张

如果 Mission 涉及问题，对方不回答也不影响用户侧完成。

前端录音、录音结束或文件上传成功本身不能直接把 Mission 标记为完成；最终状态沿用真实服务端完成流程。

完成凭证应在互动结束后由用户单独录制。不得要求或鼓励录下陌生人的声音、影像或个人信息。

## 2.4 Hidden Final Mission

15 个公开 Mission 全部完成后：

> **15 / 15 completed**

解锁第 16 张隐藏卡。

隐藏任务不是另一种通用开场练习，而是整个 Pack 的现实迁移：

# **START IT YOURSELF**

它要求用户开始一场自己在真实生活中一直想发生、却反复等待对方先开口的互动。

---

# 3. Content Design Rules

所有公开 Mission 必须满足：

1. 与“主动向陌生人开始互动”直接相关。
2. 用户必须是第一次接触的发起者。
3. 成功主要由用户自己的行为决定。
4. 对方不回应时，用户仍然可以完成。
5. 不要求用户维持对话或表现得有趣。
6. 不把获得认可、联系方式或关系作为结果。
7. 不把私人请求、邀请或争取 yes 作为核心行为。
8. 不把独自进入或停留在公共场所作为完成条件。
9. 一个 Mission 只训练一个主要心理变量。
10. 不因为地点、对象或开场措辞不同而重复同一个训练目标。
11. Mission 定义行为；地点和措辞只作为示例。
12. 整个 Pack 以免费、低设施依赖的互动为主。
13. 少量 Mission 可以依赖共同活动或熟人陪同，但 Pack 整体不能依赖这些条件。
14. 不要求接触明显忙碌、戴耳机、正在通话、快速移动或试图离开的人。
15. 不允许阻挡、跟随、重复纠缠或迫使对方继续。
16. 不要求评论身体、年龄、种族、健康、宗教、性别或其他敏感属性。
17. 不为了挑战性制造冒犯、误解或表演性尴尬。
18. 不要求拍摄、录制或识别陌生人。
19. 用户可以使用其日常可访问的沟通方式完成清晰接触，不以特定口语能力作为唯一标准。
20. 公开 Mission 负责训练；Final Mission 负责迁移到用户真实生活。

---

# 4. Public Mission Set

## Mission 01 — Hello First

### Mission

**In a moment when acknowledging each other is natural, greet a stranger before they greet you.**

A simple “hello,” “hi,” “good morning,” or another natural greeting is enough.

You do not need to turn it into a conversation.

### Learning Objective

训练最小单位的主动性：

> 我可以成为先发出社交信号的人，即使互动只有一句话。

### Conditions

- Cost: Free
- Time: Under 1 min
- Facility dependency: Very low
- Interaction required: Minimal
- Response uncertainty: Low–Medium
- Public visibility: Low

### Safety Note

选择彼此自然注意到对方的时刻。不要为了完成任务追逐、拦住或突然逼近别人。

---

## Mission 02 — Ask Something Real

### Mission

**Ask a stranger one simple question about information you genuinely need and cannot already see.**

Ask someone who is naturally placed to know or reasonably able to answer.

Do not invent a question just to complete the Mission.

### Examples

Examples only:

- How something works in the place you are already using
- Which way an unmarked destination is
- Whether a shared facility or activity is currently available
- A simple fact about the immediate surroundings

### Learning Objective

利用真实目的降低第一次开口的启动成本：

> 当我确实需要知道一件事时，我可以直接向陌生人开口。

### Conditions

- Cost: Free
- Time: 1–2 min
- Facility dependency: Very low
- Interaction required: Yes
- Response uncertainty: Low
- Social intent visibility: Low

### Completion Standard

清楚提出真实问题即完成。对方不知道答案或选择不回答，不影响完成。

---

## Mission 03 — Ask for Their Take

### Mission

**Ask a stranger for their genuine opinion, experience, or recommendation about something connected to where you both are or what you are both doing.**

Choose a light, non-sensitive subject. You only need to ask.

### Examples

Examples only:

- Their experience with an activity both of you are attending
- Which option they would choose in the place you are both browsing
- What they think of something both of you have just seen
- A local recommendation that does not require personal details

### Learning Objective

从确定事实推进到不可预测的个人判断：

> 我可以主动邀请陌生人表达看法，而不需要预先知道他们会怎么回答。

### Conditions

- Cost: Free
- Time: 1–3 min
- Facility dependency: Low
- Interaction required: Yes
- Response uncertainty: Medium
- Social intent visibility: Low–Medium

### Pack Boundary

这张卡不是要求对方答应用户的请求。

核心行为是：

> **询问看法，而不是争取 yes。**

---

## Mission 04 — Name the Moment

### Mission

**Direct one brief, neutral comment to a stranger about something you are both experiencing.**

Make it clear you are speaking to them. Leave room for a reply, but do not require one.

### Examples

Examples only:

- Something unexpected happening around you
- The atmosphere of a shared place or activity
- A harmless detail both of you have just noticed
- A shared wait, delay, change, or small inconvenience

### Learning Objective

训练不依赖问题或求助的开场：

> 我可以把共同经历说出来，让一次互动有机会开始。

### Conditions

- Cost: Free
- Time: Under 2 min
- Facility dependency: Very low
- Interaction required: Minimal
- Response uncertainty: Medium
- Social intent visibility: Medium

### Completion Standard

评论必须清楚地说给某个陌生人听，而不是自言自语。对方是否回应不影响完成。

---

## Mission 05 — Share Something Small

### Mission

**Tell a stranger one small, context-appropriate thing about yourself that gives them room to respond.**

Keep it brief and connected to the place, activity, or moment you already share.

### Examples

Examples only:

- That it is your first time trying the shared activity
- What brought you to the place or event
- A light preference connected to what is happening
- A small reaction to something you have both just experienced

### Learning Objective

训练轻量自我暴露：

> 我不必一直躲在提问后面；我也可以先分享一点自己，让互动有入口。

### Conditions

- Cost: Free
- Time: 1–3 min
- Facility dependency: Low
- Interaction required: Minimal
- Response uncertainty: Medium
- Personal exposure: Low–Medium

### Safety Note

只分享适合当前情境的轻量内容。不要泄露住址、行程、联系方式或其他敏感个人信息。

---

## Mission 06 — Follow Your Curiosity

### Mission

**Ask a stranger one respectful question about a visible, non-sensitive activity, item, or interest they have chosen to show or use in public.**

Ask because you are genuinely curious, not because you need an excuse to inspect their private life.

### Examples

Examples only:

- A book, game, tool, hobby item, or piece of equipment
- Something they made or are openly working on
- An activity they are already participating in
- A clearly displayed interest connected to the shared setting

### Learning Objective

训练用户把真实好奇转化为行动：

> 我可以承认自己对一个陌生人正在做的事情感兴趣，并主动开口。

### Conditions

- Cost: Free
- Time: 1–3 min
- Facility dependency: Low
- Interaction required: Yes
- Response uncertainty: Medium
- Personal relevance: Medium

### Safety Note

不询问身体、身份、健康、宗教、政治、私人关系或其他敏感内容。明显正在专注、工作或不希望被打扰的人不适合作为对象。

---

## Mission 07 — Say What You Noticed

### Mission

**Tell a stranger you genuinely appreciate one specific, non-physical choice or considerate action you noticed.**

Say it once without asking for anything in return.

### Examples

Examples only:

- Something they made, selected, or arranged
- A thoughtful action that helped someone or improved the shared space
- A creative choice connected to an activity or interest
- A considerate thing they just did

### Learning Objective

训练正向社交暴露：

> 我可以让一个陌生人知道我注意到了某件好事，而不需要获得回报。

### Conditions

- Cost: Free
- Time: Under 2 min
- Facility dependency: Very low
- Interaction required: Minimal
- Response uncertainty: Medium
- Social exposure: Medium

### Safety Note

不评论身体、吸引力、年龄或敏感身份。不附带私人问题、邀请或联系方式请求。对方没有继续互动时自然结束。

---

## Mission 08 — Introduce Yourself First

### Mission

**In a setting where participants are welcome to meet each other, introduce yourself to one stranger before anyone introduces you.**

You do not need to make a friend or keep the conversation going.

### Examples

Examples only:

- A class, workshop, club, or community activity
- An open event, meetup, volunteer activity, or shared-interest gathering
- A school, workplace, or local setting where new participants naturally meet
- Another organized setting where introductions are appropriate

### Learning Objective

训练用户不等待外部带领：

> 即使没有主持人、朋友或对方替我开始，我也可以先介绍自己。

### Conditions

- Cost: Free–Variable
- Time: 1–5 min
- Facility dependency: Medium
- Interaction required: Yes
- External structure: Medium
- Social exposure: Medium

### Pack Boundary

成功条件只是主动完成第一次自我介绍，不要求认识特定人数、交换联系方式或维持社交关系。

---

## Mission 09 — No Practical Excuse

### Mission

**In an open setting where light interaction is welcome, start a brief interaction with a stranger when you do not need information, help, or a service — and nothing specific has just happened to create the opening for you.**

Choose someone who is not working and is not required to respond. Say something that gives them an easy chance to reply, then let them decide whether to continue.

### Learning Objective

直接训练 Pack 的核心转折：

> 我可以因为想产生一次人际接触而开口，不必假装自己有事务需要。

### Conditions

- Cost: Free
- Time: 1–5 min
- Facility dependency: Low
- Interaction required: Yes
- Response uncertainty: High
- Social intent visibility: High

### Safety Note

只选择允许轻量互动的开放情境。不要接触明显忙碌、戴耳机、正在通话、快速移动、封闭身体姿态或试图离开的人。

### Distinction

Mission 04 使用双方刚刚共同经历的具体时刻作为开场。

本 Mission 则移除这种即时提示，训练：

> **没有事情替我创造第一句话时，我仍然可以主动开始。**

---

## Mission 10 — Take the Opening

### Mission

**The next time you notice a safe, natural chance to speak to a stranger and feel yourself delaying, use a simple opening before the shared moment ends.**

The first sentence does not need to be clever or perfect.

### Learning Objective

打断典型的延迟循环：

> 想开口 → 继续排练 → 等待更好的时机 → 机会消失

训练目标是：

> **在语言还不完美时行动。**

### Conditions

- Cost: Free
- Time: Variable
- Facility dependency: Very low
- Interaction required: Yes
- Timing pressure: High
- Response uncertainty: Variable

### Completion Standard

用户需要真实注意到自己正在拖延，并在双方仍处于同一自然情境时完成发起。不设置人为倒计时。

---

## Mission 11 — Don't Hand It Off

### Mission

**While you are with someone you know, be the one to start one natural, appropriate interaction with a stranger instead of waiting for your companion to do it.**

Choose a moment that would reasonably happen during the time you are already spending together.

### Learning Objective

训练用户放下熟人提供的社交代劳：

> 即使身边有人更擅长开口，我也可以亲自开始。

### Conditions

- Cost: Free
- Time: Variable
- Facility dependency: Very low
- Companion required: Yes
- Interaction required: Yes
- Social exposure: Medium–High

### Distinction

这张卡不训练“一个人行动”。

它训练的是：

> **当熟人在场时，不把第一次开口交给对方。**

---

## Mission 12 — Open in the Open

### Mission

**Start one appropriate, one-to-one interaction with a stranger while other people are nearby.**

Use your normal speaking voice. Do not whisper to hide the attempt, and do not perform for the people around you.

### Learning Objective

训练公开可见度：

> 别人可能看见或听见我主动开口，而我仍然可以开始。

### Conditions

- Cost: Free
- Time: 1–5 min
- Facility dependency: Low
- Interaction required: Yes
- Public visibility: High
- Social exposure: High

### Safety Note

这仍然是一对一互动。不要大声引起旁人注意，也不要把陌生人变成公开表演的一部分。

---

## Mission 13 — Walk Over and Begin

### Mission

**In an open setting where brief interaction is appropriate, approach a stranger who is not already beside you and start one respectful interaction.**

Move into a normal speaking distance from a direction where they can naturally see you.

### Learning Objective

从被动邻近推进到主动靠近：

> 我不只能等待排队、邻座或偶然距离替我创造互动；我也可以跨过一小段空间开始。

### Conditions

- Cost: Free
- Time: 1–5 min
- Facility dependency: Low
- Interaction required: Yes
- Approach required: Yes
- Response uncertainty: High

### Safety Note

- 仅限开放、可自由离开的公共或社交场景。
- 不接近戴耳机、正在通话、快速移动或明显回避的人。
- 不从背后突然靠近。
- 不阻挡路线。
- 不跟随任何人。
- 对方不回应或准备离开时立即结束。

---

## Mission 14 — Break the Familiar Silence

### Mission

**Start a brief interaction with a familiar stranger — someone you recognize from a repeated shared setting but have never spoken to.**

Use the shared place, routine, or activity as the context. Do not ask for personal information.

### Examples

Examples only:

- Someone you regularly see in a shared public, school, work, residential, or activity setting
- Another participant whose face has become familiar over time
- A person who shares a recurring routine or place with you but has no existing relationship with you

### Learning Objective

训练未来还可能见面的不确定性：

> 即使这次开口会改变以后见面时的感觉，我也可以结束长期的彼此沉默。

### Conditions

- Cost: Free
- Time: 1–5 min
- Facility dependency: Very low
- Interaction required: Yes
- Future encounter likelihood: High
- Personal importance: Medium–High

### Pack Boundary

对方必须仍然是没有既存个人关系的陌生人。朋友、同事、同学或已经交谈过的人不属于这张卡。

---

## Mission 15 — Ask About What Matters

### Mission

**Start an interaction with a stranger around a subject you genuinely care about, and ask one question you actually want answered.**

Choose someone whose connection to the subject is visible from the shared setting, activity, or interest — not from private assumptions about them.

### Learning Objective

从低风险练习迁移到真实个人意义：

> 当一次互动对我来说真的重要时，我仍然可以承担开始的风险。

### Conditions

- Cost: Free–Variable
- Time: 1–5 min
- Facility dependency: Variable
- Interaction required: Yes
- Personal importance: High
- Response uncertainty: High

### Pack Boundary

不索取机会、资源、特殊待遇、邀请、合作或联系方式。

如果核心行为变成：

> “提出一个我希望对方答应的请求”

则更属于 Fear of Rejection。

---

# 5. Hidden Final Mission

# 🔒 START IT YOURSELF

## Unlock Condition

Only available after:

> **15 / 15 Public Missions Completed**

## Final Mission

> **What interaction with a stranger have you genuinely wanted to begin — but kept hoping they would start?**
>
> Maybe it is one particular person.
>
> Maybe it is a kind of moment you repeatedly let pass.
>
> Choose a safe and appropriate opportunity.
>
> **Start it yourself.**

## Examples

Examples are inspiration only.

The user may choose:

- Speak to someone whose publicly visible work or interest they have genuinely wondered about.
- Introduce themselves in a recurring place where they usually remain silent.
- Begin an interaction at a shared-interest setting they personally care about.
- Start a real conversation opportunity they have repeatedly noticed and avoided.
- Choose a completely different appropriate interaction that matters in their own life.

The Final Mission must not require:

- a positive response
- a friendship
- contact information
- a date
- a professional opportunity
- a favor or special treatment

## Final Learning Objective

前 15 个 Mission 都由 TODAYSMISSION 提供训练结构。

Final Mission 要求用户完成：

> **从产品规定的开场 → 迁移到自己真实生活中一直回避的互动。**

最终改变的不应该只是：

> “我完成了一组陌生人挑战。”

而应该是：

> **“那次我一直希望对方先开始的互动，最后由我亲自开始了。”**

---

# 6. Pack Progress Logic

Recommended product logic:

```text
Browse public Pack content
    ↓
Join Pack through the existing authentication flow
    ↓
Browse and switch between all public Missions
    ↓
Choose a Mission that fits the current environment
    ↓
Complete the real-world interaction
    ↓
Record evidence after the interaction
    ↓
Submit through the existing completion flow
    ↓
Server confirms completion
    ↓
Pack progress updates
    ↓
Choose or switch to another Mission
    ↓
...
    ↓
15 / 15
    ↓
FINAL MISSION UNLOCKED
    ↓
START IT YOURSELF
    ↓
Pack Completed
```

Mission selection, card switching, recording state, upload success and server-confirmed completion are separate states.

Only server-confirmed completion updates Mission completion and Pack progress.

---

# 7. UI Ordering Principle

公开 Mission **不应该按照后台强度从低到高排列**。

不要让 UI 暗示：

> Mission 01 → Mission 15

是固定课程路线。

卡片应允许混合呈现：

- scripted
- unscripted
- low visibility
- public
- brief
- personally meaningful

例如：

```text
No Practical Excuse
Hello First
Walk Over and Begin
Ask for Their Take
Break the Familiar Silence
Name the Moment
...
```

目的：

> **Pick what fits today.**

用户可以暂时回避高挑战 Mission。

当未完成内容逐渐减少时，剩余卡片会自然显示用户真正回避的开口类型。

系统不需要通过固定顺序强迫升级。

> **自由选择保留用户控制；完整 Mission Space 保留真实挑战。**

---

# 8. Recommended Internal Metadata

每个 Mission 建议至少保存以下内容属性：

```ts
primary_goal
initiation_autonomy
social_intent_visibility
response_uncertainty
context_openness
stranger_distance
public_visibility
personal_exposure
personal_importance
external_structure
companion_fallback
future_encounter_likelihood
interaction_required
estimated_duration
cost_level
location_dependency
facility_dependency
safety_sensitivity
estimated_intensity
```

这些字段主要服务于：

- 内容审核
- Mission Pool 平衡
- 防止行为重复
- 未来推荐算法
- 个性化排序
- 风险与可执行性检查

不需要全部展示给用户。

---

# 9. Mission Rejection Rules

以下类型原则上不进入 Talking to Strangers：

## Too Transactional

普通服务流程本身不足以构成 Mission：

- Complete a checkout
- Place a standard order
- Answer a required question
- Say thanks after receiving service

用户必须主动发起任务要求的接触，而不是被流程迫使说话。

## Conversation Performance

不采用：

- Keep a stranger talking for ten minutes
- Tell a story that makes someone laugh
- Avoid every silence
- Impress someone with an interesting conversation

这些训练的是聊天表现，并使成功依赖对方参与。

## Rejection-Centered Requests

不采用：

- Ask for someone's phone number
- Invite a stranger to join an activity
- Ask for a discount or special treatment
- Request a personal favor
- Ask someone to give you an opportunity

如果核心暴露是“对方可能拒绝我的请求”，更属于 Fear of Rejection。

## Doing Things Alone

不采用只要求用户：

- Go to an event alone
- Sit alone near strangers
- Attend a class without a friend
- Spend time alone in a social place

如果没有主动接触陌生人，核心训练属于 Doing Things Alone。

## Pickup or Attraction Goals

不采用：

- Get someone's contact information
- Approach someone because they are attractive
- Deliver a line designed to create romantic interest
- Convince someone to continue the interaction

Pack 训练主动开口，不训练搭讪或获得关系结果。

## Artificial or Invasive Challenges

不采用：

- Say something intentionally strange or embarrassing
- Ask invasive personal questions
- Interrupt someone who is busy
- Keep trying after a short or absent response
- Approach people in isolated or enclosed situations
- Follow someone who is moving away

挑战必须来自真实生活中的主动性，而不是突破他人边界。

## Recording or Privacy Violations

不采用要求用户：

- Record the stranger
- Photograph the interaction
- Collect identifying details
- Publish the stranger's response
- Prove that the other person participated

完成凭证由用户在互动结束后独立录制。

## Quantity Filling

不把同一行为按以下方式拆成多张：

- 在咖啡馆开口
- 在商店开口
- 在公园开口
- 在车站开口

地点只是载体。只有主要心理变量不同，Mission 才能独立存在。

---

# 10. Final Pack Philosophy

Talking to Strangers 不应该告诉用户：

> **Become more outgoing.**

也不应该告诉用户：

> **Make everyone like you.**

真正的核心是：

> **I can be the one who starts.**

对方可以回应，也可以不回应。

一次互动可以持续，也可以只停留在一句话。

成功不属于对方的反应。

它发生在用户完成那个原本总会放弃的动作时：

> **开口。**

前面的 Mission 是训练。

最后的 Mission 是现实生活。

最终目标不是让用户成为“擅长和所有陌生人聊天的人”，而是：

> **当一个安全、合适而真实的互动机会出现时，等待对方先开始不再拥有决定权。**

---

# 11. Artwork Production Handoff

## Pack-wide Visual Semantics

- **Behavior shift:** 从等待完美时机或等别人先开口，转变为在安全、合适的机会中主动发出第一次接触。
- **Training space:** 问候、真实信息需求、观点、共同情境、轻度自我表达、好奇与欣赏，以及在旁人、距离、同伴和重复场景压力下主动开始。
- **Experience clusters:** 简单问候与真实提问；观点、共同瞬间、好奇和欣赏；无实用借口的自我介绍与主动开始；有可见度、距离或同伴时的主动；个人重要情境中的迁移。
- **Content-token families:** 地图或指引、共同物件或活动、工作坊节目单或参与者提示、排队或邻座提示、两人之间开放的路径或空间。这些只提供语义连接，不是固定场景。
- **Must not imply:** 搭讪或吸引目标、追逐阻挡、销售服务、录制表演、必须得到积极回应，或把完成后的奖励统一画成恐惧与羞辱。
- **Safety and privacy:** 陌生人始终保有个人空间、离开路径和不回应的自由；不表现围堵、施压、偷拍视频或侵犯隐私。
- **Cover semantic range:** 呈现多种安全的“由我先开始”的可能性，强调主动与开放，但不要求对方回应，也不拼贴每张 Mission。
- **Reward context:** Mission Artwork 在任务完成后获得，可采用直接、关联转化或少量自由角色艺术；不要求逐字复刻互动，也不需要用对话气泡解释。
```json
{
  "schemaVersion": "2.0",
  "pack": {
    "slug": "talking-to-strangers",
    "title": "Talking to Strangers",
    "promise": "Stop waiting for the other person to speak first.",
    "publicMissionCount": 15,
    "behaviorShift": "The user stops waiting for a perfect opening or for the other person to begin and initiates a safe, appropriate first contact.",
    "trainingSpaceSummary": "Safe first contact through greetings, genuine questions, opinions, contextual comments, light self-disclosure, curiosity, appreciation, visible initiation, physical approach, and personally meaningful transfer.",
    "experienceClusters": [
      "simple greetings and genuine information needs",
      "opinions, shared moments, curiosity, and appreciation",
      "self-introduction and initiating without a practical pretext",
      "initiating under visibility, distance, companion, and repeated-setting pressure",
      "personally meaningful real-life transfer"
    ],
    "contentTokenFamilies": [
      "map, directory, or wayfinding cue",
      "shared object or visible activity",
      "workshop badge, program, or participant cue",
      "queue, neighboring seat, or repeated-setting cue",
      "open path or spatial gap between two people"
    ],
    "mustNotImply": [
      "pickup, attraction, or contact-exchange goals",
      "pursuit, blocking, cornering, or repeated pressure",
      "sales, service, or transactional interaction as the Pack-wide story",
      "recording or publicly performing the stranger",
      "fear or humiliation as the default reward emotion",
      "speech bubbles or explanatory text baked into the artwork"
    ],
    "safetyPrivacyBoundaries": [
      "The stranger must retain personal space, a clear route away, and freedom not to respond.",
      "Do not depict pursuit, blocking, cornering, recording, coercion, or public performance.",
      "Avoid pickup, attraction, contact exchange, sales, status, or guaranteed positive-response framing."
    ],
    "cover": {
      "semanticRange": "A varied field of safe first-contact possibilities in which beginning is the achievement; the cover should show agency, openness, and uncertainty without coercion or requiring a successful response.",
      "contentCandidates": [
        "map or directory cue",
        "shared-interest object or activity",
        "workshop program or participant badge",
        "queue or neighboring-seat cue",
        "open path or spatial opening",
        "small repeated-routine cue"
      ],
      "selectionNotes": "Select a limited set across practical, contextual, participant, and self-initiated clusters; integrate them around one coherent social opening without dialogue text or mini-scene collage."
    }
  },
  "missions": [
    {
      "number": 1,
      "slug": "hello-first",
      "visibility": "public",
      "title": "Hello First",
      "action": "In a moment when acknowledging each other is natural, greet a stranger before they greet you.",
      "learningObjective": "Practice the smallest unit of initiation by being the first person to send a simple social signal.",
      "semanticAnchors": {
        "action": [
          "natural mutual awareness",
          "a clear greeting gesture or spoken signal from the user",
          "the stranger has not been chased or interrupted"
        ],
        "props": [],
        "environment": [
          "shared entrance or path",
          "neighboring public positions",
          "ordinary passing moment with natural acknowledgment"
        ],
        "peopleRelationship": [
          "One user and one stranger briefly acknowledge each other; the user initiates."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Practice the smallest unit of initiation by being the first person to send a simple social signal."
        ]
      },
      "confusionRisks": [
        "Name the Moment",
        "Introduce Yourself First"
      ],
      "safetyExclusions": [
        "pursuit",
        "blocking movement",
        "sudden close approach"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 2,
      "slug": "ask-something-real",
      "visibility": "public",
      "title": "Ask Something Real",
      "action": "Ask a stranger one simple question about information you genuinely need and cannot already see.",
      "learningObjective": "Use a genuine need for information to lower the activation barrier for first contact.",
      "semanticAnchors": {
        "action": [
          "a genuine information gap",
          "one clear question initiated by the user",
          "a stranger reasonably positioned to know"
        ],
        "props": [],
        "environment": [
          "shared facility",
          "unmarked destination",
          "immediate public surroundings"
        ],
        "peopleRelationship": [
          "The user asks one available stranger for genuine information."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Use a genuine need for information to lower the activation barrier for first contact."
        ]
      },
      "confusionRisks": [
        "Ask for Their Take",
        "No Practical Excuse"
      ],
      "safetyExclusions": [
        "invented or obviously unnecessary question",
        "interrupting someone visibly busy"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 3,
      "slug": "ask-for-their-take",
      "visibility": "public",
      "title": "Ask for Their Take",
      "action": "Ask a stranger for their genuine opinion, experience, or recommendation about something connected to where you both are or what you are both doing.",
      "learningObjective": "Invite an uncertain personal judgment rather than asking for a fixed fact.",
      "semanticAnchors": {
        "action": [
          "a shared contextual subject",
          "the user inviting an opinion or recommendation",
          "no request for a favor or yes-no concession"
        ],
        "props": [],
        "environment": [
          "shared activity",
          "place with multiple choices",
          "experience both people are currently having"
        ],
        "peopleRelationship": [
          "The user asks one stranger for a personal view connected to the immediate context."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Invite an uncertain personal judgment rather than asking for a fixed fact."
        ]
      },
      "confusionRisks": [
        "Ask Something Real",
        "Ask About What Matters"
      ],
      "safetyExclusions": [
        "sensitive or invasive subject"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 4,
      "slug": "name-the-moment",
      "visibility": "public",
      "title": "Name the Moment",
      "action": "Direct one brief, neutral comment to a stranger about something you are both experiencing.",
      "learningObjective": "Begin without relying on a question, request, or need for help.",
      "semanticAnchors": {
        "action": [
          "one immediate shared experience",
          "a neutral comment initiated by the user",
          "no question, request, or service transaction"
        ],
        "props": [],
        "environment": [
          "shared wait",
          "weather or minor situational moment",
          "public activity both people can observe"
        ],
        "peopleRelationship": [
          "The user and one stranger share the same moment; the user names it first."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Begin without relying on a question, request, or need for help."
        ]
      },
      "confusionRisks": [
        "Hello First",
        "No Practical Excuse"
      ],
      "safetyExclusions": [
        "comment about the stranger's body or identity"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 5,
      "slug": "share-something-small",
      "visibility": "public",
      "title": "Share Something Small",
      "action": "Tell a stranger one small, context-appropriate thing about yourself that gives them room to respond.",
      "learningObjective": "Practice light self-disclosure instead of hiding entirely behind questions.",
      "semanticAnchors": {
        "action": [
          "the user is the source of the personal statement",
          "the disclosure is light and context-appropriate",
          "the interaction remains optional for the stranger"
        ],
        "props": [],
        "environment": [
          "shared activity",
          "participant setting",
          "ordinary context that supports a small personal remark"
        ],
        "peopleRelationship": [
          "The user shares briefly with one stranger without demanding reciprocal disclosure."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Practice light self-disclosure instead of hiding entirely behind questions."
        ]
      },
      "confusionRisks": [
        "Ask for Their Take",
        "Introduce Yourself First"
      ],
      "safetyExclusions": [
        "address, itinerary, contact details, or sensitive personal information"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": true,
        "notes": "Broad enough to support deliberately free character art when Pack-level connection and collection coverage remain intact."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 6,
      "slug": "follow-your-curiosity",
      "visibility": "public",
      "title": "Follow Your Curiosity",
      "action": "Ask a stranger one respectful question about a visible, non-sensitive activity, item, or interest they have chosen to show or use in public.",
      "learningObjective": "Turn genuine curiosity about a visible, chosen interest into respectful action.",
      "semanticAnchors": {
        "action": [
          "a visible chosen activity, item, or interest",
          "genuine directional curiosity from the user",
          "one respectful question"
        ],
        "props": [],
        "environment": [
          "shared hobby setting",
          "public use of a distinctive non-sensitive item",
          "visible creative or recreational activity"
        ],
        "peopleRelationship": [
          "The user asks one available stranger about something the stranger has voluntarily made visible in public."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Turn genuine curiosity about a visible, chosen interest into respectful action."
        ]
      },
      "confusionRisks": [
        "Ask for Their Take",
        "Ask About What Matters"
      ],
      "safetyExclusions": [
        "body, identity, health, religion, politics, or private relationship questions",
        "interrupting focused work or someone signaling they do not want contact"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 7,
      "slug": "say-what-you-noticed",
      "visibility": "public",
      "title": "Say What You Noticed",
      "action": "Tell a stranger you genuinely appreciate one specific, non-physical choice or considerate action you noticed.",
      "learningObjective": "Accept positive social exposure by expressing specific appreciation without seeking a return.",
      "semanticAnchors": {
        "action": [
          "a specific considerate action or chosen item",
          "appreciation directed from the user",
          "no attached request or attempt to prolong contact"
        ],
        "props": [],
        "environment": [
          "ordinary shared public setting",
          "moment following a considerate action",
          "context showing a non-physical creative choice"
        ],
        "peopleRelationship": [
          "The user offers one specific appreciation to one stranger and allows the interaction to end."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Accept positive social exposure by expressing specific appreciation without seeking a return."
        ]
      },
      "confusionRisks": [
        "Follow Your Curiosity",
        "Share Something Small"
      ],
      "safetyExclusions": [
        "comments about body, attractiveness, age, or sensitive identity",
        "request for contact information, invitation, or private question"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 8,
      "slug": "introduce-yourself-first",
      "visibility": "public",
      "title": "Introduce Yourself First",
      "action": "In a setting where participants are welcome to meet each other, introduce yourself to one stranger before anyone introduces you.",
      "learningObjective": "Begin a participant-to-participant connection without waiting for a host, friend, or stranger to lead.",
      "semanticAnchors": {
        "action": [
          "a meet-friendly participant setting",
          "the user's self-introduction",
          "no host or companion performing the introduction"
        ],
        "props": [],
        "environment": [
          "workshop or class arrival",
          "club or shared-interest gathering",
          "networking or participant welcome area"
        ],
        "peopleRelationship": [
          "The user introduces themself to one fellow participant before external facilitation occurs."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Begin a participant-to-participant connection without waiting for a host, friend, or stranger to lead."
        ]
      },
      "confusionRisks": [
        "Hello First",
        "Don't Hand It Off"
      ],
      "safetyExclusions": [
        "setting where unsolicited introduction is inappropriate"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 9,
      "slug": "no-practical-excuse",
      "visibility": "public",
      "title": "No Practical Excuse",
      "action": "In an open setting where light interaction is welcome, start a brief interaction with a stranger when you do not need information, help, or a service — and nothing specific has just happened to create the opening for you.",
      "learningObjective": "Initiate because human contact is wanted, without disguising the social intention as a practical transaction.",
      "semanticAnchors": {
        "action": [
          "an open context where light interaction is welcome",
          "no information need, help request, service role, or shared incident",
          "the user's deliberate initiation"
        ],
        "props": [],
        "environment": [
          "open social area",
          "casual shared-interest environment",
          "public setting with relaxed optional interaction"
        ],
        "peopleRelationship": [
          "The user intentionally initiates toward one available stranger with no practical pretext."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Initiate because human contact is wanted, without disguising the social intention as a practical transaction."
        ]
      },
      "confusionRisks": [
        "Ask Something Real",
        "Name the Moment",
        "Take the Opening"
      ],
      "safetyExclusions": [
        "approaching someone busy, wearing headphones, on a call, moving quickly, closed off, or leaving"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 10,
      "slug": "take-the-opening",
      "visibility": "public",
      "title": "Take the Opening",
      "action": "The next time you notice a safe, natural chance to speak to a stranger and feel yourself delaying, use a simple opening before the shared moment ends.",
      "learningObjective": "Interrupt the rehearsal-and-delay loop by acting before a fleeting natural opportunity disappears.",
      "semanticAnchors": {
        "action": [
          "a fleeting natural opening",
          "time or movement indicating the moment will end",
          "the user acting before separation"
        ],
        "props": [],
        "environment": [
          "brief shared wait",
          "temporary neighboring position",
          "short-lived shared observation"
        ],
        "peopleRelationship": [
          "The user and one stranger briefly share a natural moment; the user acts before it closes."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Interrupt the rehearsal-and-delay loop by acting before a fleeting natural opportunity disappears."
        ]
      },
      "confusionRisks": [
        "Name the Moment",
        "No Practical Excuse"
      ],
      "safetyExclusions": [
        "creating or forcing an opening after the natural moment has ended"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": true,
        "notes": "Broad enough to support deliberately free character art when Pack-level connection and collection coverage remain intact."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 11,
      "slug": "dont-hand-it-off",
      "visibility": "public",
      "title": "Don't Hand It Off",
      "action": "While you are with someone you know, be the one to start one natural, appropriate interaction with a stranger instead of waiting for your companion to do it.",
      "learningObjective": "Stop outsourcing the first contact to a more socially confident companion.",
      "semanticAnchors": {
        "action": [
          "one familiar companion beside or behind the user",
          "one stranger",
          "the user clearly performing the initiation"
        ],
        "props": [],
        "environment": [
          "ordinary outing with a friend",
          "shared public situation",
          "group arrival or service-adjacent context where natural contact is appropriate"
        ],
        "peopleRelationship": [
          "The user is with one known companion but personally initiates toward one stranger."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Stop outsourcing the first contact to a more socially confident companion."
        ]
      },
      "confusionRisks": [
        "Introduce Yourself First",
        "Open in the Open"
      ],
      "safetyExclusions": [
        "companion pressuring or daring the user",
        "multiple people surrounding the stranger"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 12,
      "slug": "open-in-the-open",
      "visibility": "public",
      "title": "Open in the Open",
      "action": "Start one appropriate, one-to-one interaction with a stranger while other people are nearby.",
      "learningObjective": "Initiate despite the possibility that nearby people may see or hear the attempt.",
      "semanticAnchors": {
        "action": [
          "one-to-one interaction",
          "nearby bystanders",
          "the user initiates without addressing the crowd"
        ],
        "props": [],
        "environment": [
          "busy shared seating",
          "public queue or common area",
          "open gathering space"
        ],
        "peopleRelationship": [
          "The user addresses one stranger; nearby people remain incidental and are not an audience."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Initiate despite the possibility that nearby people may see or hear the attempt."
        ]
      },
      "confusionRisks": [
        "Don't Hand It Off",
        "Walk Over and Begin"
      ],
      "safetyExclusions": [
        "speaking loudly for attention",
        "turning the stranger into a public performance"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 13,
      "slug": "walk-over-and-begin",
      "visibility": "public",
      "title": "Walk Over and Begin",
      "action": "In an open setting where brief interaction is appropriate, approach a stranger who is not already beside you and start one respectful interaction.",
      "learningObjective": "Cross a small physical distance to initiate instead of waiting for accidental proximity.",
      "semanticAnchors": {
        "action": [
          "visible distance crossed by the user",
          "open space and respectful stopping distance",
          "the user begins the interaction"
        ],
        "props": [],
        "environment": [
          "open shared-interest setting",
          "casual public social area",
          "public place where brief approach is appropriate"
        ],
        "peopleRelationship": [
          "The user approaches one available stranger from a visible direction without surrounding or blocking them."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Cross a small physical distance to initiate instead of waiting for accidental proximity."
        ]
      },
      "confusionRisks": [
        "Open in the Open",
        "No Practical Excuse"
      ],
      "safetyExclusions": [
        "approaching from behind",
        "blocking a route",
        "following",
        "approaching someone busy, on a call, wearing headphones, moving quickly, or avoiding contact"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 14,
      "slug": "break-the-familiar-silence",
      "visibility": "public",
      "title": "Break the Familiar Silence",
      "action": "Start a brief interaction with a familiar stranger — someone you recognize from a repeated shared setting but have never spoken to.",
      "learningObjective": "Accept the uncertainty of changing a repeated silent relationship when future encounters are likely.",
      "semanticAnchors": {
        "action": [
          "a repeated-setting cue",
          "mutual visual recognition",
          "the first spoken initiation"
        ],
        "props": [],
        "environment": [
          "regular commute or waiting place",
          "recurring class or facility",
          "repeated neighborhood or routine setting"
        ],
        "peopleRelationship": [
          "The user and one familiar stranger recognize each other from prior silent encounters; the user initiates."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Accept the uncertainty of changing a repeated silent relationship when future encounters are likely."
        ]
      },
      "confusionRisks": [
        "Hello First",
        "Introduce Yourself First"
      ],
      "safetyExclusions": [
        "implying surveillance, tracking, or private knowledge"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 15,
      "slug": "ask-about-what-matters",
      "visibility": "public",
      "title": "Ask About What Matters",
      "action": "Start an interaction with a stranger around a subject you genuinely care about, and ask one question you actually want answered.",
      "learningObjective": "Initiate when the subject has real personal importance and the emotional stakes are higher.",
      "semanticAnchors": {
        "action": [
          "a subject with genuine personal meaning",
          "the user's focused interest",
          "one sincere question initiated toward a relevant stranger"
        ],
        "props": [],
        "environment": [
          "shared-interest event",
          "publicly visible work or practice",
          "topic-specific gathering or place"
        ],
        "peopleRelationship": [
          "The user initiates toward one stranger connected to a subject the user genuinely values."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Initiate when the subject has real personal importance and the emotional stakes are higher."
        ]
      },
      "confusionRisks": [
        "Ask for Their Take",
        "Follow Your Curiosity",
        "START IT YOURSELF"
      ],
      "safetyExclusions": [
        "private, sensitive, or invasive subject",
        "turning the interaction into a request for access, favor, or status"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": true,
        "notes": "Broad enough to support deliberately free character art when Pack-level connection and collection coverage remain intact."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    },
    {
      "number": 16,
      "slug": "start-it-yourself",
      "visibility": "hidden-final",
      "title": "START IT YOURSELF",
      "action": "What interaction with a stranger have you genuinely wanted to begin — but kept hoping they would start? Maybe it is one particular person. Maybe it is a kind of moment you repeatedly let pass. Choose a safe and appropriate opportunity. Start it yourself.",
      "learningObjective": "Transfer the trained ability into one personally meaningful real-life interaction the user has genuinely and repeatedly avoided initiating.",
      "semanticAnchors": {
        "action": [
          "personal significance",
          "the user unmistakably begins first",
          "a safe and appropriate real-life opportunity"
        ],
        "props": [],
        "environment": [
          "the user's own repeated setting",
          "a personally meaningful shared-interest context",
          "another safe real-world opportunity"
        ],
        "peopleRelationship": [
          "The user initiates toward one stranger relevant to a real interaction they have repeatedly wanted to begin; the stranger remains free to decline."
        ],
        "symbolicPossibilities": [
          "A metaphor, trace, or aftermath grounded in this learning objective: Transfer the trained ability into one personally meaningful real-life interaction the user has genuinely and repeatedly avoided initiating."
        ]
      },
      "confusionRisks": [
        "Ask About What Matters",
        "a generic triumphant social scene"
      ],
      "safetyExclusions": [
        "requiring a positive response, friendship, contact information, date, opportunity, favor, or special treatment",
        "pursuit, pressure, recording, or privacy invasion"
      ],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Preserve at least one approved action, relationship, environment, or learning-objective anchor; literal reenactment is not required."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    }
  ]
}
```
