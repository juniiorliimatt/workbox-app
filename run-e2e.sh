#!/bin/bash

# Este script orquestra um ambiente efêmero com Docker Compose e executa os testes E2E do Puppeteer,
# não poluindo as instâncias de desenvolvimento locais do banco de dados (workbox-postgres).

echo "============================================================"
echo "🚀 1) Iniciando ambiente efêmero de E2E (Testcontainers-like)"
echo "============================================================"
# "--wait" garante que os healthchecks definidos no docker-compose.e2e.yml fiquem HEALTHY
docker compose -f docker-compose.e2e.yml up -d --wait --build
if [ $? -ne 0 ]; then
  echo "❌ Falha ao iniciar serviços no Docker Compose. Abortando."
  exit 1
fi

echo "============================================================"
echo "🚀 2) Iniciando Vite (dev server) local apontando pro efêmero"
echo "============================================================"
# Exportar variáveis para o Vite fazer proxy pros containers efêmeros
export VITE_API_URL=http://localhost:8082
export VITE_BUDGET_API_URL=http://localhost:8083

source ~/.nvm/nvm.sh && nvm use default
npm run dev -- --port 5174 &
VITE_PID=$!

echo "⏳ Aguardando Vite subir na porta 5174..."
sleep 5

echo "============================================================"
echo "🧪 3) Rodando a suíte de testes E2E..."
echo "============================================================"
export APP_URL=http://localhost:5174
node src/test/browser-e2e.mjs
TEST_EXIT_CODE=$?

echo "============================================================"
echo "🧹 4) Teardown: Limpando o ambiente efêmero..."
echo "============================================================"
kill $VITE_PID || true
docker compose -f docker-compose.e2e.yml down -v

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Tudo verde! O banco de desenvolvimento permaneceu limpo."
else
  echo "❌ Falha nos testes E2E."
fi

exit $TEST_EXIT_CODE
