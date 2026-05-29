alter database postgres set timezone to 'UTC';

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";
