FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./

RUN npm install
COPY . .

# Simplemente npm run build es más seguro. Si el script build de package.json
# no tiene parseo extra de parámetros, añadir --configuration=production puede fallar.
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/portfolio/browser /usr/share/nginx/html

# Copiamos la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]