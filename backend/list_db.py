import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv("../.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

async def main():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        # Get all tables
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """))
        tables = [row[0] for row in result]
        
        print(f"Found {len(tables)} tables in the database:\n")
        
        for table in tables:
            print(f"=== Table: {table} ===")
            col_result = await conn.execute(text(f"""
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = '{table}' AND table_schema = 'public'
                ORDER BY ordinal_position;
            """))
            for col in col_result:
                name, dtype, max_len, is_null, default = col
                type_str = dtype
                if max_len:
                    type_str += f"({max_len})"
                null_str = "NULL" if is_null == "YES" else "NOT NULL"
                default_str = f" DEFAULT {default}" if default else ""
                print(f"  - {name}: {type_str} {null_str}{default_str}")
            print()

if __name__ == "__main__":
    asyncio.run(main())
