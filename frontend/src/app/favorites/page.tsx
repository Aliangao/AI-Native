"use client";

import { useState, useEffect } from "react";
import { useToast } from "../components/Toast";

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
  const [removingId, setRemovingId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchFavorites(); }, [filter]);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("item_type", filter);
      const res = await fetch(`${API_BASE}/api/favorites/list/${USER_ID}?${params}`);
      if (res.ok) setFavorites(await res.json());
    } catch (e) { console.error("Failed to fetch favorites:", e); }
    setLoading(false);
  }

  async function removeFavorite(fav: FavoriteItem) {
    setRemovingId(fav.id);
    try {
      await fetch(`${API_BASE}/api/favorites/remove?user_id=${USER_ID}&item_type=${fav.item_type}&item_id=${fav.item_id}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
      toast("已取消关注", "info");
    } catch {
      toast("操作失败", "error");
    }
    setRemovingId(null);
  }

  function parseAnalysis(str: string) {
    try { return JSON.parse(str); } catch { return { opportunity: str }; }
  }

  const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
    article: { label: "资讯", color: "bg-blue-50 text-blue-600", icon: "📰" },
    opportunity: { label: "机遇", color: "bg-orange-50 text-orange-600", icon: "🎯" },
    tool: { label: "工具", color: "bg-green-50 text-green-600", icon: "🛠️" },
  };

  const filters = [
    { key: "", label: "全部", count: favorites.length },
    { key: "article", label: "资讯" },
    { key: "opportunity", label: "机遇" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的关注</h1>
        <p className="text-gray-400 mt-1 text-sm">收藏的内容会帮助系统更好地理解你的兴趣，提供更精准的匹配</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
              filter === f.key
                ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Favorites list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className="skeleton h-5 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => {
            const tc = typeConfig[fav.item_type] || typeConfig.article;
            return (
              <div
                key={fav.id}
                className={`bg-white rounded-2xl border border-gray-100 p-5 card-hover transition-all ${removingId === fav.id ? "opacity-50 scale-98" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${tc.color}`}>
                        {tc.icon} {tc.label}
                      </span>
                      {fav.created_at && (
                        <span className="text-[11px] text-gray-300">
                          {new Date(fav.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                    </div>

                    {fav.item_type === "article" && fav.detail && (
                      <>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {fav.detail.url ? (
                            <a href={fav.detail.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                              {fav.detail.title}
                            </a>
                          ) : fav.detail.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{fav.detail.summary}</p>
                        {fav.detail.source && <p className="text-xs text-gray-300 mt-1.5">来源: {fav.detail.source}</p>}
                      </>
                    )}

                    {fav.item_type === "opportunity" && fav.detail && (() => {
                      const analysis = fav.detail.opportunity_analysis ? parseAnalysis(fav.detail.opportunity_analysis) : {};
                      return (
                        <>
                          <h3 className="font-semibold text-gray-900 text-sm">{analysis.opportunity || "AI机遇"}</h3>
                          {analysis.value_analysis && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{analysis.value_analysis}</p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => removeFavorite(fav)}
                    disabled={removingId === fav.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all btn-press shrink-0 font-medium disabled:opacity-50"
                  >
                    {removingId === fav.id ? "移除中..." : "取消关注"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-gray-400">在"前沿速递"和"智能参谋"中收藏感兴趣的内容</p>
          <p className="text-sm text-gray-300 mt-1">你的关注会帮助系统更精准地为你匹配信息</p>
        </div>
      )}
    </div>
  );
}
