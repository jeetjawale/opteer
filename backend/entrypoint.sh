#!/bin/bash
set -e

echo "⏳ Waiting for database..."

# Wait for PostgreSQL to accept connections using Python (no extra deps needed)
python3 -c "
import time
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

async def wait_for_db():
    db_url = os.environ.get('DATABASE_URL', '')
    for attempt in range(30):
        try:
            engine = create_async_engine(db_url)
            async with engine.connect() as conn:
                await conn.execute(text('SELECT 1'))
            await engine.dispose()
            print(f'  ✓ Connected on attempt {attempt + 1}')
            return
        except Exception as e:
            if attempt < 29:
                time.sleep(1)
            else:
                raise Exception(f'Database not ready after 30 attempts: {e}')

asyncio.run(wait_for_db())
"

echo "✅ Database ready. Running migrations..."
alembic upgrade head

echo "🚀 Starting application..."
exec "$@"
