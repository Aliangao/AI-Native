"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "../components/Toast";

const API_BASE = "";
const CACHE_KEY = "tools_cache";
const HISTORY_KEY = "tools_history";
const MAX_HISTORY = 8;
const USER_ID = "demo_user";

interface ToolInfo {
  name: string;
  description: string;
  category: string;
  official_url?: string;
  pricing?: string;
  features: string[] | string;
  getting_started?: string;
  getting_started_url?: string;
  similar_tools: string[] | string;
  verdict?: string;
}

interface ToolGuide {
  tool_name: string;
  overview: string;
  use_cases: Array<{ scenario: string; description: string }>;
  setup_steps: Array<{ step: number; title: string; detail: string }>;
  tips: string[];
  pricing?: string;
  registration_url?: string;
  supports_google_login?: boolean;
}

interface RegisterInfo {
  tool_name: string;
  registration_url?: string;
  supports_google_login?: boolean;
  supports_github_login?: boolean;
  registration_steps: Array<{ step: number; action: string; detail?: string }>;
  free_tier?: string;
  estimated_time?: string;
  auto_register_possible?: boolean;
  auto_register_method?: string;
}

interface CachedResult {
  tool: ToolInfo | null;
  guide: ToolGuide | null;
  register: RegisterInfo | null;
  timestamp: number;
}

interface ToolCache {
  [toolName: string]: CachedResult;
}

