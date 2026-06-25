# API 文档

Base URL: `http://localhost:3001/api`

---

## 1. 讨论管理

### GET /discussions

获取讨论列表。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | string | 否 | 筛选状态：`pending` / `live` / `ended` |

**Response (200):**
```json
{
  "discussions": [
    {
      "id": "d-uuid-001",
      "topic": "AI是否会取代人类创造力？",
      "status": "live",
      "expert_count": 4,
      "panelist_count": 5,
      "message_count": 23,
      "created_at": "2026-06-25T10:00:00Z"
    }
  ]
}
```

---

### POST /discussions

创建新讨论，调用 DeepSeek 生成嘉宾阵容。

**Request Body:**
```json
{
  "topic": "AI是否会取代人类创造力？",
  "expert_count": 4
}
```

**Response (201):**
```json
{
  "id": "d-uuid-001",
  "topic": "AI是否会取代人类创造力？",
  "status": "pending",
  "expert_count": 4,
  "panelists": [
    {
      "id": "p-uuid-001",
      "name": "张澜",
      "role": "host",
      "title": "资深科技媒体人",
      "stance": "中立主持，擅长引导深度对话",
      "color": "#FFD54F"
    },
    {
      "id": "p-uuid-002",
      "name": "李明远",
      "role": "expert",
      "title": "AI研究院首席科学家",
      "stance": "AI将极大增强而非取代人类创造力",
      "color": "#4FC3F7"
    }
  ],
  "created_at": "2026-06-25T10:00:00Z"
}
```

---

### GET /discussions/:id

获取讨论详情，含完整嘉宾列表。

**Response (200):**
```json
{
  "id": "d-uuid-001",
  "topic": "AI是否会取代人类创造力？",
  "status": "live",
  "expert_count": 4,
  "panelists": [
    {
      "id": "p-uuid-001",
      "name": "张澜",
      "role": "host",
      "title": "资深科技媒体人",
      "stance": "中立主持，擅长引导深度对话",
      "color": "#FFD54F",
      "status": "speaking",
      "focus": "正在总结各方观点"
    }
  ],
  "created_at": "2026-06-25T10:00:00Z"
}
```

---

### POST /discussions/:id/confirm

用户确认嘉宾名单（可调整后提交），启动圆桌讨论。

**Request Body:**
```json
{
  "panelists": [
    { "name": "张澜", "role": "host", "title": "科技媒体人", "stance": "中立", "color": "#FFD54F" },
    { "name": "李明远", "role": "expert", "title": "AI科学家", "stance": "增强论", "color": "#4FC3F7" },
    { "name": "王若曦", "role": "expert", "title": "艺术家", "stance": "危机论", "color": "#EF5350" },
    { "name": "陈建国", "role": "expert", "title": "教育学家", "stance": "融合论", "color": "#66BB6A" },
    { "name": "赵敏", "role": "expert", "title": "哲学教授", "stance": "本质论", "color": "#AB47BC" }
  ]
}
```

**Response (200):**
```json
{
  "id": "d-uuid-001",
  "status": "live"
}
```

---

### POST /discussions/:id/end

手动结束讨论（也可由 AI 主持人自动触发）。

**Response (200):**
```json
{
  "id": "d-uuid-001",
  "status": "ended",
  "summary": "在这场关于AI与人类创造力的讨论中..."
}
```

---

## 2. 讨论内容

### GET /discussions/:id/messages

获取 Transcript 消息列表，支持分页。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| before | string | 否 | 游标：获取此 seq 之前的消息 |
| limit | integer | 否 | 每页数量，默认 50 |

**Response (200):**
```json
{
  "messages": [
    {
      "id": "m-uuid-001",
      "panelist_id": "p-uuid-001",
      "name": "张澜",
      "title": "资深科技媒体人",
      "color": "#FFD54F",
      "content": "欢迎各位来到今天的圆桌讨论...",
      "type": "opening",
      "seq": 1,
      "created_at": "2026-06-25T10:01:00Z"
    }
  ],
  "has_more": true
}
```

---

### GET /discussions/:id/consensus

获取当前共识列表。

**Response (200):**
```json
{
  "points": [
    {
      "id": "c-uuid-001",
      "content": "AI目前在执行层面表现优异，但原创性仍落后于人类",
      "confidence": 0.85,
      "updated_at": "2026-06-25T10:05:00Z"
    }
  ]
}
```

---

### GET /discussions/:id/divergence

获取当前分歧列表。

**Response (200):**
```json
{
  "points": [
    {
      "id": "d-uuid-001",
      "content": "AI生成的内容是否具备'创造性'",
      "perspectives": [
        "AI只是重组已有信息，不构成创造",
        "人类的创造本质上也建立在对已有知识的重组之上"
      ],
      "updated_at": "2026-06-25T10:06:00Z"
    }
  ]
}
```

---

## 3. SSE 事件流

### GET /discussions/:id/stream

Server-Sent Events 端点，实时推送讨论事件。每个讨论一个独立连接。

**Content-Type:** `text/event-stream`

**事件类型：**

| event | data (JSON) | 触发时机 |
|---|---|---|
| `panelist_status` | `{"panelist_id":"p-xxx","status":"speaking","focus":"正在准备回应..."}` | 嘉宾状态/关注点变化 |
| `transcript_message` | `{"id":"m-xxx","panelist_id":"p-xxx","name":"李明远","title":"AI科学家","color":"#4FC3F7","content":"...","type":"statement","seq":3}` | 新发言产生 |
| `consensus_update` | `{"id":"c-xxx","content":"...","confidence":0.85}` | 共识新增/修改 |
| `divergence_update` | `{"id":"d-xxx","content":"...","perspectives":["A","B"]}` | 分歧新增/修改 |
| `discussion_end` | `{"summary":"主持人总结全文..."}` | 讨论结束 |

**示例流：**
```
event: panelist_status
data: {"panelist_id":"p-001","status":"speaking","focus":"正在做开场引入"}

event: transcript_message
data: {"id":"m-001","panelist_id":"p-001","name":"张澜","title":"科技媒体人","color":"#FFD54F","content":"大家好，欢迎收看本期AI圆桌...","type":"opening","seq":1}

event: consensus_update
data: {"id":"c-001","content":"各方均认同AI对创意产业已产生深远影响","confidence":0.92}

event: discussion_end
data: {"summary":"经过深入讨论，我们达成以下共识：第一...分歧主要集中..."}
```

---

## 错误响应格式

```json
{
  "error": {
    "code": "DISCUSSION_NOT_FOUND",
    "message": "讨论不存在或已删除"
  }
}
```

**错误码：**

| code | HTTP Status | 说明 |
|---|---|---|
| `DISCUSSION_NOT_FOUND` | 404 | 讨论不存在 |
| `INVALID_STATUS_TRANSITION` | 400 | 状态转换不合法 |
| `LLM_GENERATION_FAILED` | 502 | 大模型调用失败 |
| `VALIDATION_ERROR` | 400 | 请求参数校验失败 |
