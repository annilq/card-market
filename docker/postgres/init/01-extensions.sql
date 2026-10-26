-- 启用 pg_trgm 扩展，支撑卡名/编号 CJK 子串模糊匹配（development.md §7.1）
-- 该脚本在数据库首次初始化时执行，先于 Directus 建表，因此扩展对后续业务表均可用。
CREATE EXTENSION IF NOT EXISTS pg_trgm;