function loadCache(): ToolCache {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache: ToolCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}
function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function addToHistory(name: string) {
  const history = loadHistory().filter((h) => h.toLowerCase() !== name.toLowerCase());
  history.unshift(name);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); } catch {}
}
function removeFromHistory(name: string) {
  const history = loadHistory().filter((h) => h !== name);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

function ToolsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const initialQuery = searchParams.get("name") || "";

  const [query, setQuery] = useState(initialQuery);
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [guide, setGuide] = useState<ToolGuide | null>(null);
  const [registerInfo, setRegisterInfo] = useState<RegisterInfo | null>(null);
  const [searching, setSearching] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "guide" | "register">("overview");
  const [history, setHistory] = useState<string[]>([]);
  const [serverHistory, setServerHistory] = useState<Array<{ id: number; tool_name: string; tool_data: Record<string, unknown> | null; searched_at: string | null }>>([]);
  const [matchResult, setMatchResult] = useState<{ matches: Array<Record<string, unknown>>; message: string } | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    // Load server-side history
    fetch(`${API_BASE}/api/tools/history/${USER_ID}`).then(r => r.ok ? r.json() : []).then(setServerHistory).catch(() => {});
  }, []);

  const searchTool = useCallback(
    async (toolName: string, forceRefresh = false) => {
      if (!toolName.trim()) return;
      setActiveTab("overview");
      router.replace(`/tools?name=${encodeURIComponent(toolName)}`, { scroll: false });

      const cacheKey = toolName.toLowerCase();
      const cache = loadCache();
      const cached = cache[cacheKey];
      const CACHE_TTL = 30 * 60 * 1000;

      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setTool(cached.tool);
        setGuide(cached.guide);
        setRegisterInfo(cached.register);
        setSearching(false);
        setGuideLoading(false);
        setRegisterLoading(false);
        addToHistory(toolName);
        setHistory(loadHistory());
        return;
      }

      setSearching(true);
      setTool(null);
      setGuide(null);
      setRegisterInfo(null);
      setGuideLoading(true);
      setRegisterLoading(true);

      const newCached: CachedResult = { tool: null, guide: null, register: null, timestamp: Date.now() };

      const searchPromise = fetch(`${API_BASE}/api/tools/search?name=${encodeURIComponent(toolName)}`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const guidePromise = fetch(`${API_BASE}/api/tools/guide?name=${encodeURIComponent(toolName)}`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const registerPromise = fetch(`${API_BASE}/api/tools/auto-register?name=${encodeURIComponent(toolName)}`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);

      searchPromise.then((data) => {
        if (data) { setTool(data); newCached.tool = data; toast(`已找到 ${data.name || toolName}`, "success"); }
        setSearching(false);
        const c = loadCache(); c[cacheKey] = { ...newCached }; saveCache(c);
      });

      guidePromise.then((data) => {
        if (data) { setGuide(data); newCached.guide = data; }
        setGuideLoading(false);
        const c = loadCache(); c[cacheKey] = { ...newCached }; saveCache(c);
      });

      registerPromise.then((data) => {
        if (data) { setRegisterInfo(data); newCached.register = data; }
        setRegisterLoading(false);
        const c = loadCache(); c[cacheKey] = { ...newCached }; saveCache(c);
      });

      addToHistory(toolName);
      setHistory(loadHistory());
      setMatchResult(null);

      // Save to server after all promises resolve
      Promise.all([searchPromise, guidePromise, registerPromise]).then(([t, g, r]) => {
        const toolData = { tool: t, guide: g, register: r };
        fetch(`${API_BASE}/api/tools/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: USER_ID, tool_name: toolName, tool_data: toolData }),
        }).then(() => {
          // Refresh server history
          fetch(`${API_BASE}/api/tools/history/${USER_ID}`).then(r2 => r2.ok ? r2.json() : []).then(setServerHistory).catch(() => {});
        }).catch(() => {});
      });
    },
    [router, toast]
  );

  async function matchMyBusiness() {
    if (!tool) return;
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/business/match-tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          tool_name: tool.name,
          tool_description: tool.description,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatchResult(data);
        if (data.matches?.length > 0) {
          toast(`找到 ${data.matches.length} 条业务匹配`, "success");
        } else {
          toast(data.message || "暂无匹配", "info");
        }
      }
    } catch {
      toast("匹配失败", "error");
    }
    setMatching(false);
  }

  useEffect(() => {
    const target = initialQuery || loadHistory()[0] || "";
    if (target) { setQuery(target); searchTool(target); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const features = Array.isArray(tool?.features) ? tool.features : tool?.features ? [tool.features] : [];
  const similar = Array.isArray(tool?.similar_tools) ? tool.similar_tools : tool?.similar_tools ? [tool.similar_tools] : [];

  const tabs = [
    { key: "overview" as const, label: "概览", loading: searching },
    { key: "guide" as const, label: "使用指南", loading: guideLoading },
    { key: "register" as const, label: "快速注册", loading: registerLoading },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">工具雷达</h1>
        <p className="text-gray-400 mt-1 text-sm">搜索AI工具，获取使用指南、场景分析、一键注册</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchTool(query)}
          placeholder="输入AI工具名称，如 Cursor、Midjourney、Suno..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none text-sm bg-white"
        />
        <button
          onClick={() => searchTool(query)}
          disabled={searching}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-60 btn-press flex items-center gap-2 min-w-[100px] justify-center"
        >
          {searching ? (
            <>
              <span className="spinner" />
              搜索中
            </>
          ) : "搜索"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && !tool && !searching && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-300 font-medium">搜索历史</span>
            <button
              onClick={() => { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(CACHE_KEY); setHistory([]); }}
              className="text-xs text-gray-300 hover:text-red-400 transition-colors"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <div key={item} className="flex items-center gap-0.5 bg-white rounded-full pl-3 pr-1.5 py-1.5 group border border-gray-100">
                <button onClick={() => { setQuery(item); searchTool(item); }} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  {item}
                </button>
                <button
                  onClick={() => { removeFromHistory(item); setHistory(loadHistory()); }}
                  className="w-4 h-4 rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs ml-1 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool info card */}
      {(tool || searching) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Header */}
          {searching && !tool ? (
            <div className="bg-green-50 p-6 border-b border-green-100">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-6 w-40" />
                  <div className="skeleton h-4 w-64" />
                </div>
              </div>
            </div>
          ) : tool ? (
            <div className="bg-green-50 p-6 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
                    <span className="text-xs text-green-600 bg-green-100 px-2.5 py-0.5 rounded-lg font-medium">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">{tool.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => searchTool(tool.name, true)}
                    className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-white transition-colors btn-press"
                  >
                    刷新
                  </button>
                  {(tool.getting_started_url || tool.official_url) && (
                    <a
                      href={tool.getting_started_url || tool.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition-colors btn-press"
                    >
                      前往体验 →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3.5 text-sm font-medium transition-all relative ${
                  activeTab === tab.key
                    ? "text-green-700"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {tab.loading && (
                  <span className="ml-1.5 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {searching && !tool ? (
                  <div className="space-y-4">
                    <div className="skeleton h-20 w-full" />
                    <div className="skeleton h-16 w-full" />
                    <div className="skeleton h-16 w-3/4" />
                  </div>
                ) : tool ? (
                  <>
                    {(tool.official_url || tool.pricing) && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 text-sm">基本信息</h3>
                        {tool.official_url && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-gray-700">官网：</span>
                            <a href={tool.official_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {tool.official_url}
                            </a>
                          </p>
                        )}
                        {tool.pricing && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-gray-700">定价：</span>{tool.pricing}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">核心功能</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600 bg-gray-50 rounded-xl p-3.5">
                            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {tool.getting_started && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">快速上手</h3>
                        <p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-4 border border-blue-100">{tool.getting_started}</p>
                      </div>
                    )}
                    {similar.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">类似工具</h3>
                        <div className="flex gap-2 flex-wrap">
                          {similar.map((s, i) => (
                            <button key={i} onClick={() => { setQuery(s); searchTool(s); }}
                              className="px-3.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-green-50 hover:text-green-600 transition-colors btn-press border border-gray-100">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {tool.verdict && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-800">
                          <span className="font-semibold">AI 点评：</span>{tool.verdict}
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Guide Tab */}
            {activeTab === "guide" && (
              <div className="space-y-6 animate-fade-in">
                {guideLoading ? (
                  <div className="space-y-4">
                    <div className="skeleton h-5 w-full" />
                    <div className="skeleton h-5 w-4/5" />
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="skeleton w-7 h-7 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-32" />
                          <div className="skeleton h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : guide ? (
                  <>
                    <p className="text-gray-600 text-sm leading-relaxed">{guide.overview}</p>
                    {guide.use_cases?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">适用场景</h3>
                        <div className="space-y-2">
                          {guide.use_cases.map((uc, i) => (
                            <div key={i} className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                              <p className="font-medium text-blue-900 text-sm">{uc.scenario}</p>
                              <p className="text-sm text-blue-700 mt-1">{uc.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {guide.setup_steps?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">详细步骤</h3>
                        <div className="space-y-3">
                          {guide.setup_steps.map((s, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="w-7 h-7 rounded-lg bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                                {s.step || i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{s.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {guide.tips?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">使用技巧</h3>
                        <ul className="space-y-1.5">
                          {guide.tips.map((t, i) => (
                            <li key={i} className="text-sm text-gray-600 flex gap-2 bg-amber-50 rounded-lg p-3">
                              <span className="text-amber-500 shrink-0">💡</span>{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Register Tab */}
            {activeTab === "register" && (
              <div className="space-y-6 animate-fade-in">
                {registerLoading ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => (<div key={i} className="skeleton h-8 w-28 rounded-full" />))}
                    </div>
                    <div className="skeleton h-12 w-40 rounded-xl" />
                    <div className="skeleton h-24 w-full" />
                  </div>
                ) : registerInfo ? (
                  <>
                    <div className="flex gap-2.5 flex-wrap">
                      {registerInfo.supports_google_login && (
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">✓ Google 登录</span>
                      )}
                      {registerInfo.supports_github_login && (
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium">✓ GitHub 登录</span>
                      )}
                      {registerInfo.free_tier && (
                        <span className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium">{registerInfo.free_tier}</span>
                      )}
                      {registerInfo.estimated_time && (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium">⏱ {registerInfo.estimated_time}</span>
                      )}
                    </div>
                    {registerInfo.registration_url && (
                      <a href={registerInfo.registration_url} target="_blank" rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium btn-press transition-colors">
                        前往注册页面 →
                      </a>
                    )}
                    {registerInfo.registration_steps?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">注册步骤</h3>
                        <div className="space-y-3">
                          {registerInfo.registration_steps.map((s, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="w-7 h-7 rounded-lg bg-orange-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                                {s.step || i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{s.action}</p>
                                {s.detail && <p className="text-sm text-gray-500 mt-1">{s.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {registerInfo.auto_register_method && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-green-800 mb-1">快速注册方式</p>
                        <p className="text-sm text-green-700">{registerInfo.auto_register_method}</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match my business - shown after tool loaded */}
      {tool && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">🎯 这个工具跟我有什么关系？</h3>
              <p className="text-xs text-gray-400 mt-0.5">基于你的业务画像，自动匹配 {tool.name} 的应用机会</p>
            </div>
            <button
              onClick={matchMyBusiness}
              disabled={matching}
              className="px-5 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all text-sm font-medium disabled:opacity-60 btn-press flex items-center gap-2"
            >
              {matching ? (
                <><span className="spinner" />匹配中...</>
              ) : "匹配我的业务"}
            </button>
          </div>
          {matchResult && (
            <div className="p-6 animate-fade-in">
              {matchResult.matches.length > 0 ? (
                <div className="space-y-3">
                  {matchResult.matches.map((m: Record<string, unknown>, i: number) => {
                    const analysis = (() => { try { return JSON.parse(m.opportunity_analysis as string); } catch { return { opportunity: m.opportunity_analysis }; } })();
                    return (
                      <div key={i} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{analysis.opportunity}</h4>
                          {analysis.relevance_score && (
                            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-lg">{analysis.relevance_score}%</span>
                          )}
                        </div>
                        {analysis.value_analysis && <p className="text-sm text-gray-500 leading-relaxed">{analysis.value_analysis}</p>}
                        {analysis.application_method && (
                          <p className="text-sm text-blue-600 mt-2 bg-blue-50 rounded-lg p-3 border border-blue-100">{analysis.application_method}</p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => router.push("/business")}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    查看全部机遇 →
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">{matchResult.message}</p>
                  <button
                    onClick={() => router.push("/business")}
                    className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    去录入业务信息 →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Server-side search history — shown when no active search */}
      {!tool && !searching && serverHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">历史探索记录</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {serverHistory.map((item) => {
              const td = item.tool_data as Record<string, Record<string, string>> | null;
              const desc = td?.tool?.description || "";
              const cat = td?.tool?.category || "";
              return (
                <button
                  key={item.id}
                  onClick={() => { setQuery(item.tool_name); searchTool(item.tool_name); }}
                  className="bg-white rounded-xl border border-gray-100 p-4 text-left card-hover transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">{item.tool_name}</span>
                    {cat && <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{cat}</span>}
                  </div>
                  {desc && <p className="text-xs text-gray-400 line-clamp-2">{desc}</p>}
                  {item.searched_at && (
                    <p className="text-[10px] text-gray-300 mt-2">{new Date(item.searched_at).toLocaleDateString("zh-CN")}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state — no history at all */}
      {!tool && !searching && serverHistory.length === 0 && history.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-400">搜索任意AI工具，获取使用指南和注册引导</p>
        </div>
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    }>
      <ToolsPageContent />
    </Suspense>
  );
}
