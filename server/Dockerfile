FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create uploads folder if not exists
RUN mkdir -p uploads backups

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
