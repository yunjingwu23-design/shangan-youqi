FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY lib ./lib
COPY scripts/interview-worker.ts ./scripts/interview-worker.ts
COPY tsconfig.json ./
USER node
CMD ["npm", "run", "worker:interviews"]
