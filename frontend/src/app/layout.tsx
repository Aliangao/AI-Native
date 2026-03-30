import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Native Workstation",
  description: "AI时代的超级个体工作台",
};

const navItems = [
  { href: "/", label: "工作台", icon: "📊" },
  { href: "/digest", label: "前沿速递", icon: "📰" },
  { href: "/tools", label: "工具雷达", icon: "🛠️" },
  { href: "/business", label: "智能参谋", icon: "🎯" },
  { href: "/favorites", label: "我的关注", icon: "⭐" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-gray-50">
        {/* Sidebar */}
        <aside className="w-48 bg-white border-r border-gray-200 flex flex-col fixed h-full">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">AI Native</h1>
            <p className="text-sm text-gray-500 mt-1">超级个体工作台</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">Powered by Multi-Model AI</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-48 p-6">{children}</main>
      </body>
    </html>
  );
}
