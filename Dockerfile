FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./

RUN npm install
COPY . .

# Simplemente npm run build es más seguro. Si el script build de package.json
# no tiene parseo extra de parámetros, añadir --configuration=production puede fallar.
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Copiamos la carpeta dist completa (browser y server) generada por el builder
COPY --from=builder /app/dist/portfolio ./dist/portfolio

# Exponemos el puerto 4000 que utiliza el servidor Express SSR
EXPOSE 4000

# Iniciamos el servidor de Node.js
CMD ["node", "dist/portfolio/server/server.mjs"]