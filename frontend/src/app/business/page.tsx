"use client";

import { useState, useEffect } from "react";

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
  const [activeSection, setActiveSection] = useState<"vault" | "opportunities">(
    "vault"
  );

  useEffect(() => {
    fetchOpportunities();
    fetchFavIds();
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const res = await fetch(
        `${API_BASE}/api/business/profile/${USER_ID}`
      );
      if (res.ok) setProfiles(await res.json());
    } catch {}
  }

  async function fetchOpportunities() {
    try {
      const res = await fetch(
        `${API_BASE}/api/business/opportunities/${USER_ID}`
      );
      if (res.ok) setOpportunities(await res.json());
    } catch (e) {
      console.error("Failed to fetch opportunities:", e);
    }
  }

  async function fetchFavIds() {
    try {
      const res = await fetch(
        `${API_BASE}/api/favorites/ids/${USER_ID}?item_type=opportunity`
      );
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
        fetchProfiles();
        fetchOpportunities();
      }
    } catch {
      alert("提交失败，请检查后端服务");
    }
    setSubmitting(false);
  }

  async function deleteProfile(id: number) {
    if (!confirm("确定删除这条业务信息？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/business/context/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("删除失败");
    }
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
      }
    } catch {
      alert("保存失败");
    }
  }

  function startEdit(profile: BusinessProfile) {
    setEditingId(profile.id);
    setEditData(profile.extracted_context);
  }

  async function toggleFavorite(oppId: number) {
    const isFaved = favIds.includes(oppId);
    try {
      if (isFaved) {
        await fetch(
          `${API_BASE}/api/favorites/remove?user_id=${USER_ID}&item_type=opportunity&item_id=${oppId}`,
          { method: "DELETE" }
        );
        setFavIds((ids) => ids.filter((id) => id !== oppId));
      } else {
        await fetch(`${API_BASE}/api/favorites/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: USER_ID,
            item_type: "opportunity",
            item_id: oppId,
          }),
        });
        setFavIds((ids) => [...ids, oppId]);
      }
    } catch {}
  }

  function parseAnalysis(analysisStr: string) {
    try {
      return JSON.parse(analysisStr);
    } catch {
      return { opportunity: analysisStr };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">智能参谋</h1>
        <p className="text-gray-500 mt-1">
          告诉我你的业务，AI会持续为你发现技术机遇
        </p>
      </div>

      {/* Business context input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">描述你的业务场景</h2>
        <p className="text-sm text-gray-500 mb-4">
          描述越详细，AI匹配越精准。系统会从你的描述和日常操作中越来越懂你的需求。
        </p>
        <textarea
          value={businessText}
          onChange={(e) => setBusinessText(e.target.value)}
          placeholder={`例如：\n我们是一家电商公司，主要做服饰品类。\n目前产品图拍摄流程：摄影师拍摄 → 修图师PS精修 → 上传到商品系统。\n痛点：修图成本高，一张图需要30分钟，旺季人手不足。`}
          className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            也可以在飞书中直接对Bot描述你的业务
          </p>
          <button
            onClick={submitBusinessContext}
            disabled={submitting || !businessText.trim()}
            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "分析中..." : "提交分析"}
          </button>
        </div>
        {submitted && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            业务信息已记录！当有新的AI能力与你的业务匹配时，系统会主动通知你。
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("vault")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "vault"
              ? "bg-orange-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          我的信息库 ({profiles.length})
        </button>
        <button
          onClick={() => setActiveSection("opportunities")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "opportunities"
              ? "bg-orange-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          已发现的AI机遇 ({opportunities.length})
        </button>
      </div>

      {/* Info Vault */}
      {activeSection === "vault" && (
        <div className="space-y-4">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {profile.extracted_context.domain || "业务信息"}
                    </span>
                    <span className="text-xs text-blue-400">
                      {profile.source_type === "conversation"
                        ? "对话录入"
                        : "文档上传"}
                    </span>
                    {profile.created_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === profile.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(profile.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(profile)}
                          className="px-3 py-1 bg-white text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50"
                        >
                          校准
                        </button>
                        <button
                          onClick={() => deleteProfile(profile.id)}
                          className="px-3 py-1 bg-white text-red-500 border border-red-200 rounded text-xs hover:bg-red-50"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {editingId === profile.id ? (
                    <EditableProfile
                      data={editData as BusinessProfile["extracted_context"]}
                      onChange={setEditData}
                    />
                  ) : (
                    <ProfileDisplay context={profile.extracted_context} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-gray-400">
                还没有业务信息，请在上方输入你的业务描述
              </p>
              <p className="text-sm text-gray-300 mt-2">
                AI 会自动提取关键信息，你可以随时查看和校准
              </p>
            </div>
          )}
        </div>
      )}

      {/* Opportunities */}
      {activeSection === "opportunities" && (
        <div className="space-y-4">
          {opportunities.length > 0 ? (
            opportunities.map((opp) => {
              const analysis = parseAnalysis(opp.opportunity_analysis);
              const isFaved = favIds.includes(opp.id);
              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl border border-orange-200 overflow-hidden"
                >
                  <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {analysis.opportunity || "AI机遇"}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleFavorite(opp.id)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            isFaved
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-white text-gray-400 hover:bg-gray-100"
                          }`}
                        >
                          {isFaved ? "⭐ 已关注" : "☆ 关注"}
                        </button>
                        <span className="text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                          匹配度{" "}
                          {analysis.relevance_score ||
                            Math.round(opp.similarity_score * 100)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {analysis.value_analysis && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          价值分析
                        </h4>
                        <p className="text-sm text-gray-600">
                          {analysis.value_analysis}
                        </p>
                      </div>
                    )}
                    {analysis.application_method && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          建议应用方式
                        </h4>
                        <p className="text-sm text-gray-600">
                          {analysis.application_method}
                        </p>
                      </div>
                    )}
                    {analysis.quick_test_steps && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          快速验证
                        </h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                          {(Array.isArray(analysis.quick_test_steps)
                            ? analysis.quick_test_steps
                            : [analysis.quick_test_steps]
                          ).map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      AI能力: {opp.ai_capability}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-5xl mb-4">🎯</p>
              <p className="text-gray-400">
                描述你的业务后，系统会在发现新AI能力时自动匹配机遇
              </p>
              <p className="text-sm text-gray-300 mt-2">
                匹配结果也会通过飞书Bot主动推送给你
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileDisplay({
  context,
}: {
  context: BusinessProfile["extracted_context"];
}) {
  const sections = [
    {
      label: "核心业务",
      value: context.core_business,
      icon: "💼",
    },
    {
      label: "当前工具",
      value: context.current_tools,
      icon: "🔧",
    },
    {
      label: "工作流程",
      value: context.workflows,
      icon: "📊",
    },
    {
      label: "主要痛点",
      value: context.pain_points,
      icon: "⚡",
    },
    {
      label: "AI 机会点",
      value: context.ai_opportunities,
      icon: "🎯",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => {
        if (!section.value) return null;
        const items = Array.isArray(section.value)
          ? section.value
          : [section.value];
        return (
          <div key={section.label} className="space-y-1.5">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <span>{section.icon}</span>
              {section.label}
            </h4>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5"
                >
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

function EditableProfile({
  data,
  onChange,
}: {
  data: BusinessProfile["extracted_context"];
  onChange: (d: Record<string, unknown>) => void;
}) {
  function updateField(field: string, value: string) {
    onChange({ ...data, [field]: value });
  }

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
    const arr = ((data as Record<string, string[]>)[field] || []).filter(
      (_: string, i: number) => i !== index
    );
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
        <input
          value={data.domain || ""}
          onChange={(e) => updateField("domain", e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">核心业务</label>
        <textarea
          value={data.core_business || ""}
          onChange={(e) => updateField("core_business", e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 outline-none resize-none h-16"
        />
      </div>
      {arrayFields.map((field) => {
        const items =
          (data as Record<string, string[]>)[field.key] || [];
        return (
          <div key={field.key}>
            <label className="text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <div className="space-y-1.5 mt-1">
              {items.map((item: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) =>
                      updateArrayField(field.key, i, e.target.value)
                    }
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeArrayItem(field.key, i)}
                    className="px-2 text-red-400 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem(field.key)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + 添加
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
