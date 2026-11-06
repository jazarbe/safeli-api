Safeli calcula rutas óptimas evitando zonas de alto riesgo en tiempo real mediante la integración de **Supabase (PostGIS)**, **Node.js/Express**, **OpenRouteService** y **Mapbox/Leaflet**.

Pasos para ejecutar el proyecto
1. Clonar el repositorio de Backend e instalar dependencias
git clone https://github.com/jazarbe/safeli-api.git
cd safeli
npm install

2. Configurar Variables de Entorno
Descarga el archivo .env en la raíz del backend.

3. Preparar la Base de Datos (Supabase)
Antes de iniciar el servidor, ejecuta el script de base de datos en el SQL Editor de Supabase.

4. Iniciar el Servidor
npm run dedv

5. Clonar el repositorio de Frontend e instalar dependencias
git clone https://github.com/ddianapark/Safeli_FrontEnd.git
cd frontend
npm install

6. Configurar Variables de Entorno
Descarga el archivo .env en la raíz del frontend.

7. Iniciar el servidor de desarrollo:
npx expo start

Tecnologías Principales
- **Expo**: `~57.0.27`
- **React Native**: `0.86.3`
- **React**: `19.2.3`
- **Supabase JS**: `^2.108.0`
- **TypeScript**: `~6.0.3`
