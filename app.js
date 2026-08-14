// Firebase Configuration
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentMode = "AUTO";
let chartInstance = null;

// Page Navigation
function switchPage(pageName) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  if (pageName === 'control') {
    document.getElementById('control-page').classList.add('active');
    event.target.classList.add('active');
  } else {
    document.getElementById('analytics-page').classList.add('active');
    event.target.classList.add('active');
    renderChart();
  }
}

// ----------------------------------------------------
// REALTIME FIREBASE LISTENERS
// ----------------------------------------------------
database.ref('rooftop_system').on('value', (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // Mode Display & Dynamic Badge Styling
  currentMode = data.mode || "AUTO";
  const modeDisplay = document.getElementById('mode-display');
  const modeBtn = document.getElementById('btn-toggle-mode');
  
  if (modeDisplay) modeDisplay.innerText = currentMode;
  
  if (modeBtn) {
    if (currentMode === "AUTO") {
      modeBtn.className = "badge-btn mode-auto";
    } else {
      modeBtn.className = "badge-btn mode-manual";
    }
  }

  // Roof Status & Telemetry Updates
  document.getElementById('roof-status-display').innerText = data.roof_status || "CLOSED";
  document.getElementById('temp-val').innerText = data.temp !== undefined ? data.temp : "--";
  document.getElementById('humidity-val').innerText = data.humidity !== undefined ? data.humidity : "--";
  document.getElementById('brightness-val').innerText = data.brightness !== undefined ? data.brightness : "--";
  document.getElementById('rain-val').innerText = data.is_raining ? "DETECTED" : "DRY";

  // Append real-time entry to history table
  appendTableData(data);
});

// ----------------------------------------------------
// CONTROL HUB ACTIONS
// ----------------------------------------------------
function toggleMode() {
  const newMode = (currentMode === "AUTO") ? "MANUAL" : "AUTO";
  database.ref('rooftop_system/mode').set(newMode);
}

function setRoofStatus(status) {
  if (currentMode === "AUTO") {
    alert("System is currently in AUTO mode. Toggle the MODE badge to MANUAL to enable manual controls.");
    return;
  }
  database.ref('rooftop_system/roof_status').set(status);
}

// ----------------------------------------------------
// HISTORICAL TABLE & ANALYTICS CHART
// ----------------------------------------------------
function appendTableData(data) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  const timestamp = new Date().toLocaleTimeString();
  
  const row = `
    <tr>
      <td>${timestamp}</td>
      <td>${data.temp}°C</td>
      <td>${data.humidity}%</td>
      <td>${data.brightness}</td>
      <td>${data.is_raining ? "YES" : "NO"}</td>
      <td>${data.roof_status}</td>
    </tr>
  `;
  
  tableBody.insertAdjacentHTML('afterbegin', row);
}

function renderChart() {
  const ctx = document.getElementById('telemetryChart');
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['10m ago', '8m ago', '6m ago', '4m ago', '2m ago', 'Now'],
      datasets: [
        { label: 'Temp (°C)', data: [28, 29, 31, 33, 35, 35], borderColor: '#ef4444', fill: false },
        { label: 'Humidity (%)', data: [60, 55, 45, 38, 30, 30], borderColor: '#38bdf8', fill: false }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ----------------------------------------------------
// MOBILE WEBVIEWER PDF EXPORT (html2pdf)
// ----------------------------------------------------
function exportPDF() {
  const element = document.getElementById('analytics-export-area');
  if (!element) return;

  const opt = {
    margin:       10,
    filename:     'Rooftop_Telemetry_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}