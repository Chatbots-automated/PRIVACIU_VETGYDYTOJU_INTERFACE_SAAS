@echo off
echo ========================================
echo Applying New Migrations
echo ========================================
echo This will apply:
echo - 20260426000007_create_treatment_history_view.sql
echo - 20260426000008_add_ovules_to_product_category.sql
echo ========================================
echo.

set DB_URL=postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

echo Applying migration 1: Add ovules to product_category...
npx supabase db execute --file migrations_saas/20260426000008_add_ovules_to_product_category.sql --db-url "%DB_URL%"
if %ERRORLEVEL% NEQ 0 (
    echo Migration 1 failed or already applied
)

echo.
echo Applying migration 2: Create treatment_history_view (FIXED)...
npx supabase db execute --file migrations_saas/20260426000007_create_treatment_history_view.sql --db-url "%DB_URL%"
if %ERRORLEVEL% NEQ 0 (
    echo Migration 2 failed!
    pause
    exit /b 1
)

echo.
echo Applying migration 3: Create fn_fifo_batch function...
npx supabase db execute --file migrations_saas/20260426000009_create_fn_fifo_batch.sql --db-url "%DB_URL%"
if %ERRORLEVEL% NEQ 0 (
    echo Migration 3 failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migrations applied successfully!
echo ========================================
echo.
echo Please refresh your browser to see changes.
echo.
pause
