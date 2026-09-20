# 🌍 WeatherNow

> Real-time weather at your fingertips — search any city, woreda, or kebele worldwide.

![WeatherNow App](https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 🔗 Live Demo

**👉 [https://yimencodehub.github.io/weather-app/](https://yimencodehub.github.io/weather-app/)**

---

## 📸 Features

| Feature | Description |
|---|---|
| 🌡️ **Temperature** | Current, Max & Min in °C |
| 💧 **Humidity** | Air moisture level % |
| 💨 **Wind Speed** | Speed in km/h |
| ⛅ **Sky Condition** | Clear, Cloudy, Rain, Snow… |
| 📅 **Any Date** | Historical (1940+) or future forecasts |
| 🌍 **Anywhere** | From kebele to country — worldwide |
| ⚡ **Instant Results** | Live data, no delay |

---

## 🕐 Date Range Support

| Mode | Coverage |
|---|---|
| 📜 **Historical** | From **January 1940** to yesterday |
| 🕐 **Now** | Real-time current weather |
| 🔮 **Forecast** | Up to **6 months** ahead |

---

## 🛠️ Built With

- **HTML5** — Structure & layout
- **CSS3** — Glassmorphism design, animations
- **Vanilla JavaScript** — Logic & API calls
- **[Open-Meteo API](https://open-meteo.com/)** — Free weather data (no API key needed)
- **[Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/)** — Free geocoding (no API key needed)

> ✅ **100% Free** — No sign-up, no API key, no cost.

---

## 🚀 How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/Yimencodehub/weather-app.git

# 2. Open the folder
cd weather-app

# 3. Open index.html in your browser
# (Double-click index.html or use Live Server in VS Code)
```

---

## 📁 Project Structure

```
weather-app/
│
├── index.html      # Main HTML structure
├── styles.css      # All styling & animations
├── script.js       # Weather logic & API calls
└── README.md       # Project documentation
```

---

## 🌐 How It Works

```
1. User searches a city / woreda / kebele
        ↓
2. Nominatim API → converts name to coordinates (lat, lon)
        ↓
3. Open-Meteo API → fetches weather for those coordinates
        ↓
4. Results displayed instantly on screen
```

---

## 📅 Date Mode Logic

```
Selected Date
    ├── Before today  → Open-Meteo Archive API  (Historical 1940+)
    ├── Today         → Open-Meteo Forecast API (Real-time Now)
    ├── 1–16 days     → Open-Meteo Forecast API (Standard)
    └── 17–183 days   → Open-Meteo Seasonal API (6-month forecast)
```

---

## 👤 Author

**Yimen Anmaw**
- GitHub: [@Yimencodehub](https://github.com/Yimencodehub)

---

## 📄 License

This project is open source and free to use.

---

<div align="center">
  Made with ❤️ — WeatherNow
</div>
