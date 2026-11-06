Safeli calcula rutas óptimas evitando zonas de alto riesgo en tiempo real mediante la integración de **Supabase (PostGIS)**, **Node.js/Express**, **OpenRouteService** y **Mapbox/Leaflet**.

Integración de Mapas y Consumo de API
El mapa en la aplicación móvil interactúa con los servicios de geolocalización a través del siguiente flujo:
1. **Visualización y Capas (Front-End):** 
   - Se utiliza **React Native Maps** / **Leaflet** para renderizar el mapa interactivo, la ubicación en tiempo real del usuario y los marcadores de alertas.
2. **Cálculo de Rutas Seguras (Backend Proxy):** 
   - El Front-End no consume directamente la API de rutas externas para no exponer llaves privadas. En su lugar, realiza una petición a nuestro Backend (`POST /api/routes/safe-route`).
   - El Backend consulta **OpenRouteService / Mapbox**, cruza los datos con la base de datos de zonas de riesgo en **Supabase (PostGIS)** y retorna la ruta calculada al cliente en formato GeoJSON/Polyline.
3. **Renderizado de Ruta:** 
   - El Front-End dibuja la polilínea recibida sobre el mapa usando el componente `<Polyline />`.

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
