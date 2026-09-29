require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

const cari = (list, ...tipe) =>
    list.find((c) => tipe.some((t) => c.id.startsWith(t + ".")))?.text;

const formatKoordinat = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

async function ambilCuaca(latitude, longitude) {
    try {
        const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
            params: {
                latitude,
                longitude,
                current:
                    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
                daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
                timezone: "auto",
                forecast_days: 1,
            },
        });

        return {
            timezone: data.timezone,
            suhu: data.current.temperature_2m,
            terasa: data.current.apparent_temperature,
            kelembapan: data.current.relative_humidity_2m,
            angin: data.current.wind_speed_10m,
            kode: data.current.weather_code,
            siang: data.current.is_day === 1,
            max: data.daily.temperature_2m_max[0],
            min: data.daily.temperature_2m_min[0],
            sunrise: data.daily.sunrise[0].slice(11, 16),
            sunset: data.daily.sunset[0].slice(11, 16),
        };
    } catch (error) {
        console.error("CUACA GAGAL:", error.message);
        return null;
    }
}

app.get("/api/lokasi", async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q) {
        return res.status(400).json({ message: "Lokasi wajib diisi" });
    }

    const apiKey = process.env.MAPTILER_API_KEY;
    const baseUrl = process.env.MAPTILER_BASE_URL;

    // kalau q berupa "lng,lat" berarti reverse geocoding (dari tombol Lokasi Saya)
    const path_ = formatKoordinat.test(q) ? q : encodeURIComponent(q);
    const url = `${baseUrl}/${path_}.json`;

    try {
        const response = await axios.get(url, {
            params: { key: apiKey, language: "id", limit: 1 },
        });

        const feature = response.data.features[0];
        if (!feature) {
            return res.status(404).json({ message: "Lokasi tidak ditemukan" });
        }

        const semua = [feature, ...(feature.context || [])];
        const [longitude, latitude] = feature.center || feature.geometry.coordinates;

        const cuaca = await ambilCuaca(latitude, longitude);

        res.json({
            lokasi: feature.place_name,
            negara: cari(semua, "country") || "-",
            provinsi: cari(semua, "region") || "-",
            kecamatan:
                cari(semua, "municipality", "county", "subregion", "locality") || "-",
            longitude,
            latitude,
            cuaca,
        });
    } catch (error) {
        console.error("STATUS:", error.response?.status);
        console.error("DATA  :", error.response?.data);
        console.error("MSG   :", error.message);
        res.status(500).json({
            message: "Gagal mengambil data dari MapTiler",
            status: error.response?.status,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});