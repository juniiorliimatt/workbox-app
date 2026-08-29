# Versão de Node fixada — mude aqui se precisar atualizar, não deixe flutuar.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# --outDir sobrescreve o outDir de vite.config.js (que aponta pra
# ../workbox-api/src/main/resources/static, usado só no modo embutido/monólito) —
# aqui o build fica standalone, servido pelo nginx neste próprio container.
RUN npx tsc -b && npx vite build --outDir dist

FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
