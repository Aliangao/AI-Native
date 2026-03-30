"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const USER_ID = "demo_user";

interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  summary_zh: string | null;
  importance: number;
  published_at: string | null;
  created_at: string | null;
}

const CATEGORIES = [
  { key: "", label: "全部" },
  { key: "model_update", label: "模型更新" },
  { key: "tool_release", label: "工具发布" },
  { key: "research", label: "研究进展" },
  { key: "industry", label: "行业动态" },
];

export default function DigestPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState<number[]>([]);

  useEffect(() => {
    fetchArticles();
    fetchFavIds();
  }, [category]);

  useEffect(() => {
    fetchTopArticles();
  }, []);

  async function fetchTopArticles() {
    try {
      const res = await fetch(`${API_BASE}/api/digest/top?limit=5`);
      if (res.ok) setTopArticles(await res.json());
    } catch (e) {
      console.error("Failed to fetch top articles:", e);
    }
  }

  async function fetchArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (category) params.set("category", category);
      const res = await fetch(`${API_BASE}/api/digest/articles?${params}`);
      if (res.ok) setArticles(await res.json());
    } catch (e) {
      console.error("Failed to fetch articles:", e);
    }
    setLoading(false);
  }

  async function fetchFavIds() {
    try {
      const res = await fetch(
        `${API_BASE}/api/favorites/ids/${USER_ID}?item_type=article`
      );
      if (res.ok) setFavIds(await res.json());
    } catch {}
  }

  async function triggerCollection() {
    try {
      const res = await fetch(`${API_BASE}/api/digest/collect`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchArticles();
        fetchTopArticles();
      }
    } catch {
      alert("采集失败，请检查后端服务");
    }
  }

  async function toggleFavorite(articleId: number) {
    const isFaved = favIds.includes(articleId);
    try {
      if (isFaved) {
        await fetch(
          `${API_BASE}/api/favorites/remove?user_id=${USER_ID}&item_type=article&item_id=${articleId}`,
          { method: "DELETE" }
        );
        setFavIds((ids) => ids.filter((id) => id !== articleId));
      } else {
        await fetch(`${API_BASE}/api/favorites/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: USER_ID,
            item_type: "article",
            item_id: articleId,
          }),
        });
        setFavIds((ids) => [...ids, articleId]);
      }
    } catch {}
  }

  async function translateArticle(articleId: number) {
    try {
      const res = await fetch(
        `${API_BASE}/api/digest/translate/${articleId}`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        const update = (a: Article) =>
          a.id === articleId ? { ...a, summary_zh: data.summary_zh } : a;
        setArticles((prev) => prev.map(update));
        setTopArticles((prev) => prev.map(update));
      }
    } catch {
      alert("翻译失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">前沿速递</h1>
          <p className="text-gray-500 mt-1">
            全网AI资讯自动采集，一键翻译，收藏追踪
          </p>
        </div>
        <button
          onClick={triggerCollection}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          手动采集
        </button>
      </div>

      {/* Today's Top 5 */}
      {topArticles.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏆</span>
            <h2 className="text-lg font-bold text-gray-900">今日精选</h2>
            <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
              TOP {topArticles.length}
            </span>
          </div>
          <div className="space-y-3">
            {topArticles.map((article, index) => (
              <div
                key={article.id}
                className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-xl p-4 hover:bg-white transition-colors"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    index === 0
                      ? "bg-yellow-400 text-white"
                      : index === 1
                        ? "bg-gray-300 text-white"
                        : index === 2
                          ? "bg-orange-300 text-white"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryBadge category={article.category} />
                    <span className="text-xs text-gray-400">
                      {article.source}
                    </span>
                    <span className="text-xs text-gray-300">
                      {"⭐".repeat(article.importance)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {article.url ? (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors"
                      >
                        {article.title}
                      </a>
                    ) : (
                      article.title
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => toggleFavorite(article.id)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      favIds.includes(article.id)
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-400 hover:text-yellow-600"
                    }`}
                  >
                    {favIds.includes(article.id) ? "⭐" : "☆"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">全部资讯</span>
        <div className="h-4 w-px bg-gray-300" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isFavorited={favIds.includes(article.id)}
              onToggleFavorite={() => toggleFavorite(article.id)}
              onTranslate={() => translateArticle(article.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">暂无资讯</p>
          <p className="text-sm text-gray-300 mt-2">
            点击&quot;手动采集&quot;获取最新AI资讯
          </p>
        </div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    model_update: "模型更新",
    tool_release: "工具发布",
    research: "研究进展",
    industry: "行业动态",
  };
  const colors: Record<string, string> = {
    model_update: "bg-purple-100 text-purple-700",
    tool_release: "bg-green-100 text-green-700",
    research: "bg-blue-100 text-blue-700",
    industry: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors[category] || "bg-gray-100 text-gray-600"}`}
    >
      {labels[category] || category}
    </span>
  );
}

function ArticleCard({
  article,
  isFavorited,
  onToggleFavorite,
  onTranslate,
}: {
  article: Article;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onTranslate: () => void;
}) {
  const [translating, setTranslating] = useState(false);

  async function handleTranslate() {
    setTranslating(true);
    await onTranslate();
    setTranslating(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={article.category} />
            <span className="text-xs text-gray-400">{article.source}</span>
            <span className="text-xs text-gray-300">
              {"⭐".repeat(article.importance)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                {article.title}
              </a>
            ) : (
              article.title
            )}
          </h3>
          <p className="text-sm text-gray-600 mt-2">{article.summary}</p>

          {/* Chinese translation */}
          {article.summary_zh && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-500 font-medium mb-1">
                中文翻译
              </p>
              <p className="text-sm text-gray-700">{article.summary_zh}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onToggleFavorite}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              isFavorited
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            }`}
            title={isFavorited ? "取消收藏" : "收藏"}
          >
            {isFavorited ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          {!article.summary_zh && (
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="px-2 py-1 rounded text-xs bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="翻译为中文"
            >
              {translating ? "翻译中..." : "🌐 翻译"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
