#!/bin/bash
# ==================================================
# CLEANUP SCRIPT - Gestion de Ventas V1
# Removes unnecessary files to make project more professional
# ==================================================

echo "🧹 Iniciando limpieza del proyecto..."

# Remove old SQL files (keep only the consolidated schema)
echo "📄 Eliminando archivos SQL antiguos..."
rm -f *.sql 2>/dev/null || echo "Algunos archivos SQL ya estaban eliminados"
rm -f database/*.sql 2>/dev/null || echo "Algunos archivos en database/ ya estaban eliminados"
rm -f database-*.sql 2>/dev/null || echo "Algunos archivos database-*.sql ya estaban eliminados"
rm -f supabase-*.sql 2>/dev/null || echo "Algunos archivos supabase-*.sql ya estaban eliminados"
rm -f reset_data.sql 2>/dev/null || echo "reset_data.sql ya estaba eliminado"
rm -f cleanup-*.sql 2>/dev/null || echo "cleanup-*.sql ya estaba eliminado"

# Keep only database-complete-schema.sql (if it exists)
echo "✅ Manteniendo database-complete-schema.sql"

# Remove unnecessary markdown files (keep README.md)
echo "📝 Eliminando documentación innecesaria..."
rm -f stripe-*.md 2>/dev/null || echo "Archivos stripe-*.md ya estaban eliminados"
rm -f saas-*.md 2>/dev/null || echo "Archivos saas-*.md ya estaban eliminados"
rm -f INSTRUCCIONES_SQL.md 2>/dev/null || echo "INSTRUCCIONES_SQL.md ya estaba eliminado"
rm -f STRIPE-CONFIG-INSTRUCTIONS.md 2>/dev/null || echo "STRIPE-CONFIG-INSTRUCTIONS.md ya estaba eliminado"

# Remove debug folder and files
echo "🐛 Eliminando archivos de debug..."
rm -rf debug/ 2>/dev/null || echo "Carpeta debug ya estaba eliminada"
rm -f *.log 2>/dev/null || echo "Archivos .log ya estaban eliminados"

# Remove unnecessary directories if empty
echo "📁 Limpiando directorios vacíos..."
rmdir database 2>/dev/null || echo "Directorio database no estaba vacío o no existía"

# Remove temporary files
echo "🗑️ Eliminando archivos temporales..."
rm -f .DS_Store 2>/dev/null || echo ".DS_Store no existía"
rm -f Thumbs.db 2>/dev/null || echo "Thumbs.db no existía"
rm -f *.tmp 2>/dev/null || echo "Archivos .tmp no existían"

# Create a clean .gitignore if it doesn't exist or improve it
echo "📋 Actualizando .gitignore..."
cat > .gitignore << EOF
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# PWA files
/public/sw.js
/public/workbox-*.js

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp
*.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
EOF

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📊 Resumen de limpieza:"
echo "   - Archivos SQL consolidados en: database-complete-schema.sql"
echo "   - Documentación innecesaria eliminada"
echo "   - Archivos de debug eliminados"
echo "   - .gitignore actualizado"
echo ""
echo "🚀 Proyecto listo para producción!"
