Safeli calcula rutas óptimas evitando zonas de alto riesgo en tiempo real mediante la integración de **Supabase (PostGIS)**, **Node.js/Express**, **OpenRouteService** y **Mapbox/Leaflet**.

Integración de Mapas y Consumo de API
Para proteger las APIs de mapas y optimizar el procesamiento, la aplicación sigue un flujo de Backend Proxy:
1. **Visualización y Capas (Front-End):** 
   - Se utiliza **React Native Maps** / **Leaflet** para renderizar el mapa interactivo, la ubicación en tiempo real del usuario y los marcadores de alertas.
2. **Cálculo de Rutas Seguras (Backend Proxy):** 
   - El Front-End no consume directamente la API de rutas externas para no exponer llaves privadas. En su lugar, realiza una petición a nuestro Backend (`POST /api/routes/safe-route`).
   - El Backend consulta **OpenRouteService / Mapbox**, cruza los datos con la base de datos de zonas de riesgo en **Supabase (PostGIS)** y retorna la ruta calculada al cliente en formato GeoJSON/Polyline.
3. **Renderizado de Ruta:** 
   - El Front-End dibuja la polilínea recibida sobre el mapa usando el componente `<Polyline />`.

Pasos para Ejecutar el Proyecto: El proyecto está dividido en dos repositorios independientes (Backend y Frontend). Sigue estos pasos en orden:
1. Clonar el repositorio de Backend e instalar dependencias
git clone https://github.com/jazarbe/safeli-api.git
2. Entrar a la carpeta de safeli
cd safeli
4. Instalar laws dependencias
npm install

2. Configurar Variables de Entorno
Descarga el archivo .env en la raíz del backend.

3. Preparar la Base de Datos (Supabase)
Configuración de la Base de Datos (Supabase)
- Crea un nuevo proyecto en el panel de Supabase
- Anda a Database > Extensions, busca postgis y habilítala (es indispensable para realizar consultas de distancia e intersección de rutas).
- Anda al SQL Editor en el menú lateral izquierdo, crea una nueva consulta y ejecuta el script de inicialización.

4. Iniciar el Servidor
npm run dev

5. Clonar el repositorio de Frontend
git clone https://github.com/ddianapark/Safeli_FrontEnd.git
6. Entrar a la carpeta del front
cd Safeli_FrontEnd
8. Instalar dependencias
npm install

9. Configurar Variables de Entorno
Descarga el archivo .env en la raíz del frontend.

10. Iniciar el servidor de desarrollo:
npx expo start // npm run start

4.EndPoints

Método | Endpoint               | Descripción                                                       | Body / Params

POST   | /api/routes/safe-route | Calcula y devuelve la ruta más segura entre dos puntos.           | { "origin": [lng, lat], "destination": [lng, lat] }

GET    | /api/risk-zones        | Obtiene los puntos/zonas de riesgo activos para pintar en el mapa.| Query opcional: ?lat=...&lng=...&radius=5000

POST   | /api/risk-zones        | Permite a un usuario reportar un nuevo incidente o zona peligrosa.| { "title": "...", "risk_level": 4, "lat": ..., "lng": ... }

5. Tecnologías Principales
-Frontend
Expo: ~57.0.27
React Native: 0.86.3
React: 19.2.3
TypeScript: ~6.0.3
React Native Maps / Leaflet: Renderizado de mapas y polilíneas.

-Backend y Base de Datos
Node.js & Express: Servidor API REST y proxy de mapas.
Supabase JS: ^2.108.0
PostgreSQL + PostGIS: Almacenamiento y consultas geoespaciales.
OpenRouteService / Mapbox API: Cálculo de matrices de distancia y rutas.
