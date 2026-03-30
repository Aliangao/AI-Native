"""Centralized prompt templates for all AI tasks."""

DIGEST_SUMMARIZE = """你是一个AI领域的资讯编辑。请将以下文章内容总结为简洁的中文摘要。

要求：
1. 摘要控制在100字以内
2. 突出核心信息：什么技术/产品、有什么突破/变化、对用户的影响
3. 提取这篇文章涉及的AI能力关键词（如：图像生成、代码编写、语音合成等）
4. 给出重要性评分(1-5)：5=行业重大突破，3=值得关注，1=一般资讯

输出JSON格式：
{{"summary": "...", "category": "model_update|tool_release|research|industry", "ai_capability": "...", "importance": 3}}

文章内容：
{content}"""

DIGEST_DAILY = """你是一个AI资讯编辑，请将以下多条AI资讯整理为一份每日精华摘要。

要求：
1. 按重要性排序，最多保留8条
2. 每条用一句话概括核心信息
3. 在开头写一段50字以内的今日AI动态总结
4. 标注每条的分类标签

资讯列表：
{articles}"""

TOOL_ANALYZE = """你是一个AI工具分析专家。用户提到了一个AI工具："{tool_name}"。

重要原则：优先提供可验证的事实信息（官网URL、真实定价、已知功能），其次再给出主观评价。

请提供以下信息（用JSON格式）：
{{
    "name": "工具名称",
    "description": "一句话描述（基于事实）",
    "category": "分类（如图像生成、写作助手、编程工具等）",
    "official_url": "工具官网URL",
    "pricing": "定价信息（免费/付费/Freemium，具体价格）",
    "features": ["核心功能1", "核心功能2", "核心功能3"],
    "getting_started": "最简单的上手步骤（3步以内）",
    "getting_started_url": "官网或教程链接",
    "similar_tools": ["类似工具1", "类似工具2"],
    "verdict": "一句话评价：值不值得体验，适合什么人"
}}

如果你不确定某项信息，请在相应字段标注"需要进一步搜索"，不要编造。"""

INTENT_DETECT = """判断用户消息的意图。用户消息："{message}"

可能的意图：
1. ask_tool - 询问某个AI工具（消息中提到了具体的AI工具名称）
2. upload_business - 上传或描述业务信息
3. ask_digest - 询问AI资讯/最新动态
4. general_chat - 普通对话

返回JSON：{{"intent": "...", "entity": "提取的关键实体（如工具名）"}}"""

EXTRACT_BUSINESS = """你是一个商业分析专家。请从以下用户提供的业务信息中，提取结构化的业务上下文。

要求提取：
1. 业务领域和核心业务
2. 当前使用的技术/工具/工作流
3. 主要痛点和需求
4. 可能受益于AI的环节

输出JSON格式：
{{
    "domain": "业务领域",
    "core_business": "核心业务描述",
    "current_tools": ["当前工具1", "工具2"],
    "workflows": ["工作流1", "工作流2"],
    "pain_points": ["痛点1", "痛点2"],
    "ai_opportunities": ["可能的AI应用点1", "应用点2"]
}}

用户业务信息：
{content}"""

MATCH_OPPORTUNITY = """你是一个AI商业顾问。一个新的AI能力出现了，请分析它是否能为用户的业务带来机遇。

新AI能力：
{ai_capability}

用户业务上下文：
{business_context}

请分析：
1. 这个AI能力与用户业务的关联度（0-100分）
2. 具体能给用户带来什么价值
3. 建议的应用方式
4. 快速验证的步骤
5. 生成一段可以直接粘贴到Claude Code中运行的验证prompt——用户粘贴后无需修改即可开始验证这个机遇

输出JSON格式：
{{
    "relevance_score": 85,
    "opportunity": "一句话描述机遇",
    "value_analysis": "详细价值分析",
    "application_method": "建议的应用方式",
    "quick_test_steps": ["步骤1", "步骤2", "步骤3"],
    "verification_prompt": "一段完整的、可直接粘贴到Claude Code执行的prompt，帮助用户快速验证这个AI机遇。要求：1)明确告诉Claude要做什么 2)包含具体的技术实现步骤 3)用户粘贴后零修改即可运行"
}}"""
