@echo off
echo ========================================
echo WARNING: This will DELETE ALL DATA!
echo ========================================
echo This script will delete:
echo - All products
echo - All invoices
echo - All treatments
echo - All visits
echo - All batches
echo - All finance records
echo ========================================
echo.
set /p confirm="Are you ABSOLUTELY SURE? Type 'YES' to continue: "

if not "%confirm%"=="YES" (
    echo Cancelled. No data was deleted.
    pause
    exit /b
)

echo.
echo Running cleanup script...
cd supabase
npx supabase db execute --file scripts/MANUAL_reset_data_for_testing.sql --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
pause
