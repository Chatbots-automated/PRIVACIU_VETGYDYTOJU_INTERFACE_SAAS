-- Check which migrations have been applied
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260520%'
ORDER BY version;
