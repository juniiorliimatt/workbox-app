#!/bin/bash

# Este script orquestra um ambiente efêmero com Docker Compose e executa os testes E2E do Puppeteer,
# não poluindo as instâncias de desenvolvimento locais do banco de dados (workbox-postgres).
#
# Ambiente efêmero (docker-compose.e2e.yml): Postgres + Redis + workbox-api + budget-service + moto-service.
# O banco nasce limpo, então a conta admin de QA que o teste usa é criada aqui (mesma receita do README do
# workbox-api, "Contas de teste (QA)"): registro pela API + promoção a ADMIN no Postgres efêmero.

COMPOSE="docker compose -f docker-compose.e2e.yml"
API_URL=http://localhost:8082
VITE_PID=""

# Teardown garantido — também quando a subida falha no meio — para nunca deixar containers órfãos.
cleanup() {
  echo "============================================================"
  echo "🧹 Teardown: limpando o ambiente efêmero..."
  echo "============================================================"
  if [ -n "$VITE_PID" ]; then kill "$VITE_PID" 2>/dev/null || true; fi
  $COMPOSE down -v
}
trap cleanup EXIT

echo "============================================================"
echo "🚀 1) Iniciando ambiente efêmero de E2E (Testcontainers-like)"
echo "============================================================"
# "--wait" garante que os healthchecks definidos no docker-compose.e2e.yml fiquem HEALTHY
if ! $COMPOSE up -d --wait --build; then
  echo "❌ Falha ao iniciar serviços no Docker Compose. Logs dos serviços que não ficaram saudáveis:"
  $COMPOSE ps --format '{{.Name}} {{.Status}}' | grep -v "(healthy)" | while read -r name _; do
    echo "--- $name"; docker logs --tail 40 "$name" 2>&1 | tail -40
  done
  exit 1
fi

echo "============================================================"
echo "👤 2) Criando a conta admin de QA no banco efêmero"
echo "============================================================"
if ! curl -fsS -X POST "$API_URL/api/v1/auth/register" -H "Content-Type: application/json" \
  -d '{"socialName":"QA Admin","email":"qa.admin@workbox.local","password":"QaAdmin@123"}' >/dev/null; then
  echo "❌ Falha ao registrar qa.admin em $API_URL."
  exit 1
fi
$COMPOSE exec -T postgres-e2e psql -U postgres -d workbox -v ON_ERROR_STOP=1 -c \
  "INSERT INTO workbox.user_roles (user_id, role_id) SELECT id, (SELECT id FROM workbox.roles WHERE authority='ADMIN') FROM workbox.users_api WHERE email='qa.admin@workbox.local';" \
  || { echo "❌ Falha ao promover qa.admin a ADMIN."; exit 1; }

echo "============================================================"
echo "🚀 3) Iniciando Vite (dev server) local apontando pro efêmero"
echo "============================================================"
# Exportar variáveis para o Vite fazer proxy pros containers efêmeros
export VITE_API_URL=$API_URL
export VITE_BUDGET_API_URL=http://localhost:8083
export VITE_MOTO_API_URL=http://localhost:8084

source ~/.nvm/nvm.sh && nvm use default
npm run dev -- --port 5174 &
VITE_PID=$!

echo "⏳ Aguardando Vite subir na porta 5174..."
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null http://localhost:5174; then break; fi
  sleep 1
done

echo "============================================================"
echo "🧪 4) Rodando a suíte de testes E2E..."
echo "============================================================"
export APP_URL=http://localhost:5174
node src/test/browser-e2e.mjs
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Tudo verde! O banco de desenvolvimento permaneceu limpo."
else
  echo "❌ Falha nos testes E2E."
fi

exit $TEST_EXIT_CODE
