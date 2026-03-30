#!/bin/bash
cd /Users/bytedance/Desktop/AI-Native/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
