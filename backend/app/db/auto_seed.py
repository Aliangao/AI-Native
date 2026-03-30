"""Auto-seed demo data on startup if database is empty.

Railway uses ephemeral filesystem, so SQLite data is lost on every redeploy.
This module ensures demo data is always available for the showcase.
"""
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import DigestArticle, BusinessContext, OpportunityMatch, Favorite


def auto_seed_if_empty():
    """Check if database is empty and seed demo data if needed."""
    db = SessionLocal()
    try:
        article_count = db.query(DigestArticle).count()
        if article_count > 0:
            print(f"[auto_seed] Database already has {article_count} articles, skipping seed.")
            return

        print("[auto_seed] Database is empty, seeding demo data...")
        _seed_articles(db)
        _seed_business_contexts(db)
        _seed_opportunities(db)
        _seed_favorites(db)
        print("[auto_seed] Demo data seeded successfully!")
    except Exception as e:
        print(f"[auto_seed] Error seeding data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _seed_articles(db: Session):
    now = datetime.utcnow()
    demo_articles = [
        {"title": "Claude 4 发布：推理能力大幅提升，支持百万token上下文", "url": "https://anthropic.com", "source": "Anthropic Blog", "category": "model_update", "summary": "Anthropic发布Claude 4，推理能力较前代提升60%，支持百万token上下文窗口，在代码生成、数学推理、多步骤规划等任务上表现突出", "summary_zh": "Anthropic发布Claude 4，推理能力较前代提升60%，支持百万token上下文窗口，在代码生成、数学推理、多步骤规划等任务上表现突出", "ai_capability": "超长上下文理解、高级推理、代码生成", "importance": 5, "published_at": now - timedelta(hours=2)},
        {"title": "Cursor 1.0 正式版发布：AI编程进入新纪元", "url": "https://cursor.com", "source": "TechCrunch", "category": "tool_release", "summary": "Cursor发布1.0正式版，新增Agent模式可自主完成跨文件重构，代码补全准确率提升至95%，成为开发者最受欢迎的AI编程工具", "summary_zh": "Cursor发布1.0正式版，新增Agent模式可自主完成跨文件重构，代码补全准确率提升至95%，成为开发者最受欢迎的AI编程工具", "ai_capability": "AI代码生成、智能重构、自主编程Agent", "importance": 5, "published_at": now - timedelta(hours=3)},
        {"title": "OpenAI Sora 正式面向所有用户开放", "url": "https://openai.com/sora", "source": "The Verge", "category": "tool_release", "summary": "OpenAI宣布Sora视频生成模型正式面向所有ChatGPT用户开放，支持生成最长60秒的高清视频，将彻底改变短视频内容创作流程", "summary_zh": "OpenAI宣布Sora视频生成模型正式面向所有ChatGPT用户开放，支持生成最长60秒的高清视频，将彻底改变短视频内容创作流程", "ai_capability": "AI视频生成、文生视频", "importance": 5, "published_at": now - timedelta(hours=4)},
        {"title": "Google DeepMind 发布 Gemini 2.5 Pro：多模态推理新标杆", "url": "https://deepmind.google", "source": "Google Blog", "category": "model_update", "summary": "Google DeepMind发布Gemini 2.5 Pro，在多模态推理基准测试中全面超越GPT-4o，支持图片、视频、音频的深度理解与分析", "summary_zh": "Google DeepMind发布Gemini 2.5 Pro，在多模态推理基准测试中全面超越GPT-4o，支持图片、视频、音频的深度理解与分析", "ai_capability": "多模态理解、视觉推理、音频分析", "importance": 4, "published_at": now - timedelta(hours=5)},
        {"title": "Midjourney V7 发布：照片级真实感图像生成", "url": "https://midjourney.com", "source": "AI News", "category": "tool_release", "summary": "Midjourney V7版本发布，图像生成质量达到照片级真实感，新增人物一致性、风格迁移等功能，设计师工作效率提升300%", "summary_zh": "Midjourney V7版本发布，图像生成质量达到照片级真实感，新增人物一致性、风格迁移等功能，设计师工作效率提升300%", "ai_capability": "AI图像生成、风格迁移、照片级渲染", "importance": 4, "published_at": now - timedelta(hours=6)},
        {"title": "豆包大模型发布Seed 2.0：中文理解能力行业第一", "url": "https://doubao.com", "source": "36Kr", "category": "model_update", "summary": "字节跳动发布豆包大模型Seed 2.0版本，在中文理解、写作、对话等任务上超越所有国产模型，API价格降低50%，助力开发者降本增效", "summary_zh": "字节跳动发布豆包大模型Seed 2.0版本，在中文理解、写作、对话等任务上超越所有国产模型，API价格降低50%，助力开发者降本增效", "ai_capability": "中文理解、AI对话、低成本推理", "importance": 4, "published_at": now - timedelta(hours=7)},
        {"title": "AI Agent 市场报告：2026年市场规模预计突破100亿美元", "url": "https://mckinsey.com", "source": "McKinsey", "category": "industry", "summary": "麦肯锡最新报告指出，AI Agent市场2026年规模将突破100亿美元，客服、编程、数据分析是三大核心应用场景，企业采用率同比增长200%", "summary_zh": "麦肯锡最新报告指出，AI Agent市场2026年规模将突破100亿美元，客服、编程、数据分析是三大核心应用场景，企业采用率同比增长200%", "ai_capability": "AI Agent、自动化客服、智能数据分析", "importance": 4, "published_at": now - timedelta(hours=8)},
        {"title": "ElevenLabs 推出实时语音克隆：30秒音频即可复制任何声音", "url": "https://elevenlabs.io", "source": "Product Hunt", "category": "tool_release", "summary": "ElevenLabs发布实时语音克隆功能，仅需30秒音频样本即可生成高保真克隆语音，支持29种语言，可用于播客、有声书、教育等场景", "summary_zh": "ElevenLabs发布实时语音克隆功能，仅需30秒音频样本即可生成高保真克隆语音，支持29种语言，可用于播客、有声书、教育等场景", "ai_capability": "语音克隆、多语言语音合成、TTS", "importance": 3, "published_at": now - timedelta(hours=9)},
        {"title": "Dify 开源框架发布 1.0：企业级LLM应用开发平台", "url": "https://dify.ai", "source": "GitHub Trending", "category": "tool_release", "summary": "Dify开源框架1.0版本发布，提供可视化工作流编排、RAG知识库、Agent构建等企业级能力，GitHub星标突破10万", "summary_zh": "Dify开源框架1.0版本发布，提供可视化工作流编排、RAG知识库、Agent构建等企业级能力，GitHub星标突破10万", "ai_capability": "LLM应用开发、RAG、AI工作流编排", "importance": 3, "published_at": now - timedelta(hours=10)},
        {"title": "斯坦福研究：AI辅助编程使初级开发者生产力提升55%", "url": "https://stanford.edu", "source": "Stanford HAI", "category": "research", "summary": "斯坦福大学人工智能研究所最新研究表明，使用AI编程助手的初级开发者生产力提升55%，而高级开发者提升约15%，AI正在重塑软件开发人才结构", "summary_zh": "斯坦福大学人工智能研究所最新研究表明，使用AI编程助手的初级开发者生产力提升55%，而高级开发者提升约15%，AI正在重塑软件开发人才结构", "ai_capability": "AI编程辅助、代码生成", "importance": 3, "published_at": now - timedelta(hours=11)},
        {"title": "Notion AI 全面升级：成为团队的AI知识管理助手", "url": "https://notion.so", "source": "Notion Blog", "category": "tool_release", "summary": "Notion AI迎来重大升级，新增AI问答、自动文档整理、会议纪要生成等功能，可基于团队知识库回答任何业务问题", "summary_zh": "Notion AI迎来重大升级，新增AI问答、自动文档整理、会议纪要生成等功能，可基于团队知识库回答任何业务问题", "ai_capability": "AI知识管理、文档智能整理、RAG问答", "importance": 3, "published_at": now - timedelta(hours=12)},
        {"title": "Meta 开源 LLaMA 4：405B参数模型性能比肩GPT-4", "url": "https://ai.meta.com", "source": "Meta AI Blog", "category": "model_update", "summary": "Meta开源LLaMA 4系列模型，最大405B参数版本在多项基准测试中比肩GPT-4，8B小模型可在手机端运行，推动AI普惠化进程", "summary_zh": "Meta开源LLaMA 4系列模型，最大405B参数版本在多项基准测试中比肩GPT-4，8B小模型可在手机端运行，推动AI普惠化进程", "ai_capability": "开源大模型、端侧AI部署", "importance": 4, "published_at": now - timedelta(hours=13)},
    ]
    for a in demo_articles:
        db.add(DigestArticle(**a))
    db.commit()
    print(f"[auto_seed] Seeded {len(demo_articles)} articles")


def _seed_business_contexts(db: Session):
    contexts = [
        {
            "user_id": "demo_user",
            "content": "服饰商家，拍照+修图非常耗时，一个SKU要花半天。没有专业设计师，外包成本高。",
            "source_type": "conversation",
            "extracted_context": json.dumps({
                "domain": "服饰零售",
                "core_business": "服饰商品售卖，及配套的SKU商品视觉物料生产、设计相关工作",
                "current_tools": [],
                "workflows": ["针对单个SKU进行人工拍摄商品图", "对拍摄完成的商品图进行人工修图", "通过外包承接设计类工作"],
                "pain_points": ["SKU商品图拍摄、修图耗时长，单个SKU物料制作需花费半天时间", "缺乏内部专业设计师，设计类工作外包成本高"],
                "ai_opportunities": ["AI生成服饰SKU商品图，替代或辅助人工拍摄、修图环节", "AI辅助完成服饰相关设计工作，降低对外包设计的依赖"]
            }, ensure_ascii=False),
        },
        {
            "user_id": "demo_user",
            "content": "在线教育公司，做K12英语培训。老师每天花3小时批改50+学生口语作业，课件制作也需要2天。",
            "source_type": "conversation",
            "extracted_context": json.dumps({
                "domain": "K12在线英语教育",
                "core_business": "面向K12阶段学生提供英语培训服务",
                "current_tools": [],
                "workflows": ["教师人工批改学生英语口语作业", "教师人工制作英语教学课件"],
                "pain_points": ["口语作业批改耗时久，教师日均需花费3小时批改50名以上学生的口语作业", "课件制作周期长，单份课件制作需要2天"],
                "ai_opportunities": ["AI自动批改英语口语作业", "AI辅助生成英语教学课件"]
            }, ensure_ascii=False),
        },
        {
            "user_id": "demo_user",
            "content": "美食自媒体，在抖音小红书做内容。一条视频从拍摄到发布要4-5小时，想缩短到1-2小时。还想拓展到YouTube和Instagram多语言市场。",
            "source_type": "conversation",
            "extracted_context": json.dumps({
                "domain": "美食自媒体内容创作及跨平台运营",
                "core_business": "创作美食类短视频内容，在抖音、小红书平台开展内容运营，计划拓展至海外平台",
                "current_tools": [],
                "workflows": ["内容选题策划", "视频拍摄", "视频后期制作", "内容平台发布运营"],
                "pain_points": ["单条视频从拍摄到发布全流程耗时长达4-5小时", "暂不具备多语言内容生产能力"],
                "ai_opportunities": ["AI辅助内容脚本生成", "AI辅助视频剪辑、自动字幕生成", "AI多语言翻译、智能配音"]
            }, ensure_ascii=False),
        },
        {
            "user_id": "demo_user",
            "content": "跨境电商，在亚马逊卖3C数码。每天200+英文客服邮件，产品listing SEO优化也需要大量人力。",
            "source_type": "conversation",
            "extracted_context": json.dumps({
                "domain": "跨境电商",
                "core_business": "基于亚马逊平台的3C数码类产品跨境销售业务",
                "current_tools": [],
                "workflows": ["英文客服邮件处理", "亚马逊产品listing SEO优化"],
                "pain_points": ["每日需处理200+英文客服邮件，人工处理工作量大", "产品listing SEO优化工作需要投入大量人力"],
                "ai_opportunities": ["AI智能处理客服英文邮件", "AI辅助产品listing SEO优化"]
            }, ensure_ascii=False),
        },
    ]
    for c in contexts:
        db.add(BusinessContext(**c))
    db.commit()
    print(f"[auto_seed] Seeded {len(contexts)} business contexts")


def _seed_opportunities(db: Session):
    demos = [
        {
            "user_id": "demo_user", "article_id": 3, "business_context_id": 3,
            "ai_capability": "OpenAI Sora视频生成：支持生成最长60秒高清视频",
            "business_need": "美食自媒体内容创作，视频拍摄到发布耗时4-5小时",
            "opportunity_analysis": json.dumps({
                "relevance_score": 95,
                "opportunity": "用Sora生成美食场景视频素材，将单条视频制作时间从4小时缩短到30分钟",
                "value_analysis": "你的业务核心痛点是视频制作耗时长。Sora可以根据文字描述直接生成高质量美食场景视频，包括食材特写、烹饪过程动画、成品展示等。结合你现有的剪映工作流，可以用AI生成的素材替代部分实拍，大幅缩短制作周期。",
                "application_method": "将Sora作为素材生成工具接入现有工作流：1) 用文字描述需要的视频片段 2) Sora生成多个候选 3) 在剪映中与实拍素材混剪",
                "quick_test_steps": ["注册OpenAI账号并开通Sora权限", "用一条已发布视频的脚本测试Sora生成效果", "将AI生成片段与实拍素材混剪对比效果", "选择3条视频进行A/B测试对比数据"],
                "verification_prompt": "我是一个美食自媒体创作者，目前一条视频从拍摄到发布要4-5小时。我想测试用AI视频生成来加速内容生产。请帮我：\n1. 写3条适合用Sora生成的美食短视频脚本（每条包含场景描述、镜头语言、时长规划）\n2. 为每条脚本生成可以直接粘贴到Sora的英文prompt（要求画面精美、美食特写、暖色调）\n3. 设计一个「实拍+AI素材混剪」的工作流模板，标注哪些镜头适合AI生成、哪些必须实拍\n4. 给出一周的A/B测试计划：对比纯实拍 vs AI辅助的完播率和点赞率"
            }, ensure_ascii=False),
            "similarity_score": 0.85, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 8, "business_context_id": 3,
            "ai_capability": "ElevenLabs实时语音克隆：30秒音频即可克隆声音，支持29种语言",
            "business_need": "美食自媒体希望拓展多语言市场，翻译中文内容为英文和日文",
            "opportunity_analysis": json.dumps({
                "relevance_score": 92,
                "opportunity": "用ElevenLabs克隆你的声音生成英文/日文配音，零成本实现多语言内容分发",
                "value_analysis": "你计划将美食内容拓展到YouTube和Instagram，最大障碍是多语言配音。ElevenLabs只需30秒你的中文语音样本，就能克隆你的声线生成29种语言的配音，保持个人IP一致性。",
                "application_method": "录制30秒中文音频样本→ElevenLabs生成声音模型→将中文脚本翻译后输入生成英文/日文配音→替换原视频音轨",
                "quick_test_steps": ["录制30秒清晰中文语音上传ElevenLabs", "选一条热门视频脚本翻译为英文", "生成英文配音并替换原音轨", "发布到YouTube观察海外观众反馈"],
                "verification_prompt": "我是一个中文美食自媒体博主，想把内容拓展到YouTube和Instagram的海外市场。请帮我：\n1. 把下面这段美食视频文案翻译成英文和日文，保持生动口语化的风格：「大家好，今天教大家做一道超简单的蒜蓉虾，5分钟搞定，鲜嫩多汁，好吃到舔盘子！」\n2. 为英文和日文版本分别写ElevenLabs的语音合成配置建议（语速、情感、停顿位置）\n3. 制定一个完整的「中文内容→多语言分发」SOP流程，包括翻译、配音、字幕、封面本地化\n4. 推荐5个适合美食内容的海外平台标签策略（英文+日文）"
            }, ensure_ascii=False),
            "similarity_score": 0.82, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 7, "business_context_id": 4,
            "ai_capability": "AI Agent市场爆发：客服、编程、数据分析三大核心场景",
            "business_need": "跨境电商日处理200+英文客服邮件，效率低下",
            "opportunity_analysis": json.dumps({
                "relevance_score": 90,
                "opportunity": "部署AI客服Agent自动回复80%常见英文邮件，每月节省120人时",
                "value_analysis": "你的团队每天处理200+英文客服邮件是最大的人力消耗。AI Agent在客服场景已经成熟，可自动处理退换货咨询、物流查询、产品FAQ等标准问题。按80%自动化率计算，每天可节省4小时人工。",
                "application_method": "使用Coze/Dify搭建客服Agent→导入历史邮件训练→接入亚马逊卖家邮箱→先人工审核AI回复→逐步放开自动发送",
                "quick_test_steps": ["收集最近100条客服邮件分类统计问题类型", "使用Coze搭建FAQ客服机器人原型", "导入Top 20高频问题的标准回复", "内部测试2周统计准确率和客户满意度"],
                "verification_prompt": "我是一个亚马逊3C数码跨境电商卖家，每天要处理200+封英文客服邮件。请帮我：\n1. 分析以下常见客服场景，为每个场景生成标准英文回复模板（专业、友好、符合亚马逊政策）：\n   - 客户询问物流状态\n   - 客户要求退换货\n   - 客户询问产品规格/兼容性\n   - 客户投诉产品质量\n   - 客户询问保修政策\n2. 设计一个邮件意图分类系统的prompt，能自动将收到的邮件分类到上述场景\n3. 写一个完整的Python脚本框架，用Claude API实现：读取邮件→意图分类→匹配模板→生成个性化回复→人工审核队列\n4. 给出上线前的测试checklist和风险评估"
            }, ensure_ascii=False),
            "similarity_score": 0.78, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 5, "business_context_id": 1,
            "ai_capability": "Midjourney V7：照片级真实感图像生成，设计效率提升300%",
            "business_need": "服饰商家做图困难，缺乏专业设计能力",
            "opportunity_analysis": json.dumps({
                "relevance_score": 88,
                "opportunity": "用Midjourney V7生成服饰商品展示图和模特图，替代80%的实拍和外包设计",
                "value_analysis": "服饰电商最大的痛点就是商品图制作。Midjourney V7的照片级真实感可以直接生成虚拟模特穿搭图、场景图、营销图。相比实拍一套商品图2000-5000元，AI生成成本接近零。",
                "application_method": "拍摄商品平铺图→Midjourney生成虚拟模特上身效果→用Canva添加营销文案→直接上架各电商平台",
                "quick_test_steps": ["准备5款热销服饰的平铺照片", "在Midjourney中测试虚拟模特穿搭效果", "对比AI生成图与实拍图的点击率", "建立品牌专属的AI模特风格模板"],
                "verification_prompt": "我是一个服饰电商卖家，每个SKU的商品图拍摄+修图要花半天时间，外包设计一套图2000-5000元。我想测试用AI生成商品图。请帮我：\n1. 为以下服饰品类各生成3条Midjourney prompt（要求照片级真实感、电商风格、白底/场景两种）：\n   - 女士连衣裙\n   - 男士休闲夹克\n   - 运动鞋\n2. 设计一套「商品平铺图→AI模特上身图」的完整工作流，包括拍摄要求、prompt模板、后处理步骤\n3. 创建一个品牌视觉一致性的Midjourney风格参数模板（固定模特风格、光线、背景）\n4. 制定对比测试方案：选5个SKU，对比AI生成图vs实拍图在电商平台的点击率和转化率"
            }, ensure_ascii=False),
            "similarity_score": 0.80, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 1, "business_context_id": 2,
            "ai_capability": "Claude 4推理能力大幅提升，支持百万token上下文",
            "business_need": "在线教育公司课后口语作业批改效率低",
            "opportunity_analysis": json.dumps({
                "relevance_score": 85,
                "opportunity": "用Claude 4构建AI口语作业批改系统，释放教师80%批改时间",
                "value_analysis": "你的教师每天花3小时批改50+学生口语作业。Claude 4的百万token上下文窗口可以一次性分析一个班级所有学生的口语录音转文本，提供多维度评分和个性化反馈。批改时间可从3小时缩短到30分钟。",
                "application_method": "学生提交口语录音→语音转文本→Claude 4按评分标准批改并生成个性化反馈→教师审核后发送给学生",
                "quick_test_steps": ["收集10份学生口语录音并转为文字", "设计口语评分prompt模板", "用Claude 4 API测试批改效果", "与教师人工批改结果对比准确率"],
                "verification_prompt": "我是一家K12英语培训机构的负责人，老师每天花3小时批改50+学生的口语作业。我想用AI来辅助批改。请帮我：\n1. 设计一个英语口语作业AI批改系统的prompt模板，评分维度包括：发音准确度、语法正确性、表达流畅度、词汇丰富度，每项1-10分\n2. 用下面这段学生口语转写文本做一次完整的批改示范：\n   \"Yesterday I go to the park with my friend. We plays football and have a good time. The weather is very good, sun is shining. I am very happy because we winned the game.\"\n3. 生成个性化的学习建议和改进练习（适合小学5年级水平）\n4. 写一个批量批改的Python脚本框架：读取学生口语文本列表→逐个调用Claude API批改→生成每位学生的评分报告→汇总班级整体分析"
            }, ensure_ascii=False),
            "similarity_score": 0.75, "status": "new",
        },
    ]
    for d in demos:
        db.add(OpportunityMatch(**d))
    db.commit()
    print(f"[auto_seed] Seeded {len(demos)} opportunities")


def _seed_favorites(db: Session):
    favs = [
        {"user_id": "demo_user", "item_type": "article", "item_id": 1},
        {"user_id": "demo_user", "item_type": "article", "item_id": 2},
        {"user_id": "demo_user", "item_type": "article", "item_id": 3},
        {"user_id": "demo_user", "item_type": "article", "item_id": 5},
        {"user_id": "demo_user", "item_type": "article", "item_id": 7},
        {"user_id": "demo_user", "item_type": "opportunity", "item_id": 1},
        {"user_id": "demo_user", "item_type": "opportunity", "item_id": 2},
    ]
    for f in favs:
        db.add(Favorite(**f))
    db.commit()
    print(f"[auto_seed] Seeded {len(favs)} favorites")
