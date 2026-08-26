# Static build, self-served on the box — no Cloudflare Pages. cloudflared's
# tunnel ingress needs a genuinely private origin to point at; a public
# *.pages.dev address doesn't qualify (that's the "DNS points to prohibited
# IP" error), so the static output is served locally instead, same pattern
# as file-host and admin.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
