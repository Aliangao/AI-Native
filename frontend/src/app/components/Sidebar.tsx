"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "工作台", icon: "📊", desc: "总览" },
  { href: "/digest", label: "前沿速递", icon: "📰", desc: "AI资讯" },
  { href: "/tools", label: "工具雷达", icon: "🛠️", desc: "搜索工具" },
  { href: "/business", label: "智能参谋", icon: "🎯", desc: "业务匹配" },
  { href: "/favorites", label: "我的关注", icon: "⭐", desc: "收藏内容" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            AI
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">AI Native</h1>
            <p className="text-[11px] text-gray-400 leading-tight">超级个体工作台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
              )}
              <span className={`text-base transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block leading-tight">{item.label}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${isActive ? "text-blue-400" : "text-gray-300"}`}>
                  {item.desc}
                </span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">Demo User</p>
            <p className="text-[10px] text-gray-300">Multi-Model AI</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
