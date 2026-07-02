import logging
import os
import time

logger = logging.getLogger(__name__)
_ENABLED = os.environ.get("ENABLE_TIMING_LOGS", "false").lower() in ("true", "1", "yes")


def log_duration(name: str):
    if not _ENABLED:
        return _DummyContextManager()
    return _TimingContext(name)


class _DummyContextManager:
    def __enter__(self):
        return None

    def __exit__(self, *args):
        pass

    async def __aenter__(self):
        return None

    async def __aexit__(self, *args):
        pass


class _TimingContext:
    def __init__(self, name: str):
        self.name = name

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        elapsed = int((time.perf_counter() - self.start) * 1000)
        logger.info("[timing] %s %dms", self.name, elapsed)

    async def __aenter__(self):
        self.start = time.perf_counter()
        return self

    async def __aexit__(self, *args):
        elapsed = int((time.perf_counter() - self.start) * 1000)
        logger.info("[timing] %s %dms", self.name, elapsed)
