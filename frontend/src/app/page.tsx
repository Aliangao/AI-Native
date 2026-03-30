import Link from "next/link";

// Server component: need full URL for SSR fetch; rewrites only work client-side
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getStats() {
  try {
    const [articlesRes, opportunitiesRes] = await Promise.all([
      fetch(`${API_BASE}/api/digest/articles?limit=5`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/business/opportunities/demo_user`, {
        cache: "no-store",
      }),
    ]);
    const articles = articlesRes.ok ? await articlesRes.json() : [];
    const opportunities = opportunitiesRes.ok
      ? await opportunitiesRes.json()
      : [];
    return { articles, opportunities };
  } catch {
    return { articles: [], opportunities: [] };
  }
}

export default async function Dashboard() {
  const { articles, opportunities } = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          OneAI 工作台
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          让每个人都成为AI时代的超级个体
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/digest" className="block">
          <StatCard
            title="前沿速递"
            subtitle="今日AI动态"
            value={articles.length}
            color="blue"
            icon="📰"
            description="全网AI资讯自动采集、智能摘要、中英翻译"
          />
        </Link>
        <Link href="/tools" className="block">
          <StatCard
            title="工具雷达"
            subtitle="覆盖热门工具"
            value="50+"
            color="green"
            icon="🛠️"
            description="一键获取使用指南、场景分析、快速注册"
          />
        </Link>
        <Link href="/business" className="block">
          <StatCard
            title="智能参谋"
            subtitle="发现的机遇"
            value={opportunities.length}
            color="orange"
            icon="🎯"
            description="AI主动匹配新技术与你的业务场景"
          />
        </Link>
      </div>

      {/* Latest Articles */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最新AI动态</h2>
          <Link
            href="/digest"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部 →
          </Link>
        </div>
        {articles.length > 0 ? (
          <div className="space-y-2">
            {articles.map(
              (
                a: {
                  id: number;
                  title: string;
                  source: string;
                  summary: string;
                  importance: number;
                },
                i: number
              ) => (
                <div
                  key={a.id || i}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-default"
                >
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium shrink-0">
                    {a.source}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.summary}</p>
                  </div>
                  <span className="text-xs text-amber-400 shrink-0">
                    {"★".repeat(a.importance || 1)}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-gray-300 text-sm py-6 text-center">
            暂无资讯，点击"前沿速递"手动采集
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          工作台如何帮你
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FlowCard
            step="1"
            title="前沿速递"
            color="blue"
            items={[
              "全网AI资讯自动采集",
              "AI摘要 + 一键中英翻译",
              "收藏关注持续追踪",
            ]}
          />
          <FlowCard
            step="2"
            title="工具雷达"
            color="green"
            items={[
              "搜索即出结构化分析",
              "自动生成使用指南和场景",
              "一键注册快速体验",
            ]}
          />
          <FlowCard
            step="3"
            title="智能参谋"
            color="orange"
            items={[
              "录入你的业务场景",
              "新技术自动匹配业务机遇",
              "越用越懂你的需求",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  subtitle,
  value,
  color,
  icon,
  description,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  color: string;
  icon: string;
  description: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; accent: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", accent: "text-blue-600" },
    green: { bg: "bg-green-50", border: "border-green-100", accent: "text-green-600" },
    orange: { bg: "bg-orange-50", border: "border-orange-100", accent: "text-orange-600" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 card-hover cursor-pointer`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-bold ${c.accent}`}>{value}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mt-3">{title}</h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
      <p className="text-xs text-gray-400 mt-2">{description}</p>
    </div>
  );
}

function FlowCard({
  step,
  title,
  color,
  items,
}: {
  step: string;
  title: string;
  color: string;
  items: string[];
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    orange: "bg-orange-500",
  };

  return (
    <div className="space-y-3 bg-gray-50 rounded-xl p-5">
      <div className="flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-lg ${colorMap[color] || "bg-blue-600"} text-white text-xs flex items-center justify-center font-bold`}>
          {step}
        </span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
