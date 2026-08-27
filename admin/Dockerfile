FROM node:22-alpine

# git is needed for the Publish button (commit + push), not just content writes
RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

# The bind-mounted repo is owned by the host user, not this container's
# (root) user — without this, git refuses every command in it as
# "dubious ownership" the moment a real volume is mounted at runtime.
RUN git config --global --add safe.directory /app/repo

ENV PORT=3100
ENV CONTENT_DIR=/app/repo/src/content/notes
ENV REPO_DIR=/app/repo
VOLUME ["/app/repo"]
EXPOSE 3100

CMD ["node", "src/index.js"]
