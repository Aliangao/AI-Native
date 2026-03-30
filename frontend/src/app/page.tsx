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
          AI Native 工作台
        </h1>
        <p className="text-gray-500 mt-1">
          让每个人都成为AI时代的超级个体
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="前沿速递"
          subtitle="今日AI动态"
          value={articles.length}
          color="blue"
          icon="📰"
          description="全网AI资讯自动采集、智能摘要、中英翻译"
        />
        <StatCard
          title="工具雷达"
          subtitle="覆盖热门工具"
          value="50+"
          color="green"
          icon="🛠️"
          description="一键获取使用指南、场景分析、快速注册"
        />
        <StatCard
          title="智能参谋"
          subtitle="发现的机遇"
          value={opportunities.length}
          color="orange"
          icon="🎯"
          description="AI主动匹配新技术与你的业务场景"
        />
      </div>

      {/* Latest Articles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          最新AI动态
        </h2>
        {articles.length > 0 ? (
          <div className="space-y-3">
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
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {a.source}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{a.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {"⭐".repeat(a.importance || 1)}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            暂无资讯，点击"前沿速递"手动采集
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          工作台如何帮你
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FlowCard
            step="1"
            title="前沿速递"
            items={[
              "全网AI资讯自动采集",
              "AI摘要 + 一键中英翻译",
              "收藏关注持续追踪",
            ]}
          />
          <FlowCard
            step="2"
            title="工具雷达"
            items={[
              "搜索即出结构化分析",
              "自动生成使用指南和场景",
              "一键注册快速体验",
            ]}
          />
          <FlowCard
            step="3"
            title="智能参谋"
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
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
  };
  return (
    <div className={`rounded-xl border p-6 ${colorMap[color] || ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mt-3">{title}</h3>
      <p className="text-sm text-gray-600">{subtitle}</p>
      <p className="text-xs text-gray-400 mt-2">{description}</p>
    </div>
  );
}

function FlowCard({
  step,
  title,
  items,
}: {
  step: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
          {step}
        </span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">-</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
