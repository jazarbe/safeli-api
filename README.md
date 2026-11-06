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
  
Configuración de la Base de Datos (Supabase)
1. Crea un proyecto en Supabase
2. Habilita la extensión de geolocalización **PostGIS** en tu base de datos.
3. Dirígete al **SQL Editor** en el panel de Supabase y ejecuta el script.

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

4. Integración y Consumo de la API de Mapas
El mapa en el Front-End consume los servicios de geolocalización mediante el siguiente esquema:

-La aplicación móvil utiliza React Native Maps / Leaflet para renderizar la interfaz gráfica del mapa, la ubicación actual del usuario y la marcación de puntos de riesgo.
-Petición de Ruta Segura (Backend Proxy): El cliente no consulta directamente a Mapbox u OpenRouteService para proteger las llaves de acceso.
Envía una solicitud HTTP POST a /api/routes/safe-route pasando las coordenadas de origen y destino.
-Procesamiento de Riesgo: El Backend consulta OpenRouteService/Mapbox para obtener la ruta estándar y cruza la polilínea resultante con las zonas delictivas registradas en Supabase (PostGIS).
-Renderizado de la Polilínea: El Backend devuelve las coordenadas procesadas al cliente, y el Front-End dibuja el trazado seguro en pantalla usando el componente <Polyline />.

Tecnologías Principales
- **Expo**: `~57.0.27`
- **React Native**: `0.86.3`
- **React**: `19.2.3`
- **Supabase JS**: `^2.108.0`
- **TypeScript**: `~6.0.3`
