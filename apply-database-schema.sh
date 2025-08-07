#!/bin/bash

# Script para aplicar el esquema de base de datos
# Asegúrate de tener psql instalado y las variables de entorno configuradas

echo "🗄️ Aplicando esquema de base de datos para sistema de clientes SaaS..."

# Leer las variables desde .env.local si existe
if [ -f .env.local ]; then
    source .env.local
fi

# Verificar que tenemos las variables necesarias
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Faltan las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
    echo "   Configúralas en .env.local o como variables de entorno"
    exit 1
fi

# Extraer la información de conexión de SUPABASE_URL
# Formato: https://[project-id].supabase.co
PROJECT_ID=$(echo $SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\)\.supabase\.co.*/\1/p')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No se pudo extraer el PROJECT_ID de SUPABASE_URL"
    exit 1
fi

echo "📡 Conectando a proyecto: $PROJECT_ID"

# Aplicar el esquema usando psql (requiere instalación de PostgreSQL client)
psql "postgresql://postgres.${PROJECT_ID}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" \
     -f database-client-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Esquema aplicado exitosamente"
else
    echo "❌ Error aplicando el esquema"
    echo "💡 Alternativamente, copia el contenido de database-client-schema.sql"
    echo "   y ejecútalo manualmente en el SQL Editor de Supabase"
fi
