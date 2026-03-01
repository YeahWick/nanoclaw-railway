# Minimal Telegram echo bot — for testing Railway container → Telegram connectivity
# Uses Node 22 native fetch, no npm dependencies needed
FROM node:22-slim

WORKDIR /app
COPY bot.js .

# TELEGRAM_BOT_TOKEN must be set as a Railway environment variable
ENV TELEGRAM_BOT_TOKEN=""

CMD ["node", "bot.js"]
