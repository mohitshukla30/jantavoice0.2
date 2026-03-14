const express = require('express');
const cors = require('cors');
const aqiRoutes = require('./routes/aqiRoutes');

const app = express();
const PORT = process.env.AQI_PORT || 5001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  methods: ['GET'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/aqi', aqiRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'AQI Backend' }));

app.listen(PORT, () => {
  console.log(`✅ AQI server running at http://localhost:${PORT}`);
  console.log(`   GET /api/aqi?lat=18.52&lon=73.85`);
  console.log(`   GET /api/aqi/city?name=Pune`);
  console.log(`   GET /api/aqi/cities`);
  console.log(`   GET /api/aqi/forecast?lat=18.52&lon=73.85`);
});