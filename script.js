// ── APIs (all free, no key/sign-up) ─────────────────────────────────────────
const nominatimUrl  = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&addressdetails=1&q=";
const forecastUrl   = "https://api.open-meteo.com/v1/forecast";
const historicalUrl = "https://archive-api.open-meteo.com/v1/archive";
const seasonalUrl   = "https://seasonal-api.open-meteo.com/v1/seasonal";

const EARLIEST_DATE = "1940-01-01";   // Open-Meteo archive limit
const STD_FORECAST_DAYS = 16;         // Standard forecast limit
// Seasonal covers up to ~9 months — we allow 6 months (≈183 days)

// ── DOM ──────────────────────────────────────────────────────────────────────
const welcomeScreen  = document.getElementById("welcome-screen");
const appScreen      = document.getElementById("app-screen");
const getStartedBtn  = document.getElementById("get-started-btn");
const backBtn        = document.getElementById("back-btn");
const searchBox      = document.getElementById("city-input");
const searchBtn      = document.getElementById("search-btn");
const weatherDiv     = document.querySelector(".weather");
const errorDiv       = document.querySelector(".error");
const loadingDiv     = document.querySelector(".loading");
const hintText       = document.getElementById("hint-text");
const btnNow         = document.getElementById("btn-now");
const btnDate        = document.getElementById("btn-date");
const datePickerWrap = document.getElementById("date-picker-wrap");
const dateInput      = document.getElementById("date-input");
const dateDisplay    = document.getElementById("date-display");
const dateBadge      = document.getElementById("date-badge");
const tempCurrent    = document.getElementById("temp-current");
const tempRange      = document.getElementById("temp-range");
const precipCol      = document.getElementById("precip-col");

// ── State ─────────────────────────────────────────────────────────────────────
let currentMode    = "now";
let cachedLocation = null;

// ── Date Bounds ───────────────────────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().split("T")[0];
}
function sixMonthsAheadStr() {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
}
function daysDiff(dateStr) {
    const today = new Date(todayStr() + "T00:00:00");
    const target = new Date(dateStr + "T00:00:00");
    return Math.round((target - today) / 86400000);
}

// ── Set date input bounds ─────────────────────────────────────────────────────
function setDateBounds() {
    dateInput.min = EARLIEST_DATE;
    dateInput.max = sixMonthsAheadStr();
}

