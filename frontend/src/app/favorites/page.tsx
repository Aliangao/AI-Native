"use client";

import { useState, useEffect } from "react";

const API_BASE = "";
const USER_ID = "demo_user";

interface FavoriteItem {
  id: number;
  item_type: string;
  item_id: number;
  note: string | null;
  created_at: string | null;
  detail?: {
    title?: string;
    summary?: string;
    source?: string;
    url?: string;
    ai_capability?: string;
    opportunity_analysis?: string;
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [filter]);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("item_type", filter);
      const res = await fetch(
        `${API_BASE}/api/favorites/list/${USER_ID}?${params}`
      );
      if (res.ok) setFavorites(await res.json());
    } catch (e) {
      console.error("Failed to fetch favorites:", e);
    }
    setLoading(false);
  }

  async function removeFavorite(fav: FavoriteItem) {
    try {
      await fetch(
        `${API_BASE}/api/favorites/remove?user_id=${USER_ID}&item_type=${fav.item_type}&item_id=${fav.item_id}`,
        { method: "DELETE" }
      );
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
    } catch {}
  }

  function parseAnalysis(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return { opportunity: str };
    }
  }

  const typeLabels: Record<string, string> = {
    article: "资讯",
    opportunity: "机遇",
    tool: "工具",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的关注</h1>
        <p className="text-gray-500 mt-1">
          收藏的内容会帮助系统更好地理解你的兴趣，提供更精准的匹配
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: "", label: "全部" },
          { key: "article", label: "资讯" },
          { key: "opportunity", label: "机遇" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Favorites list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      {typeLabels[fav.item_type] || fav.item_type}
                    </span>
                    {fav.created_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(fav.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </div>

                  {fav.item_type === "article" && fav.detail && (
                    <>
                      <h3 className="font-semibold text-gray-900">
                        {fav.detail.url ? (
                          <a
                            href={fav.detail.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600"
                          >
                            {fav.detail.title}
                          </a>
                        ) : (
                          fav.detail.title
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {fav.detail.summary}
                      </p>
                    </>
                  )}

                  {fav.item_type === "opportunity" && fav.detail && (
                    <>
                      {(() => {
                        const analysis = fav.detail.opportunity_analysis
                          ? parseAnalysis(fav.detail.opportunity_analysis)
                          : {};
                        return (
                          <>
                            <h3 className="font-semibold text-gray-900">
                              {analysis.opportunity || "AI机遇"}
                            </h3>
                            {analysis.value_analysis && (
                              <p className="text-sm text-gray-600 mt-1">
                                {analysis.value_analysis.slice(0, 200)}...
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>

                <button
                  onClick={() => removeFavorite(fav)}
                  className="px-2 py-1 rounded text-xs bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                >
                  取消关注
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-5xl mb-4">⭐</p>
          <p className="text-gray-400">
            在"前沿速递"和"智能参谋"中收藏感兴趣的内容
          </p>
          <p className="text-sm text-gray-300 mt-2">
            你的关注会帮助系统更精准地为你匹配信息
          </p>
        </div>
      )}
    </div>
  );
}
