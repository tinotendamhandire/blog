FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

ENV PORT=3100
ENV CONTENT_DIR=/app/content
VOLUME ["/app/content"]
EXPOSE 3100

CMD ["node", "src/index.js"]
