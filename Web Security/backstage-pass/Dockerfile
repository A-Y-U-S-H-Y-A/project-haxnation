FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8080
# The real flag is injected at run time, never baked into the image:
#   docker run -e FLAG='HXN{...}' -p 8080:8080 backstage-pass
CMD ["node", "index.js"]
