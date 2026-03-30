#!/bin/bash
# AI-Native 本地一键启动脚本
# 同时启动 Backend (FastAPI) 和 Frontend (Next.js)

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动 AI-Native 项目..."

# 启动后端
echo "📦 启动后端 (FastAPI on :8000)..."
(
  cd "$ROOT_DIR/backend"
  source .venv/bin/activate
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# 启动前端
echo "🌐 启动前端 (Next.js on :3000)..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动："
echo "   后端 API:  http://localhost:8000"
echo "   后端文档:  http://localhost:8000/docs"
echo "   前端页面:  http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C，同时停止前后端
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
