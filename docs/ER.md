# 数据库 ER 图

## 实体关系图

```mermaid
erDiagram
    Discussion ||--o{ Panelist : "拥有"
    Discussion ||--o{ Message : "包含"
    Discussion ||--o{ ConsensusPoint : "产生"
    Discussion ||--o{ DivergencePoint : "产生"
    Panelist ||--o{ Message : "发表"
    Panelist ||--o{ PanelistStatusLog : "记录"

    Discussion {
        string id PK "UUID"
        string topic "讨论话题"
        int expert_count "专家人数（默认4）"
        string status "pending | live | ended"
        string created_at "ISO 时间戳"
    }

    Panelist {
        string id PK "UUID"
        string discussion_id FK "所属讨论"
        string name "姓名"
        string role "host | expert"
        string title "职业头衔"
        string stance "立场描述"
        string color "十六进制颜色"
        string status "standby | preparing | speaking"
        string focus "当前关注点/公开摘要"
    }

    Message {
        string id PK "UUID"
        string discussion_id FK "所属讨论"
        string panelist_id FK "发言人"
        string content "发言内容"
        string type "opening | statement | rebuttal | supplement | closing"
        int seq "发言序号（自增）"
        string created_at "ISO 时间戳"
    }

    ConsensusPoint {
        string id PK "UUID"
        string discussion_id FK "所属讨论"
        string content "共识内容"
        float confidence "置信度 0-1"
        string updated_at "最后更新时间"
    }

    DivergencePoint {
        string id PK "UUID"
        string discussion_id FK "所属讨论"
        string content "分歧内容"
        string perspectives "各方立场 JSON 数组"
        string updated_at "最后更新时间"
    }

    PanelistStatusLog {
        string id PK "UUID"
        string panelist_id FK "所属嘉宾"
        string status "standby | preparing | speaking"
        string focus "当时的关注点/摘要"
        string recorded_at "记录时间戳"
    }
```

## 表结构 SQL

```sql
CREATE TABLE discussions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    expert_count INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','live','ended')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE panelists (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('host','expert')),
    title TEXT NOT NULL,
    stance TEXT NOT NULL,
    color TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'standby' CHECK(status IN ('standby','preparing','speaking')),
    focus TEXT
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    panelist_id TEXT NOT NULL REFERENCES panelists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('opening','statement','rebuttal','supplement','closing')),
    seq INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE consensus_points (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5 CHECK(confidence >= 0 AND confidence <= 1),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE divergence_points (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    perspectives TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE panelist_status_logs (
    id TEXT PRIMARY KEY,
    panelist_id TEXT NOT NULL REFERENCES panelists(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('standby','preparing','speaking')),
    focus TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_panelists_discussion ON panelists(discussion_id);
CREATE INDEX idx_messages_discussion ON messages(discussion_id, seq);
CREATE INDEX idx_consensus_discussion ON consensus_points(discussion_id);
CREATE INDEX idx_divergence_discussion ON divergence_points(discussion_id);
CREATE INDEX idx_status_logs_panelist ON panelist_status_logs(panelist_id, recorded_at);
```
