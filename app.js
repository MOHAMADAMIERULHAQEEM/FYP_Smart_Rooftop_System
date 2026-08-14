// Firebase Configuration
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentMode = "AUTO";
let chartInstance = null;

// Local logs cache for table filtering
let rawTelemetryLogs = []; 
let activeFilter = "all";

// Navigation Switcher
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === 'page-2') {
    renderChart();
  }
}

// ----------------------------------------------------
// REALTIME FIREBASE LISTENER
// ----------------------------------------------------
database.ref('rooftop_system').on('value', (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // Sync Mode Switch UI
  currentMode = data.mode || "AUTO";
  const switchInput = document.getElementById('mode-switch');
  const modeText = document.getElementById('mode-text');

  if (switchInput && modeText) {
    if (currentMode === "MANUAL") {
      switchInput.checked = true;
      modeText.innerText = "Manual";
    } else {
      switchInput.checked = false;
      modeText.innerText = "Auto";
    }
  }

  // Update Top & Center Telemetry Display
  document.getElementById('temp-val').innerText = data.temp !== undefined ? data.temp : "--";
  document.getElementById('bright-val').innerText = data.brightness !== undefined ? data.brightness : "--";
  document.getElementById('humid-val').innerText = data.humidity !== undefined ? data.humidity : "--";
  document.getElementById('roof-status-display').innerText = data.roof_status || "CLOSED";

  // Cache entry with timestamp for filtering
  const newRecord = {
    timestamp: new Date(),
    temp: data.temp !== undefined ? data.temp : "--",
    humidity: data.humidity !== undefined ? data.humidity : "--",
    brightness: data.brightness !== undefined ? data.brightness : "--",
    is_raining: data.is_raining ? "YES" : "NO",
    roof_status: data.roof_status || "CLOSED"
  };

  rawTelemetryLogs.unshift(newRecord);
  renderFilteredTable();
});

// ----------------------------------------------------
// MANUAL CONTROLS
// ----------------------------------------------------
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

// ----------------------------------------------------
// TABLE FILTERING (ALL TIME / 24 HOURS / 7 DAYS)
// ----------------------------------------------------
function applyTableFilter(filterValue) {
  activeFilter = filterValue;
  renderFilteredTable();
}

function renderFilteredTable() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  const now = new Date();
  let filteredLogs = rawTelemetryLogs;

  if (activeFilter === "24h") {
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    filteredLogs = rawTelemetryLogs.filter(log => log.timestamp >= twentyFourHoursAgo);
  } else if (activeFilter === "7d") {
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    filteredLogs = rawTelemetryLogs.filter(log => log.timestamp >= sevenDaysAgo);
  }

  let rowsHtml = "";
  filteredLogs.forEach(log => {
    const timeStr = log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = log.timestamp.toLocaleDateString();
    
    rowsHtml += `
      <tr>
        <td>${timeStr}<br><small style="color:#64748b">${dateStr}</small></td>
        <td>${log.temp}°C</td>
        <td>${log.humidity}%</td>
        <td>${log.brightness}</td>
        <td>${log.is_raining}</td>
        <td><strong>${log.roof_status}</strong></td>
      </tr>
    `;
  });

  tableBody.innerHTML = rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="6" style="text-align:center;">No data available for this range.</td></tr>`;
}

// ----------------------------------------------------
// CHART RENDER
// ----------------------------------------------------
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

// ----------------------------------------------------
// MOBILE WEBVIEWER COMPATIBLE PDF EXPORTER
// ----------------------------------------------------
function exportMobilePDF() {
  // Construct clean standalone HTML document container
  const reportElement = document.createElement('div');
  
  let rowsHtml = "";
  rawTelemetryLogs.forEach(log => {
    rowsHtml += `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${log.timestamp.toLocaleString()}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${log.temp} °C</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${log.humidity} %</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${log.brightness} Lux</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${log.is_raining}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;"><strong>${log.roof_status}</strong></td>
      </tr>
    `;
  });

  reportElement.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #1e293b;">
      <h2 style="text-align: center; margin-bottom: 5px;">SMART ROOFTOP TELEMETRY REPORT</h2>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 0;">
        Generated: ${new Date().toLocaleString()} | Filter Range: ${activeFilter.toUpperCase()}
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 8px; border: 1px solid #0f172a;">Timestamp</th>
            <th style="padding: 8px; border: 1px solid #0f172a;">Temp</th>
            <th style="padding: 8px; border: 1px solid #0f172a;">Humidity</th>
            <th style="padding: 8px; border: 1px solid #0f172a;">Brightness</th>
            <th style="padding: 8px; border: 1px solid #0f172a;">Rain</th>
            <th style="padding: 8px; border: 1px solid #0f172a;">Roof Position</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align:center; padding:10px;">No telemetry data logged yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  const opt = {
    margin:       8,
    filename:     'Rooftop_Telemetry_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Convert and trigger instant download on mobile
  html2pdf().set(opt).from(reportElement).save();
}