@echo off
echo === ClassCraft v0.9.0 Deploy ===
echo.

echo Agregando archivos...
git add .

echo.
echo Haciendo commit...
git commit -m "v0.9.0 - Sistema equipos rediseñado, nuevo logo, backgrounds y UI visual mejorada"

echo.
echo Subiendo cambios...
git push

echo.
echo ✅ Deploy completado!
pause
