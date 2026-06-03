#!/usr/bin/env python3
"""
Polling worker — drains the analysis queue using the applications table.
Run from the backend/ directory: python worker.py

Strategy (Option B): applications table is the durable queue.
- Polls for analysis_status = 'queued' every POLL_INTERVAL seconds.
- Atomically claims each record by updating to 'processing' only if still 'queued'.
- Resets records stuck in 'processing' for > MAX_STALE_MINUTES.
"""

import asyncio
import sys
import os
import logging
import json
from datetime import datetime, timedelta, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage()
        }
        if record.exc_info:
            log_record["error"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

logger = logging.getLogger("worker")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

sys.path.insert(0, os.path.dirname(__file__))

from app.database import supabase_service
from app.graphs.analysis_graph import run_analysis
from app.utils.timing import log_duration

POLL_INTERVAL = 2        # seconds between polls
MAX_STALE_MINUTES = 30   # reset stuck 'processing' records after this long


async def process_one() -> None:
    """Claim and process one queued application, if any."""
    async with log_duration("WORKER_PROCESS_ONE"):
        # 1. Find the oldest queued application
        queued = await asyncio.to_thread(
            lambda: (
                supabase_service.table("applications")
                .select("id, user_id")
                .eq("analysis_status", "queued")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
        )
        if not queued.data:
            return

        app_id = queued.data[0]["id"]
        user_id = queued.data[0]["user_id"]

        # 2. Atomically claim it (only succeeds if still 'queued')
        claimed = await asyncio.to_thread(
            lambda: (
                supabase_service.table("applications")
                .update(
                    {
                        "analysis_status": "processing",
                        "analysis_started_at": datetime.now(timezone.utc).isoformat(),
                        "analysis_error": None,
                    }
                )
                .eq("id", app_id)
                .eq("analysis_status", "queued")
                .execute()
            )
        )
        if not claimed.data:
            return  # lost the race — skip

        logger.info(f"Claimed application {app_id}")

        # 3. Fetch user model settings
        user_settings: dict = {}
        try:
            settings_resp = await asyncio.to_thread(
                lambda: (
                    supabase_service.table("user_settings")
                    .select("model_default, model_fit, model_letter, model_prep, model_tailor")
                    .eq("user_id", user_id)
                    .execute()
                )
            )
            if settings_resp.data:
                user_settings = settings_resp.data[0]
        except Exception as exc:
            logger.warning(f"Warning: could not fetch user settings for {user_id}: {exc}")

        # 4. Run the analysis pipeline
        try:
            final_state = await run_analysis(
                app_id,
                user_api_key=None,  # worker uses the platform key
                model_default=user_settings.get("model_default"),
                model_fit=user_settings.get("model_fit"),
                model_letter=user_settings.get("model_letter"),
                model_prep=user_settings.get("model_prep"),
                model_tailor=user_settings.get("model_tailor"),
            )

            if final_state.get("error") is not None:
                error_msg = f"Analysis pipeline failed: {final_state['error']}"
                await asyncio.to_thread(
                    lambda: supabase_service.table("applications").update(
                        {"analysis_status": "failed", "analysis_error": error_msg}
                    ).eq("id", app_id).execute()
                )
                logger.error(f"Failed {app_id}: {error_msg}")
            else:
                await asyncio.to_thread(
                    lambda: supabase_service.table("applications").update(
                        {"analysis_status": "completed", "analysis_error": None}
                    ).eq("id", app_id).execute()
                )
                logger.info(f"Completed {app_id}")

        except Exception as exc:
            error_msg = f"Analysis pipeline exception: {exc}"
            try:
                await asyncio.to_thread(
                    lambda: supabase_service.table("applications").update(
                        {"analysis_status": "failed", "analysis_error": error_msg}
                    ).eq("id", app_id).execute()
                )
            except Exception:
                pass
            logger.exception(f"Exception {app_id}: {exc}")


async def recover_stale() -> None:
    """Reset applications stuck in 'processing' back to 'queued' for retry."""
    async with log_duration("WORKER_RECOVER_STALE"):
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=MAX_STALE_MINUTES)).isoformat()
        try:
            result = await asyncio.to_thread(
                lambda: (
                    supabase_service.table("applications")
                    .update(
                        {
                            "analysis_status": "queued",
                            "analysis_error": "Reset by worker after timeout — will retry.",
                        }
                    )
                    .eq("analysis_status", "processing")
                    .lt("analysis_started_at", cutoff)
                    .execute()
                )
            )
            if result.data:
                logger.info(f"Reset {len(result.data)} stale record(s) to 'queued'")
        except Exception as exc:
            logger.warning(f"Warning: stale recovery failed: {exc}")


async def main() -> None:
    logger.info(f"Started. Poll interval={POLL_INTERVAL}s, stale timeout={MAX_STALE_MINUTES}min")
    recovery_tick = 0
    while True:
        try:
            # Run stale recovery every ~5 minutes (150 ticks × 2 s)
            recovery_tick += 1
            if recovery_tick >= 150:
                await recover_stale()
                recovery_tick = 0

            await process_one()
        except Exception as exc:
            logger.exception(f"Unhandled error in main loop: {exc}")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
