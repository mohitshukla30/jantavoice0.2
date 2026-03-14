const express = require('express');
const cors = require('cors');
const aqiRoutes = require('./routes/aqiRoutes');

const app = express();
const PORT = 5001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/aqi', aqiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`✅ AQI server running at http://localhost:${PORT}`);
});
