# Minimal Telegram echo bot — webhook mode for serverless Railway deploys
# Uses Node 22 native fetch + http, no npm dependencies needed
FROM node:22-slim

WORKDIR /app
COPY bot.js .

# Railway injects PORT automatically; Telegram token and optional webhook URL override
ENV TELEGRAM_BOT_TOKEN=""
ENV WEBHOOK_URL=""

EXPOSE 3000

CMD ["node", "bot.js"]
