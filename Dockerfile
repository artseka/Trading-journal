# Development image for Trading Journal Calendar
FROM node:24-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund \
    && npm approve-scripts esbuild || true \
    && npm approve-scripts workerd || true

COPY . .

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
