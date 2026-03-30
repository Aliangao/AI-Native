"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const CACHE_KEY = "tools_cache";
const HISTORY_KEY = "tools_history";
const MAX_HISTORY = 8;

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

// localStorage helpers
function loadCache(): ToolCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: ToolCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function addToHistory(name: string) {
  const history = loadHistory().filter((h) => h.toLowerCase() !== name.toLowerCase());
  history.unshift(name);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

function removeFromHistory(name: string) {
  const history = loadHistory().filter((h) => h !== name);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

function ToolsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const searchTool = useCallback(
    async (toolName: string, forceRefresh = false) => {
      if (!toolName.trim()) return;
      setActiveTab("overview");
      router.replace(`/tools?name=${encodeURIComponent(toolName)}`, { scroll: false });

      // Check cache first (unless force refresh)
      const cacheKey = toolName.toLowerCase();
      const cache = loadCache();
      const cached = cache[cacheKey];
      const CACHE_TTL = 30 * 60 * 1000; // 30 min

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

      // Fresh fetch
      setSearching(true);
      setTool(null);
      setGuide(null);
      setRegisterInfo(null);
      setGuideLoading(true);
      setRegisterLoading(true);

      const newCached: CachedResult = { tool: null, guide: null, register: null, timestamp: Date.now() };

      const searchPromise = fetch(`${API_BASE}/api/tools/search?name=${encodeURIComponent(toolName)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const guidePromise = fetch(`${API_BASE}/api/tools/guide?name=${encodeURIComponent(toolName)}`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const registerPromise = fetch(`${API_BASE}/api/tools/auto-register?name=${encodeURIComponent(toolName)}`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      searchPromise.then((data) => {
        if (data) { setTool(data); newCached.tool = data; }
        setSearching(false);
        // Save partial cache
        const c = loadCache();
        c[cacheKey] = { ...newCached };
        saveCache(c);
      });

      guidePromise.then((data) => {
        if (data) { setGuide(data); newCached.guide = data; }
        setGuideLoading(false);
        const c = loadCache();
        c[cacheKey] = { ...newCached };
        saveCache(c);
      });

      registerPromise.then((data) => {
        if (data) { setRegisterInfo(data); newCached.register = data; }
        setRegisterLoading(false);
        const c = loadCache();
        c[cacheKey] = { ...newCached };
        saveCache(c);
      });

      addToHistory(toolName);
      setHistory(loadHistory());
    },
    [router]
  );

  // Auto-search on mount: use URL param, or restore last search from history
  useEffect(() => {
    const target = initialQuery || loadHistory()[0] || "";
    if (target) {
      setQuery(target);
      searchTool(target);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const features = Array.isArray(tool?.features) ? tool.features : tool?.features ? [tool.features] : [];
  const similar = Array.isArray(tool?.similar_tools) ? tool.similar_tools : tool?.similar_tools ? [tool.similar_tools] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">工具雷达</h1>
        <p className="text-gray-500 mt-1">搜索AI工具，获取使用指南、场景分析、一键注册</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchTool(query)}
          placeholder="输入AI工具名称，如 Cursor、Midjourney、Suno..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
        />
        <button
          onClick={() => searchTool(query)}
          disabled={searching}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
        >
          {searching ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              搜索中
            </>
          ) : "搜索"}
        </button>
      </div>

      {/* Search history */}
      {history.length > 0 && !tool && !searching && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 font-medium">搜索历史</span>
            <button
              onClick={() => {
                localStorage.removeItem(HISTORY_KEY);
                localStorage.removeItem(CACHE_KEY);
                setHistory([]);
              }}
              className="text-xs text-gray-300 hover:text-red-400"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <div key={item} className="flex items-center gap-0.5 bg-gray-100 rounded-full pl-3 pr-1.5 py-1.5 group">
                <button
                  onClick={() => { setQuery(item); searchTool(item); }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {item}
                </button>
                <button
                  onClick={() => { removeFromHistory(item); setHistory(loadHistory()); }}
                  className="w-4 h-4 rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-200 flex items-center justify-center text-xs ml-1"
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          {searching && !tool ? (
            <div className="bg-green-50 p-6 border-b border-green-100">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-green-200 rounded w-40" />
                <div className="h-4 bg-green-100 rounded w-64" />
              </div>
            </div>
          ) : tool ? (
            <div className="bg-green-50 p-6 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
                  <span className="text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {tool.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => searchTool(tool.name, true)}
                    className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    刷新
                  </button>
                  {(tool.getting_started_url || tool.official_url) && (
                    <a
                      href={tool.getting_started_url || tool.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      前往体验
                    </a>
                  )}
                </div>
              </div>
              <p className="text-gray-700 mt-3">{tool.description}</p>
            </div>
          ) : null}

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "overview" ? "text-green-700 border-b-2 border-green-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              概览
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "guide" ? "text-green-700 border-b-2 border-green-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              使用指南
              {guideLoading && <span className="ml-1.5 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "register" ? "text-green-700 border-b-2 border-green-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              快速注册
              {registerLoading && <span className="ml-1.5 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
            </button>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {searching && !tool ? (
                  <SkeletonBlock lines={5} />
                ) : tool ? (
                  <>
                    {(tool.official_url || tool.pricing) && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 text-sm">基本信息</h3>
                        {tool.official_url && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">官网：</span>
                            <a href={tool.official_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {tool.official_url}
                            </a>
                          </p>
                        )}
                        {tool.pricing && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">定价：</span>{tool.pricing}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">核心功能</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                            <span className="text-green-500">-</span>{f}
                          </div>
                        ))}
                      </div>
                    </div>
                    {tool.getting_started && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">快速上手</h3>
                        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-4">{tool.getting_started}</p>
                      </div>
                    )}
                    {similar.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">类似工具</h3>
                        <div className="flex gap-2 flex-wrap">
                          {similar.map((s, i) => (
                            <button key={i} onClick={() => { setQuery(s); searchTool(s); }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {tool.verdict && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
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
              <div className="space-y-6">
                {guideLoading ? (
                  <div className="space-y-6">
                    <SkeletonBlock lines={3} />
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex gap-3">
                          <div className="w-6 h-6 bg-green-200 rounded-full shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32" />
                            <div className="h-3 bg-gray-100 rounded w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : guide ? (
                  <>
                    <p className="text-gray-700">{guide.overview}</p>
                    {guide.use_cases?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">适用场景</h3>
                        <div className="space-y-2">
                          {guide.use_cases.map((uc, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg p-4">
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
                              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                                {s.step || i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{s.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {guide.tips?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">使用技巧</h3>
                        <ul className="space-y-1">
                          {guide.tips.map((t, i) => (
                            <li key={i} className="text-sm text-gray-600 flex gap-2">
                              <span className="text-yellow-500">*</span>{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {guide.pricing && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700"><span className="font-semibold">定价：</span>{guide.pricing}</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Register Tab */}
            {activeTab === "register" && (
              <div className="space-y-6">
                {registerLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse flex gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded-full w-28" />
                      ))}
                    </div>
                    <SkeletonBlock lines={4} />
                  </div>
                ) : registerInfo ? (
                  <>
                    <div className="flex gap-3 flex-wrap">
                      {registerInfo.supports_google_login && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">支持 Google 登录</span>
                      )}
                      {registerInfo.supports_github_login && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">支持 GitHub 登录</span>
                      )}
                      {registerInfo.free_tier && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{registerInfo.free_tier}</span>
                      )}
                      {registerInfo.estimated_time && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">预计 {registerInfo.estimated_time}</span>
                      )}
                    </div>
                    {registerInfo.registration_url && (
                      <a href={registerInfo.registration_url} target="_blank" rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                        前往注册页面
                      </a>
                    )}
                    {registerInfo.registration_steps?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">注册步骤</h3>
                        <div className="space-y-3">
                          {registerInfo.registration_steps.map((s, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                                {s.step || i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{s.action}</p>
                                {s.detail && <p className="text-sm text-gray-600 mt-1">{s.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {registerInfo.auto_register_method && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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

      {/* Empty state with history */}
      {!tool && !searching && (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-400">搜索任意AI工具，获取使用指南和注册引导</p>
          {history.length > 0 && (
            <p className="text-sm text-gray-300 mt-2">点击上方历史记录快速恢复</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">加载中...</div>}>
      <ToolsPageContent />
    </Suspense>
  );
}
