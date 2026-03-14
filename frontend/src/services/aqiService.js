import axios from 'axios';

const aqiClient = axios.create({
  baseURL: 'http://localhost:5001/api/aqi',
  timeout: 10000,
});

export const aqiAPI = {
  getByCoords: (lat, lon) => aqiClient.get(`/?lat=${lat}&lon=${lon}`),
  getByCity:   (name)     => aqiClient.get(`/city?name=${encodeURIComponent(name)}`),
  getCities:   ()         => aqiClient.get('/cities'),
  getForecast: (lat, lon) => aqiClient.get(`/forecast?lat=${lat}&lon=${lon}`),
};
