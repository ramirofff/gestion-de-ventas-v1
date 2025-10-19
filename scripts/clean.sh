#!/usr/bin/env bash
# Limpia artefactos de construcción y caches locales
set -e

echo "Limpiando carpeta .next, node_modules (no se eliminará node_modules por defecto), y archivos temporales..."
rm -rf .next
rm -rf dist
rm -rf .cache
rm -rf public/sw.js
rm -rf public/workbox-*.js || true
rm -f ./*.tgz
rm -f *.log
rm -f *.tsbuildinfo

echo "Hecho. Si quieres eliminar node_modules, ejecuta: rm -rf node_modules" 
