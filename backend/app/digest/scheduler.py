"""APScheduler setup for periodic tasks."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()


async def scheduled_collection():
    """Scheduled task: collect and summarize AI news."""
    from app.digest.collector import collect_and_summarize
    count = await collect_and_summarize()
    print(f"[Scheduler] Collected {count} new articles")


async def scheduled_daily_digest():
    """Scheduled task: generate and push daily digest."""
    from app.digest.summarizer import generate_daily_digest
    from app.feishu.bot import push_daily_digest
    digest = await generate_daily_digest()
    await push_daily_digest(digest)
    print(f"[Scheduler] Daily digest pushed")


def start_scheduler():
    # Collect news every 4 hours
    scheduler.add_job(scheduled_collection, "interval", hours=4, id="news_collection")
    # Daily digest at 08:30 Beijing time
    scheduler.add_job(scheduled_daily_digest, "cron", hour=0, minute=30, id="daily_digest")  # UTC 00:30 = Beijing 08:30
    scheduler.start()
    print("[Scheduler] Started")


def stop_scheduler():
    scheduler.shutdown()
    print("[Scheduler] Stopped")
