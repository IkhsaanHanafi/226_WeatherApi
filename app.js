require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/lokasi", async (req, res) => {
    const kota = "Bandung City";
    const apiKey = process.env.MAPTILER_API_KEY;
    const baseUrl = process.env.MAPTILER_BASE_URL;

    const url = `${baseUrl}/${kota}.json?key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        const lokasi = data.features[0].matching_text;
        const koordinat = data.features[0].geometry.coordinates;

        res.json({
            kota: lokasi,
            koordinat: koordinat,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Gagal mengambil data dari MapTiler" });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});