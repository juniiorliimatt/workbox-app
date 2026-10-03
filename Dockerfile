# Versão de Node fixada — mude aqui se precisar atualizar, não deixe flutuar.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Defaults dos upstreams (nomes do docker compose) — sobrescreva via environment. Com
# resolução tardia no nginx, um serviço ausente do ambiente só gera 502 na rota dele.
ENV WORKBOX_API_UPSTREAM=http://workbox-api:8080 \
    BUDGET_SERVICE_UPSTREAM=http://budget-service:8081 \
    FORZA_SERVICE_UPSTREAM=http://forza-telemetry-service:8083
EXPOSE 8080
