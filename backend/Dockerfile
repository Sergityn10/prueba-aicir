FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar código fuente
COPY . .

# Directorio para base de datos persistente
RUN mkdir -p /app/data

ENV PORT=3001
ENV DB_PATH=/app/data/taller.db

EXPOSE 3001

CMD ["npm", "start"]
