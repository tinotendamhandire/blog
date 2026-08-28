FROM node:22-alpine

# git is needed for the Publish button (commit + push), not just content writes
RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

# --system, not --global: this container now runs as a non-root user set
# at compose runtime (see docker-compose.yml's `user:`), which has no
# $HOME/.gitconfig of its own — a system-wide (/etc/gitconfig) entry is
# the only kind that applies no matter which UID actually runs git.
RUN git config --system --add safe.directory /app/repo

ENV PORT=3100
ENV CONTENT_DIR=/app/repo/src/content/notes
ENV REPO_DIR=/app/repo
VOLUME ["/app/repo"]
EXPOSE 3100

CMD ["node", "src/index.js"]
