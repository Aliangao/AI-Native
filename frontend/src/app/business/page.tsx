"use client";

import { useState, useEffect } from "react";
import { useToast } from "../components/Toast";

const API_BASE = "";
const USER_ID = "demo_user";

interface BusinessProfile {
  id: number;
  content: string;
  extracted_context: {
    domain?: string;
    core_business?: string;
    current_tools?: string[];
    workflows?: string[];
    pain_points?: string[];
    ai_opportunities?: string[];
  };
  source_type: string;
  created_at: string | null;
}

interface Opportunity {
  id: number;
  ai_capability: string;
  business_need: string;
  opportunity_analysis: string;
  similarity_score: number;
  status: string;
  created_at: string | null;
}

export default function BusinessPage() {
  const [businessText, setBusinessText] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [favIds, setFavIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [activeSection, setActiveSection] = useState<"vault" | "opportunities">("vault");
  const [loading, setLoading] = useState(true);
  const [animatingFav, setAnimatingFav] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchOpportunities(), fetchFavIds(), fetchProfiles()]).then(() => setLoading(false));
  }, []);

  async function fetchProfiles() {
    try {
      const res = await fetch(`${API_BASE}/api/business/profile/${USER_ID}`);
      if (res.ok) setProfiles(await res.json());
    } catch {}
  }

  async function fetchOpportunities() {
    try {
      const res = await fetch(`${API_BASE}/api/business/opportunities/${USER_ID}`);
      if (res.ok) setOpportunities(await res.json());
    } catch (e) { console.error("Failed to fetch opportunities:", e); }
  }

  async function fetchFavIds() {
    try {
      const res = await fetch(`${API_BASE}/api/favorites/ids/${USER_ID}?item_type=opportunity`);
      if (res.ok) setFavIds(await res.json());
    } catch {}
  }

  async function submitBusinessContext() {
    if (!businessText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/business/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, content: businessText }),
      });
      if (res.ok) {
        setSubmitted(true);
        setBusinessText("");
        toast("业务信息已记录，系统将持续为你匹配AI机遇", "success");
        fetchProfiles();
        fetchOpportunities();
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch {
      toast("提交失败，请检查后端服务", "error");
    }
    setSubmitting(false);
  }

  async function deleteProfile(id: number) {
    if (!confirm("确定删除这条业务信息？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/business/context/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        toast("已删除", "info");
      }
    } catch { toast("删除失败", "error"); }
  }

  async function saveEdit(id: number) {
    try {
      const res = await fetch(`${API_BASE}/api/business/context/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extracted_context: editData }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchProfiles();
        toast("校准已保存", "success");
      }
    } catch { toast("保存失败", "error"); }
  }

  function startEdit(profile: BusinessProfile) {
    setEditingId(profile.id);
    setEditData(profile.extracted_context);
  }

  async function toggleFavorite(oppId: number) {
    const isFaved = favIds.includes(oppId);
    setAnimatingFav(oppId);
    setTimeout(() => setAnimatingFav(null), 300);
    try {
      if (isFaved) {
        await fetch(`${API_BASE}/api/favorites/remove?user_id=${USER_ID}&item_type=opportunity&item_id=${oppId}`, { method: "DELETE" });
        setFavIds((ids) => ids.filter((id) => id !== oppId));
        toast("已取消关注", "info");
      } else {
        await fetch(`${API_BASE}/api/favorites/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: USER_ID, item_type: "opportunity", item_id: oppId }),
        });
        setFavIds((ids) => [...ids, oppId]);
        toast("已关注", "success");
      }
    } catch {}
  }

  function parseAnalysis(analysisStr: string) {
    try { return JSON.parse(analysisStr); } catch { return { opportunity: analysisStr }; }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">智能参谋</h1>
        <p className="text-gray-400 mt-1 text-sm">告诉我你的业务，AI会持续为你发现技术机遇</p>
      </div>

      {/* Business context input */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-2">描述你的业务场景</h2>
        <p className="text-sm text-gray-400 mb-4">描述越详细，AI匹配越精准。系统会从你的描述中越来越懂你的需求。</p>
        <textarea
          value={businessText}
          onChange={(e) => setBusinessText(e.target.value)}
          placeholder={`例如：\n我们是一家电商公司，主要做服饰品类。\n目前产品图拍摄流程：摄影师拍摄 → 修图师PS精修 → 上传到商品系统。\n痛点：修图成本高，一张图需要30分钟，旺季人手不足。`}
          className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-300">也可以在飞书中直接对Bot描述你的业务</p>
          <button
            onClick={submitBusinessContext}
            disabled={submitting || !businessText.trim()}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all text-sm font-medium disabled:opacity-40 btn-press flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="spinner" />
                AI分析中...
              </>
            ) : "提交分析"}
          </button>
        </div>
        {submitted && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in flex items-center gap-2">
            <span>✓</span> 业务信息已记录！当有新的AI能力与你的业务匹配时，系统会主动通知你。
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("vault")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all btn-press ${
            activeSection === "vault"
              ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
              : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
          }`}
        >
          我的信息库 ({profiles.length})
        </button>
        <button
          onClick={() => setActiveSection("opportunities")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all btn-press ${
            activeSection === "opportunities"
              ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
              : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
          }`}
        >
          已发现的AI机遇 ({opportunities.length})
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="skeleton h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-3/4" /></div>
                <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Info Vault */}
          {activeSection === "vault" && (
            <div className="space-y-4 animate-fade-in">
              {profiles.length > 0 ? profiles.map((profile) => (
                <div key={profile.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden card-hover">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3.5 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-semibold text-blue-800">
                        {profile.extracted_context.domain || "业务信息"}
                      </span>
                      <span className="text-[11px] text-blue-400 bg-blue-100 px-2 py-0.5 rounded-md">
                        {profile.source_type === "conversation" ? "对话录入" : "文档上传"}
                      </span>
                      {profile.created_at && (
                        <span className="text-[11px] text-gray-400">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === profile.id ? (
                        <>
                          <button onClick={() => saveEdit(profile.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 btn-press font-medium">保存</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs hover:bg-gray-200 btn-press">取消</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(profile)} className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg text-xs hover:bg-blue-50 btn-press font-medium">校准</button>
                          <button onClick={() => deleteProfile(profile.id)} className="px-3 py-1.5 bg-white text-red-400 border border-red-200 rounded-lg text-xs hover:bg-red-50 btn-press">删除</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {editingId === profile.id ? (
                      <EditableProfile data={editData as BusinessProfile["extracted_context"]} onChange={setEditData} />
                    ) : (
                      <ProfileDisplay context={profile.extracted_context} />
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-400">还没有业务信息，请在上方输入你的业务描述</p>
                  <p className="text-sm text-gray-300 mt-1">AI 会自动提取关键信息，你可以随时查看和校准</p>
                </div>
              )}
            </div>
          )}

          {/* Opportunities */}
          {activeSection === "opportunities" && (
            <div className="space-y-4 animate-fade-in">
              {opportunities.length > 0 ? opportunities.map((opp) => {
                const analysis = parseAnalysis(opp.opportunity_analysis);
                const isFaved = favIds.includes(opp.id);
                return (
                  <div key={opp.id} className="bg-white rounded-2xl border border-orange-100 overflow-hidden card-hover">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-100">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 flex-1">{analysis.opportunity || "AI机遇"}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleFavorite(opp.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all btn-press font-medium ${
                              isFaved ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-white text-gray-400 hover:bg-amber-50 hover:text-amber-500 border border-gray-200"
                            } ${animatingFav === opp.id ? "star-pop" : ""}`}
                          >
                            {isFaved ? "★ 已关注" : "☆ 关注"}
                          </button>
                          <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg">
                            {analysis.relevance_score || Math.round(opp.similarity_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      {analysis.value_analysis && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                            <span className="text-orange-500">📊</span> 价值分析
                          </h4>
                          <p className="text-sm text-gray-500 leading-relaxed">{analysis.value_analysis}</p>
                        </div>
                      )}
                      {analysis.application_method && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                            <span className="text-blue-500">🔧</span> 建议应用方式
                          </h4>
                          <p className="text-sm text-gray-500 leading-relaxed bg-blue-50 rounded-xl p-3.5 border border-blue-100">{analysis.application_method}</p>
                        </div>
                      )}
                      {analysis.quick_test_steps && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                            <span className="text-green-500">✅</span> 快速验证
                          </h4>
                          <div className="space-y-1.5">
                            {(Array.isArray(analysis.quick_test_steps) ? analysis.quick_test_steps : [analysis.quick_test_steps]).map((step: string, i: number) => (
                              <div key={i} className="flex gap-2.5 text-sm text-gray-500">
                                <span className="w-5 h-5 rounded-md bg-green-100 text-green-600 text-[11px] flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-300 pt-2 border-t border-gray-50">
                        AI能力: {opp.ai_capability}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <p className="text-4xl mb-3">🎯</p>
                  <p className="text-gray-400">描述你的业务后，系统会在发现新AI能力时自动匹配机遇</p>
                  <p className="text-sm text-gray-300 mt-1">匹配结果也会通过飞书Bot主动推送给你</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProfileDisplay({ context }: { context: BusinessProfile["extracted_context"] }) {
  const sections = [
    { label: "核心业务", value: context.core_business, icon: "💼", color: "bg-blue-50 text-blue-600" },
    { label: "当前工具", value: context.current_tools, icon: "🔧", color: "bg-gray-50 text-gray-600" },
    { label: "工作流程", value: context.workflows, icon: "📊", color: "bg-indigo-50 text-indigo-600" },
    { label: "主要痛点", value: context.pain_points, icon: "⚡", color: "bg-red-50 text-red-600" },
    { label: "AI 机会点", value: context.ai_opportunities, icon: "🎯", color: "bg-green-50 text-green-600" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => {
        if (!section.value) return null;
        const items = Array.isArray(section.value) ? section.value : [section.value];
        if (items.length === 0) return null;
        return (
          <div key={section.label} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <span>{section.icon}</span>{section.label}
            </h4>
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li key={i} className={`text-sm rounded-lg px-3 py-2 ${section.color} bg-opacity-50`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EditableProfile({ data, onChange }: { data: BusinessProfile["extracted_context"]; onChange: (d: Record<string, unknown>) => void }) {
  function updateField(field: string, value: string) { onChange({ ...data, [field]: value }); }
  function updateArrayField(field: string, index: number, value: string) {
    const arr = [...((data as Record<string, string[]>)[field] || [])];
    arr[index] = value;
    onChange({ ...data, [field]: arr });
  }
  function addArrayItem(field: string) {
    const arr = [...((data as Record<string, string[]>)[field] || []), ""];
    onChange({ ...data, [field]: arr });
  }
  function removeArrayItem(field: string, index: number) {
    const arr = ((data as Record<string, string[]>)[field] || []).filter((_: string, i: number) => i !== index);
    onChange({ ...data, [field]: arr });
  }

  const arrayFields = [
    { key: "current_tools", label: "当前工具" },
    { key: "workflows", label: "工作流程" },
    { key: "pain_points", label: "主要痛点" },
    { key: "ai_opportunities", label: "AI 机会点" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">业务领域</label>
        <input value={data.domain || ""} onChange={(e) => updateField("domain", e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">核心业务</label>
        <textarea value={data.core_business || ""} onChange={(e) => updateField("core_business", e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none h-16" />
      </div>
      {arrayFields.map((field) => {
        const items = (data as Record<string, string[]>)[field.key] || [];
        return (
          <div key={field.key}>
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <div className="space-y-1.5 mt-1">
              {items.map((item: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input value={item} onChange={(e) => updateArrayField(field.key, i, e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  <button onClick={() => removeArrayItem(field.key, i)} className="px-2 text-red-300 hover:text-red-500 text-sm transition-colors">×</button>
                </div>
              ))}
              <button onClick={() => addArrayItem(field.key)} className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">+ 添加</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