// ── Date display helpers ──────────────────────────────────────────────────────
const DAY_NAMES   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function updateDateDisplay(dateStr) {
    if (!dateStr) { dateDisplay.textContent = ""; return; }
    const d = parseLocalDate(dateStr);
    dateDisplay.textContent = `${DAY_NAMES[d.getDay()]},  ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function friendlyDate(dateStr) {
    const d = parseLocalDate(dateStr);
    return `${DAY_NAMES[d.getDay()].slice(0,3)}  ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Weather code → emoji + label ─────────────────────────────────────────────
function getWeatherInfo(code) {
    if (code === 0)  return { emoji:"☀️",  label:"Clear Sky"     };
    if (code <= 2)   return { emoji:"⛅",  label:"Partly Cloudy" };
    if (code === 3)  return { emoji:"☁️",  label:"Overcast"      };
    if (code <= 49)  return { emoji:"🌫️", label:"Foggy / Mist"  };
    if (code <= 55)  return { emoji:"🌦️", label:"Drizzle"       };
    if (code <= 67)  return { emoji:"🌧️", label:"Rain"          };
    if (code <= 77)  return { emoji:"❄️",  label:"Snow"          };
    if (code <= 82)  return { emoji:"🌧️", label:"Rain Showers"  };
    if (code <= 86)  return { emoji:"🌨️", label:"Snow Showers"  };
    return                  { emoji:"⛈️",  label:"Thunderstorm"  };
}

// ── Nominatim helpers ─────────────────────────────────────────────────────────
function getPlaceName(result) {
    const a = result.address;
    return a.hamlet || a.village || a.suburb || a.neighbourhood ||
           a.town || a.city || a.municipality || a.county ||
           a.state_district || a.state || a.country || result.name || "Unknown";
}
function buildLocationPath(address) {
    const levels = [address.suburb, address.village, address.town, address.municipality,
                    address.county, address.state_district, address.state, address.country];
    const seen = new Set(), parts = [];
    for (const p of levels) { if (p && !seen.has(p)) { seen.add(p); parts.push(p); } }
    return parts.join("  ›  ");
}

// ── Show / Hide ───────────────────────────────────────────────────────────────
function show(el) { el.style.display = "flex"; }
function hide(el) { el.style.display = "none"; }

// ── Error helper ──────────────────────────────────────────────────────────────
function showError(msg) {
    document.getElementById("error-msg").textContent = msg || "Something went wrong.";
    hide(loadingDiv); hide(weatherDiv); show(errorDiv);
}

// ── Ensemble mean helper (seasonal API returns member01…member50) ─────────────
function ensembleMean(daily, key) {
    const members = Object.keys(daily).filter(k => k.startsWith(key));
    if (members.length === 0) return null;
    // Find the index for our date (first entry)
    const values = members.map(m => daily[m][0]).filter(v => v != null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Render Weather Result ─────────────────────────────────────────────────────
function renderWeather({ emoji, label, placeName, locPath, dateStr,
                         temp, tempMax, tempMin, humidity, wind, precip, isSeasonal }) {
    document.getElementById("weather-emoji").textContent   = emoji;
    document.getElementById("condition-label").textContent = label;
    document.getElementById("place-name").textContent      = placeName;
    document.getElementById("location-path").textContent   = locPath;

    if (dateStr) {
        dateBadge.innerHTML  = `📅 &nbsp;${friendlyDate(dateStr)}` +
            (isSeasonal ? ' &nbsp;<span style="font-size:10px;opacity:0.6">(Seasonal Forecast)</span>' : "");
        dateBadge.style.display  = "inline-flex";
        tempCurrent.style.display = "none";
        tempRange.style.display   = "block";
        document.getElementById("temp-max").textContent = Math.round(tempMax) + "°C";
        document.getElementById("temp-min").textContent = Math.round(tempMin) + "°C";
        precipCol.style.display = "flex";
        document.getElementById("precip-val").textContent = (precip != null ? parseFloat(precip).toFixed(1) : "--") + " mm";
    } else {
        dateBadge.style.display   = "none";
        tempCurrent.style.display = "block";
        tempRange.style.display   = "none";
        document.getElementById("temp-val").textContent = Math.round(temp) + "°C";
        precipCol.style.display = "none";
    }

    document.getElementById("humidity-val").textContent = (humidity != null ? Math.round(humidity) : "--") + "%";
    document.getElementById("wind-val").textContent     = (wind != null ? Math.round(wind) : "--") + " km/h";

    hide(loadingDiv); hide(errorDiv); hide(hintText);
    weatherDiv.style.display = "block";
}

// ── Core fetch logic ──────────────────────────────────────────────────────────
async function fetchWeather(loc, mode, dateStr) {
    hide(weatherDiv); hide(errorDiv); hide(hintText);
    show(loadingDiv);

    try {
        // ── NOW: current real-time weather ────────────────────────────────────
        if (mode === "now") {
            const url = `${forecastUrl}?latitude=${loc.lat}&longitude=${loc.lon}` +
                        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
                        `&wind_speed_unit=kmh`;
            const data = await (await fetch(url)).json();
            const c = data.current;
            const { emoji, label } = getWeatherInfo(c.weather_code);
            renderWeather({ emoji, label, placeName: loc.name, locPath: loc.path,
                            dateStr: null, temp: c.temperature_2m,
                            humidity: c.relative_humidity_2m, wind: c.wind_speed_10m });
            return;
        }

        // ── DATE mode ─────────────────────────────────────────────────────────
        if (!dateStr) return;

        // Validate bounds
        if (dateStr < EARLIEST_DATE) {
            showError(`⚠️ ታሪካዊ ቀን ገደብ: ከ ${EARLIEST_DATE} (January 1940) ጀምሮ ብቻ ነው የሚሠራው። ከዚያ በፊት ምንም digital weather record አልነበረም።`);
            return;
        }

        const diff = daysDiff(dateStr);

        if (diff > 183) {
            showError("⚠️ ወደፊት ገደብ: እስከ 6 ወራት (183 ቀናት) ብቻ ነው forecast ያለ።");
            return;
        }

        // ── HISTORICAL (1940-01-01 to yesterday) ─────────────────────────────
        if (diff <= 0) {
            const url = `${historicalUrl}?latitude=${loc.lat}&longitude=${loc.lon}` +
                        `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,` +
                        `wind_speed_10m_max,precipitation_sum,weather_code` +
                        `&wind_speed_unit=kmh&start_date=${dateStr}&end_date=${dateStr}`;
            const data = await (await fetch(url)).json();

            if (!data.daily?.time?.length) { showError("ለዚህ ቀን ዳታ አልተገኘም።"); return; }
            const d = data.daily;
            const { emoji, label } = getWeatherInfo(d.weather_code[0]);
            renderWeather({ emoji, label, placeName: loc.name, locPath: loc.path, dateStr,
                            tempMax: d.temperature_2m_max[0], tempMin: d.temperature_2m_min[0],
                            humidity: d.relative_humidity_2m_max[0], wind: d.wind_speed_10m_max[0],
                            precip: d.precipitation_sum[0] });
            return;
        }

        // ── STANDARD FORECAST (today → +16 days) ─────────────────────────────
        if (diff <= STD_FORECAST_DAYS) {
            const url = `${forecastUrl}?latitude=${loc.lat}&longitude=${loc.lon}` +
                        `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,` +
                        `wind_speed_10m_max,precipitation_sum,weather_code` +
                        `&wind_speed_unit=kmh&start_date=${dateStr}&end_date=${dateStr}`;
            const data = await (await fetch(url)).json();

            if (!data.daily?.time?.length) { showError("ለዚህ ቀን ዳታ አልተገኘም።"); return; }
            const d = data.daily;
            const { emoji, label } = getWeatherInfo(d.weather_code[0]);
            renderWeather({ emoji, label, placeName: loc.name, locPath: loc.path, dateStr,
                            tempMax: d.temperature_2m_max[0], tempMin: d.temperature_2m_min[0],
                            humidity: d.relative_humidity_2m_max[0], wind: d.wind_speed_10m_max[0],
                            precip: d.precipitation_sum[0] });
            return;
        }

        // ── SEASONAL FORECAST (+17 days → +6 months) ─────────────────────────
        const url = `${seasonalUrl}?latitude=${loc.lat}&longitude=${loc.lon}` +
                    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
                    `&start_date=${dateStr}&end_date=${dateStr}`;
        const data = await (await fetch(url)).json();

        if (!data.daily?.time?.length) { showError("ለዚህ ቀን ዳታ አልተገኘም።"); return; }
        const d = data.daily;

        // Average across ensemble members
        const tMax   = ensembleMean(d, "temperature_2m_max");
        const tMin   = ensembleMean(d, "temperature_2m_min");
        const precip = ensembleMean(d, "precipitation_sum");

        // No weather_code in seasonal — pick emoji from temp
        const avgTemp = (tMax + tMin) / 2;
        let emoji = "🌤️", label = "Seasonal Forecast";
        if (precip > 5)      { emoji = "🌧️"; label = "Likely Rainy"; }
        else if (avgTemp < 5) { emoji = "❄️"; label = "Likely Cold";  }
        else if (avgTemp > 30){ emoji = "☀️"; label = "Likely Hot";   }

        renderWeather({ emoji, label, placeName: loc.name, locPath: loc.path, dateStr,
                        tempMax: tMax, tempMin: tMin, humidity: null, wind: null,
                        precip, isSeasonal: true });

    } catch (err) {
        console.error(err);
        showError("Network error. Please check your internet connection.");
    }
}

// ── Geocode then fetch ────────────────────────────────────────────────────────
async function geocodeAndFetch(query) {
    hide(weatherDiv); hide(errorDiv); hide(hintText);
    show(loadingDiv);
    try {
        const geoRes  = await fetch(nominatimUrl + encodeURIComponent(query), {
            headers: { "User-Agent": "WeatherNowApp/1.0 (educational)" }
        });
        const geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) {
            showError("Location not found. Try a different spelling."); return;
        }
        const result = geoData[0];
        cachedLocation = {
            lat : parseFloat(result.lat),
            lon : parseFloat(result.lon),
            name: getPlaceName(result),
            path: buildLocationPath(result.address)
        };
        const dateStr = (currentMode === "date" && dateInput.value) ? dateInput.value : null;
        await fetchWeather(cachedLocation, currentMode, dateStr);
    } catch (err) {
        console.error(err);
        showError("Network error. Please check your internet connection.");
    }
}

// ── Screen Navigation ─────────────────────────────────────────────────────────
getStartedBtn.addEventListener("click", () => {
    welcomeScreen.style.display = "none";
    appScreen.style.display     = "flex";
    setDateBounds();
    searchBox.focus();
});
backBtn.addEventListener("click", () => {
    appScreen.style.display     = "none";
    welcomeScreen.style.display = "flex";
    resetApp();
});
function resetApp() {
    searchBox.value = ""; cachedLocation = null; currentMode = "now";
    btnNow.classList.add("active"); btnDate.classList.remove("active");
    datePickerWrap.style.display = "none";
    dateInput.value = ""; dateDisplay.textContent = "";
    hide(weatherDiv); hide(errorDiv); hide(loadingDiv); show(hintText);
}

// ── Mode Toggle ───────────────────────────────────────────────────────────────
btnNow.addEventListener("click", () => {
    currentMode = "now";
    btnNow.classList.add("active"); btnDate.classList.remove("active");
    datePickerWrap.style.display = "none";
    if (cachedLocation) fetchWeather(cachedLocation, "now", null);
});
btnDate.addEventListener("click", () => {
    currentMode = "date";
    btnDate.classList.add("active"); btnNow.classList.remove("active");
    datePickerWrap.style.display = "block";
    setDateBounds();
    if (!dateInput.value) { dateInput.value = todayStr(); updateDateDisplay(dateInput.value); }
    if (cachedLocation) fetchWeather(cachedLocation, "date", dateInput.value);
});
dateInput.addEventListener("change", () => {
    updateDateDisplay(dateInput.value);
    if (cachedLocation && dateInput.value) fetchWeather(cachedLocation, "date", dateInput.value);
});

// ── Search Events ─────────────────────────────────────────────────────────────
searchBtn.addEventListener("click", () => {
    const q = searchBox.value.trim(); if (q) geocodeAndFetch(q);
});
searchBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") { const q = searchBox.value.trim(); if (q) geocodeAndFetch(q); }
});