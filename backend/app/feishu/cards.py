"""Feishu interactive card templates."""


def build_digest_card(digest: dict) -> dict:
    """Build a daily AI digest interactive card."""
    digest_text = digest.get("digest", "暂无资讯")
    date = digest.get("date", "")
    count = digest.get("article_count", 0)

    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": f"🤖 AI日报 | {date}"},
            "template": "blue",
        },
        "elements": [
            {
                "tag": "markdown",
                "content": f"今日共收录 **{count}** 条AI资讯\n\n{digest_text}",
            },
            {"tag": "hr"},
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "查看更多"},
                        "type": "primary",
                        "url": "http://localhost:3000/digest",
                    },
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "刷新资讯"},
                        "type": "default",
                        "value": {"action": "refresh_digest"},
                    },
                ],
            },
        ],
    }


def build_tool_card(tool_info: dict) -> dict:
    """Build an AI tool information card."""
    name = tool_info.get("name", "未知工具")
    desc = tool_info.get("description", "")
    category = tool_info.get("category", "")
    features = tool_info.get("features", [])
    if isinstance(features, str):
        features = [features]
    getting_started = tool_info.get("getting_started", "")
    url = tool_info.get("getting_started_url", "")
    similar = tool_info.get("similar_tools", [])
    if isinstance(similar, str):
        similar = [similar]
    verdict = tool_info.get("verdict", "")

    features_text = "\n".join(f"• {f}" for f in features[:5]) if features else "暂无"
    similar_text = "、".join(similar[:3]) if similar else "暂无"

    elements = [
        {"tag": "markdown", "content": f"**{desc}**\n\n📂 分类：{category}"},
        {"tag": "hr"},
        {"tag": "markdown", "content": f"**核心功能**\n{features_text}"},
        {"tag": "hr"},
        {"tag": "markdown", "content": f"**快速上手**\n{getting_started}"},
        {"tag": "markdown", "content": f"**类似工具**：{similar_text}"},
        {"tag": "hr"},
        {"tag": "markdown", "content": f"💡 **点评**：{verdict}"},
    ]

    if url:
        elements.append({
            "tag": "action",
            "actions": [
                {
                    "tag": "button",
                    "text": {"tag": "plain_text", "content": "🔗 前往体验"},
                    "type": "primary",
                    "url": url,
                },
            ],
        })

    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": f"🛠️ AI工具 | {name}"},
            "template": "green",
        },
        "elements": elements,
    }


def build_opportunity_card(analysis: dict) -> dict:
    """Build a business opportunity match notification card."""
    opportunity = analysis.get("opportunity", "发现新的AI应用机会")
    relevance = analysis.get("relevance_score", 0)
    value = analysis.get("value_analysis", "")
    method = analysis.get("application_method", "")
    steps = analysis.get("quick_test_steps", [])
    if isinstance(steps, str):
        steps = [steps]

    steps_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps[:5])) if steps else "暂无"

    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": f"🎯 发现AI机遇 | 匹配度 {relevance}%"},
            "template": "orange",
        },
        "elements": [
            {"tag": "markdown", "content": f"**{opportunity}**"},
            {"tag": "hr"},
            {"tag": "markdown", "content": f"**价值分析**\n{value}"},
            {"tag": "hr"},
            {"tag": "markdown", "content": f"**建议应用方式**\n{method}"},
            {"tag": "hr"},
            {"tag": "markdown", "content": f"**快速验证步骤**\n{steps_text}"},
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "👍 有价值"},
                        "type": "primary",
                        "value": {"action": "feedback_useful"},
                    },
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "👎 不相关"},
                        "type": "default",
                        "value": {"action": "feedback_irrelevant"},
                    },
                ],
            },
        ],
    }
