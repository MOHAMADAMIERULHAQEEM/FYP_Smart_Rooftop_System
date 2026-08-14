// Firebase Configuration
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentMode = "AUTO";
let chartInstance = null;

// Navigation Switcher
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === 'page-2') {
    renderChart();
  }
}

// Realtime Database Listener
database.ref('rooftop_system').on('value', (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // Sync Mode Switch UI
  currentMode = data.mode || "AUTO";
  const switchInput = document.getElementById('mode-switch');
  const modeText = document.getElementById('mode-text');

  if (currentMode === "MANUAL") {
    switchInput.checked = true;
    modeText.innerText = "Manual";
  } else {
    switchInput.checked = false;
    modeText.innerText = "Auto";
  }

  // Update Telemetry Displays
  document.getElementById('temp-val').innerText = data.temp !== undefined ? data.temp : "--";
  document.getElementById('bright-val').innerText = data.brightness !== undefined ? data.brightness : "--";
  document.getElementById('humid-val').innerText = data.humidity !== undefined ? data.humidity : "--";
  document.getElementById('roof-status-display').innerText = data.roof_status || "CLOSED";

  // Append entry to table
  appendTableData(data);
});

// UI Actions
function toggleMode(checkbox) {
  const newMode = checkbox.checked ? "MANUAL" : "AUTO";
  database.ref('rooftop_system/mode').set(newMode);
}

function setRoofStatus(status) {
  if (currentMode === "AUTO") {
    alert("System is currently in AUTO mode. Toggle mode switch to Manual first.");
    return;
  }
  database.ref('rooftop_system/roof_status').set(status);
}

// Table Log Insertion
function appendTableData(data) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const source = (currentMode === "AUTO") ? "Auto" : "Manual";

  const row = `
    <tr>
      <td>${timestamp}</td>
      <td>${data.temp}°C</td>
      <td>${data.humidity}%</td>
      <td>${data.brightness}</td>
      <td>${data.is_raining ? "Rain" : "Dry"}</td>
      <td>${source}</td>
    </tr>
  `;

  tableBody.insertAdjacentHTML('afterbegin', row);
}

// Render Graph for Page 2
function renderChart() {
  const ctx = document.getElementById('telemetryChart');
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['10m', '8m', '6m', '4m', '2m', 'Now'],
      datasets: [
        { label: 'Temp (°C)', data: [28, 29, 31, 33, 35, 35], borderColor: '#ef4444', tension: 0.3 },
        { label: 'Humid (%)', data: [60, 55, 45, 38, 30, 30], borderColor: '#38bdf8', tension: 0.3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// PDF Export (Mobile WebViewer Compatible)
function exportPDF() {
  const element = document.getElementById('export-container');
  const opt = {
    margin: 8,
    filename: 'Rooftop_Telemetry_Report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}