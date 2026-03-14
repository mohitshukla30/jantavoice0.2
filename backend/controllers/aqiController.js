const axios = require('axios');

const OW_KEY = () => 'c961d4568cefec2a540ba39187c81597';
const IS_DEMO = () => false;

// AQI level mapping
function getAQILevel(aqi) {
    const levels = {
        1: { label: 'Good', color: '#00C853', bg: '#E8F5E9', emoji: '😊', advice: 'Air quality is excellent. Perfect for outdoor activities.', risk: 'None' },
        2: { label: 'Fair', color: '#64DD17', bg: '#F1F8E9', emoji: '🙂', advice: 'Air quality is acceptable. Sensitive groups take light precaution.', risk: 'Very Low' },
        3: { label: 'Moderate', color: '#FFD600', bg: '#FFFDE7', emoji: '😐', advice: 'Moderate pollution. Wear a mask for prolonged outdoor activity.', risk: 'Moderate' },
        4: { label: 'Poor', color: '#FF6D00', bg: '#FFF3E0', emoji: '😷', advice: 'Unhealthy for sensitive groups. Limit time outside. Wear N95.', risk: 'High' },
        5: { label: 'Very Poor', color: '#D50000', bg: '#FFEBEE', emoji: '🚨', advice: 'Hazardous! Stay indoors. Use air purifier. Avoid all outdoor activity.', risk: 'Very High' },
    };
    return levels[aqi] || levels[3];
}

function calcIndianAQI(components) {
    const pm25 = components.pm2_5 || 0;
    if (pm25 <= 30) return Math.round((50 / 30) * pm25);
    if (pm25 <= 60) return Math.round(50 + (50 / 30) * (pm25 - 30));
    if (pm25 <= 90) return Math.round(100 + (100 / 30) * (pm25 - 60));
    if (pm25 <= 120) return Math.round(200 + (100 / 30) * (pm25 - 90));
    if (pm25 <= 250) return Math.round(300 + (100 / 130) * (pm25 - 120));
    return Math.round(400 + (100 / 130) * (pm25 - 250));
}

// GET /api/aqi?lat=X&lon=Y
exports.getAQI = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon required' });

        const [airRes, geoRes] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OW_KEY()}`),
            axios.get(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OW_KEY()}`),
        ]);

        const d = airRes.data.list[0];
        const rawAqi = d.main.aqi;
        const comp = d.components;
        const geo = geoRes.data[0] || {};
        const aqiVal = calcIndianAQI(comp);
        const level = getAQILevel(rawAqi);

        res.json({
            success: true,
            city: geo.name || 'Unknown',
            state: geo.state || '',
            country: geo.country || 'IN',
            coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
            aqi: { ...level, value: aqiVal },
            components: {
                pm25: comp.pm2_5.toFixed(1),
                pm10: comp.pm10.toFixed(1),
                no2: comp.no2.toFixed(1),
                o3: comp.o3.toFixed(1),
                co: comp.co.toFixed(1),
                so2: comp.so2.toFixed(1),
            },
            rawAqi,
            updatedAt: new Date(),
            isDemo: false,
        });
    } catch (err) {
        console.error('getAQI error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/aqi/city?name=Mumbai
exports.getAQIByCity = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ success: false, message: 'City name required' });

        const geoRes = await axios.get(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(name)},IN&limit=1&appid=${OW_KEY()}`
        );
        if (!geoRes.data.length) return res.status(404).json({ success: false, message: `City "${name}" not found` });

        const { lat, lon, name: cityName, state } = geoRes.data[0];
        const airRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OW_KEY()}`
        );

        const d = airRes.data.list[0];
        const comp = d.components;
        const level = getAQILevel(d.main.aqi);
        const val = calcIndianAQI(comp);

        res.json({
            success: true, city: cityName, state: state || '', country: 'IN',
            coordinates: { lat, lon },
            aqi: { ...level, value: val },
            components: {
                pm25: comp.pm2_5.toFixed(1), pm10: comp.pm10.toFixed(1),
                no2: comp.no2.toFixed(1), o3: comp.o3.toFixed(1),
                co: comp.co.toFixed(1), so2: comp.so2.toFixed(1),
            },
            rawAqi: d.main.aqi, updatedAt: new Date(), isDemo: false,
        });
    } catch (err) {
        console.error('getAQIByCity error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/aqi/cities — 12 major Indian cities
exports.getMajorCities = async (req, res) => {
    const CITIES = [
        { name: 'Delhi',      lat: 28.6139, lon: 77.2090 },
        { name: 'Mumbai',     lat: 19.0760, lon: 72.8777 },
        { name: 'Bangalore',  lat: 12.9716, lon: 77.5946 },
        { name: 'Hyderabad',  lat: 17.3850, lon: 78.4867 },
        { name: 'Chennai',    lat: 13.0827, lon: 80.2707 },
        { name: 'Kolkata',    lat: 22.5726, lon: 88.3639 },
        { name: 'Pune',       lat: 18.5204, lon: 73.8567 },
        { name: 'Ahmedabad',  lat: 23.0225, lon: 72.5714 },
        { name: 'Jaipur',     lat: 26.9124, lon: 75.7873 },
        { name: 'Lucknow',    lat: 26.8467, lon: 80.9462 },
        { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
        { name: 'Bhopal',     lat: 23.2599, lon: 77.4126 },
    ];

    try {
        const results = await Promise.allSettled(
            CITIES.map(city =>
                axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${OW_KEY()}`)
                    .then(r => {
                        const d = r.data.list[0];
                        const val = calcIndianAQI(d.components);
                        return { ...city, aqi: { ...getAQILevel(d.main.aqi), value: val }, pm25: d.components.pm2_5.toFixed(1), isDemo: false };
                    })
            )
        );
        const cities = results.map((r, i) =>
            r.status === 'fulfilled' ? r.value : { ...CITIES[i], aqi: { label: 'N/A', color: '#9E9E9E', value: 0 }, error: true }
        );
        res.json({ success: true, cities });
    } catch (err) {
        console.error('getMajorCities error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/aqi/forecast?lat=X&lon=Y
exports.getForecast = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon required' });

        const r = await axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${OW_KEY()}`
        );

        const byDay = {};
        r.data.list.forEach(item => {
            const d = new Date(item.dt * 1000);
            const key = d.toDateString();
            if (!byDay[key] || Math.abs(d.getHours() - 12) < Math.abs(new Date(byDay[key].dt * 1000).getHours() - 12)) {
                byDay[key] = item;
            }
        });

        const forecast = Object.entries(byDay).slice(0, 5).map(([dateStr, item]) => ({
            date: new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
            aqi: { ...getAQILevel(item.main.aqi), value: calcIndianAQI(item.components) },
            pm25: item.components.pm2_5.toFixed(1),
        }));

        res.json({ success: true, forecast });
    } catch (err) {
        console.error('getForecast error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};