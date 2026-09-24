# syntax=docker/dockerfile:1
# The Multimeter web app (apps/web) as a static site: build with Node, serve with unprivileged
# nginx on :8080.
#   docker build -t multimeter .                                   # served at /
#   docker build --build-arg BASE_PATH=/multimeter/ -t multimeter .   # served at /multimeter/

FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g corepack && corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
ARG BASE_PATH=/
RUN BASE_PATH="$BASE_PATH" pnpm --filter web build

FROM nginxinc/nginx-unprivileged:1.29-alpine
ARG BASE_PATH=/
ENV BASE_PATH=$BASE_PATH
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html${BASE_PATH}
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8080/healthz || exit 1
