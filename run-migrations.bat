@echo off
echo Running Stripe field migrations...
echo.

REM Get database URL from .env
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DATABASE_URL=%%a

REM Run the Stripe fields migration
psql %DATABASE_URL% -f prisma\migrations\add_stripe_fields.sql

echo.
echo Migration completed!
echo.
pause
