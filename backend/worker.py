# !/usr/bin/env python3
import asyncio
import sys
import os
import logging
import json
from datetime import datetime, timedelta, timezone
import asyncpg

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.logging_config import setup_logging

setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger("worker")

from app.db.session import async_session
from sqlalchemy import select, update, and_, or_
from app.db.models.application import Application
from app.db.models.user_configs import UserConfig
from app.ai.graphs.analysis_graph import run_analysis
from app.utils.timing import log_duration

MAX_STALE_MINUTES = 30  # reset stuck 'processing' records after this long
wakeup_event = asyncio.Event()


async def process_one() -> bool:
    """Claim and process one queued application, if any."""
    async with log_duration("WORKER_PROCESS_ONE"):
        async with async_session() as session:
            # 1. Find the oldest queued application
            query = (
                select(Application)
                .where(Application.analysis_status == "queued")
                .order_by(Application.created_at.asc())
                .limit(1)
            )
            result = await session.execute(query)
            app = result.scalar_one_or_none()

            if not app:
                return False
            app_id = app.id
            user_id = app.user_id

            # 2. Atomically claim it
            stmt = (
                update(Application)
                .where(
                    and_(
                        Application.id == app_id,
                        Application.analysis_status == "queued",
                    )
                )
                .values(
                    analysis_status="processing",
                    analysis_started_at=datetime.now(timezone.utc),
                    analysis_error=None,
                )
                .execution_options(synchronize_session=False)
                .returning(Application.id)
            )
            claim_result = await session.execute(stmt)
            await session.commit()

            if not claim_result.scalar_one_or_none():
                return False  # lost the race

            logger.info(f"Claimed application {app_id}")

            # 3. Fetch user model configs
            user_configs = None
            try:
                settings_query = select(UserConfig).where(UserConfig.user_id == user_id)
                settings_result = await session.execute(settings_query)
                user_configs = settings_result.scalar_one_or_none()
            except Exception as exc:
                logger.warning(
                    f"Warning: could not fetch user configs for {user_id}: {exc}"
                )

            # Extract active LLM settings
            provider_name = "gemini"  # default
            model_name = None
            api_key = None
            base_url = None
            task_models = {}
            auto_draft_cover_letters = True
            generate_interview_prep = True
            auto_tailor_resume = True
            provider_data = {}

            if user_configs:
                if getattr(user_configs, "auto_draft_cover_letters", None) is not None:
                    auto_draft_cover_letters = user_configs.auto_draft_cover_letters
                if getattr(user_configs, "generate_interview_prep", None) is not None:
                    generate_interview_prep = user_configs.generate_interview_prep
                if getattr(user_configs, "auto_tailor_resume", None) is not None:
                    auto_tailor_resume = user_configs.auto_tailor_resume
                if user_configs.task_models:
                    task_models = user_configs.task_models

                if user_configs.active_llm_provider and user_configs.llm_keys:
                    provider_name = user_configs.active_llm_provider
                    provider_data = user_configs.llm_keys.get(provider_name, {})

                    model_name = provider_data.get("model")
                    base_url = provider_data.get("base_url")

                encrypted_key = provider_data.get("api_key_encrypted")
                if encrypted_key:
                    from app.core.encryption import decrypt_api_key

                    api_key = decrypt_api_key(encrypted_key)

            if os.getenv("AI_PROVIDER") == "mock":
                provider_name = "mock"
                api_key = "mock-key"

        # 4. Run the analysis pipeline (outside session block)
        try:
            final_state = await run_analysis(
                str(app_id),
                provider_name=provider_name,
                model_name=model_name,
                api_key=api_key,
                base_url=base_url,
                task_models=task_models,
                auto_draft_cover_letters=auto_draft_cover_letters,
                generate_interview_prep=generate_interview_prep,
                auto_tailor_resume=auto_tailor_resume,
            )

            async with async_session() as session:
                if final_state.get("error") is not None:
                    error_msg = f"Analysis pipeline failed: {final_state['error']}"
                    await session.execute(
                        update(Application)
                        .where(Application.id == app_id)
                        .values(analysis_status="failed", analysis_error=error_msg)
                    )
                    logger.error(f"Failed {app_id}: {error_msg}")
                else:
                    await session.execute(
                        update(Application)
                        .where(Application.id == app_id)
                        .values(analysis_status="completed", analysis_error=None)
                    )
                    logger.info(f"Completed {app_id}")
                await session.commit()
                return True

        except Exception as exc:
            error_msg = f"Analysis pipeline exception: {exc}"
            try:
                async with async_session() as session:
                    await session.execute(
                        update(Application)
                        .where(Application.id == app_id)
                        .values(analysis_status="failed", analysis_error=error_msg)
                    )
                    await session.commit()
            except Exception:
                pass
            logger.exception(f"Exception {app_id}: {exc}")
            return False


async def recover_stale() -> None:
    """Reset applications stuck in 'processing' back to 'queued' for retry."""
    async with log_duration("WORKER_RECOVER_STALE"):
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=MAX_STALE_MINUTES)
        try:
            async with async_session() as session:
                stmt = (
                    update(Application)
                    .where(
                        and_(
                            Application.analysis_status == "processing",
                            Application.analysis_started_at < cutoff,
                        )
                    )
                    .values(
                        analysis_status="queued",
                        analysis_error="Reset by worker after timeout — will retry.",
                    )
                    .execution_options(synchronize_session=False)
                )
                result = await session.execute(stmt)
                await session.commit()
                if result.rowcount > 0:
                    logger.info(f"Reset {result.rowcount} stale record(s) to 'queued'")
        except Exception as exc:
            logger.warning(f"Warning: stale recovery failed: {exc}")


async def listen_for_jobs() -> None:
    """Listens for PostgreSQL NOTIFY events on 'analysis_queued' channel."""
    db_url = settings.DATABASE_URL
    # Coerce postgresql+asyncpg:// to postgresql:// as expected by asyncpg
    pg_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    while True:
        try:
            logger.info("Connecting listener to PostgreSQL...")
            conn = await asyncpg.connect(pg_url)
            
            async def on_notification(connection, pid, channel, payload):
                logger.info(f"Database notification received on '{channel}': {payload}")
                wakeup_event.set()
                
            await conn.add_listener("analysis_queued", on_notification)
            logger.info("Listening for 'analysis_queued' notifications...")
            
            # Keep listener alive
            while True:
                await asyncio.sleep(3600)
        except Exception as e:
            logger.error(f"Listener connection error: {e}. Retrying in 10s...")
            await asyncio.sleep(10)


async def main() -> None:
    logger.info(
        f"Started. Event-driven mode, stale timeout={MAX_STALE_MINUTES}min"
    )
    
    # Start the listener background task
    asyncio.create_task(listen_for_jobs())
    
    # Run stale recovery on startup to catch anything left over
    await recover_stale()
    
    recovery_tick = 0
    while True:
        try:
            # Drain queue completely before going to sleep
            while await process_one():
                pass
        except Exception as exc:
            logger.exception(f"Unhandled error in main loop: {exc}")

        # Sleep/wait for wakeup event or fallback poll (for recovery safety)
        try:
            await asyncio.wait_for(wakeup_event.wait(), timeout=60.0)
            wakeup_event.clear()
        except asyncio.TimeoutError:
            # Fallback/heartbeat check
            recovery_tick += 1
            if recovery_tick >= 10:  # ~10 minutes
                await recover_stale()
                recovery_tick = 0


if __name__ == "__main__":
    asyncio.run(main())
