const axios = require('axios');

exports.getAQI = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon required' });
        const key = process.env.OPENWEATHER_API_KEY;
        const [airRes, geoRes] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`),
            axios.get(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`)
        ]);
        const d = airRes.data.list[0];
        const aqi = d.main.aqi;
        const comp = d.components;
        const city = geoRes.data[0]?.name || 'Your Location';
        const AQI_MAP = {
            1: { label: 'Good', color: '#138808', emoji: '😊', advice: 'Air quality is good. Safe to go outside.', value: Math.round(comp.pm2_5 * 4 + 20) },
            2: { label: 'Satisfactory', color: '#8CC63F', emoji: '🙂', advice: 'Acceptable. Sensitive groups limit outdoor time.', value: Math.round(comp.pm2_5 * 4 + 55) },
            3: { label: 'Moderate', color: '#FF9933', emoji: '😐', advice: 'Moderate quality. Wear a mask outdoors.', value: Math.round(comp.pm2_5 * 4 + 105) },
            4: { label: 'Poor', color: '#E8720C', emoji: '😷', advice: 'Poor quality. Avoid outdoor exercise. Wear N95.', value: Math.round(comp.pm2_5 * 4 + 205) },
            5: { label: 'Very Poor', color: '#DC2626', emoji: '🚨', advice: 'Very poor! Stay indoors. Use air purifier if possible.', value: Math.round(comp.pm2_5 * 4 + 305) }
        };
        res.json({ success: true, city, aqi: AQI_MAP[aqi], rawAqi: aqi, components: { pm25: comp.pm2_5.toFixed(1), pm10: comp.pm10.toFixed(1), no2: comp.no2.toFixed(1), o3: comp.o3.toFixed(1) }, updatedAt: new Date() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
