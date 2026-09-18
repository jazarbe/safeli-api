function formatDuration(seconds) {
  if (seconds <= 0) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function parseCoordinatePair(value, label) {
  if (Array.isArray(value)) {
    if (value.length < 2) {
      throw new Error(`${label} debe incluir [lng, lat]`);
    }
    return [Number(value[0]), Number(value[1])];
  }

  if (value && typeof value === 'object') {
    const lng = value.lng ?? value.longitud ?? value.longitude ?? value.lon ?? value.x;
    const lat = value.lat ?? value.latitud ?? value.latitude ?? value.y;

    if (lng === undefined || lat === undefined) {
      throw new Error(`${label} no tiene coordenadas válidas`);
    }

    return [Number(lng), Number(lat)];
  }

  if (typeof value === 'string') {
    const parts = value.split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return [Number(parts[0]), Number(parts[1])];
    }
  }

  throw new Error(`${label} inválido`);
}

module.exports = { formatDuration, formatDistance, parseCoordinatePair };