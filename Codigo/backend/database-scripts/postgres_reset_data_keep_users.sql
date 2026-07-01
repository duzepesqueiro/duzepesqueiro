DO $$
DECLARE
  truncate_sql TEXT;
BEGIN
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN NULL
      ELSE 'TRUNCATE TABLE ' ||
           string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename) ||
           ' RESTART IDENTITY CASCADE'
    END
  INTO truncate_sql
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('users', '_prisma_migrations');

  IF truncate_sql IS NOT NULL THEN
    EXECUTE truncate_sql;
  END IF;
END $$;
