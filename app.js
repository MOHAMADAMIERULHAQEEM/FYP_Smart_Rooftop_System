// Firebase Configuration
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentMode = "AUTO";
let chartInstance = null;

// Latest state holder
let latestState = {
  temp: "--",
  humidity: "--",
  brightness: "--",
  is_raining: "NO",
  roof_status: "CLOSED"
};

// Local storage for history logs
let rawTelemetryLogs = []; 
let activeFilter = "all";

// Page Navigation
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

  // Update Top & Center Live Displays
  document.getElementById('temp-val').innerText = data.temp !== undefined ? data.temp : "--";
  document.getElementById('bright-val').innerText = data.brightness !== undefined ? data.brightness : "--";
  document.getElementById('humid-val').innerText = data.humid !== undefined ? data.humid : (data.humidity !== undefined ? data.humidity : "--");
  document.getElementById('roof-status-display').innerText = data.roof_status || "CLOSED";

  // Cache latest values for interval timer
  latestState = {
    temp: data.temp !== undefined ? data.temp : "--",
    humidity: data.humid !== undefined ? data.humid : (data.humidity !== undefined ? data.humidity : "--"),
    brightness: data.brightness !== undefined ? data.brightness : "--",
    is_raining: data.is_raining ? "YES" : "NO",
    roof_status: data.roof_status || "CLOSED"
  };
});

// ----------------------------------------------------
// 5-SECOND SERIAL MONITOR SAMPLING
// ----------------------------------------------------
setInterval(() => {
  if (latestState.temp === "--") return; // Wait for initial data

  const newRecord = {
    timestamp: new Date(),
    ...latestState
  };

  rawTelemetryLogs.unshift(newRecord); // Add to front of array
  if (rawTelemetryLogs.length > 500) rawTelemetryLogs.pop(); // Cap history buffer

  renderFilteredTable();
}, 5000); // Sample every 5 seconds

// ----------------------------------------------------
// CONTROLS & FILTERING
// ----------------------------------------------------
function toggleMode(checkbox) {
  const newMode = checkbox.checked ? "MANUAL" : "AUTO";
  database.ref('rooftop_system/mode').set(newMode);
}

function setRoofStatus(status) {
  if (currentMode === "AUTO") {
    alert("System is currently in AUTO mode. Switch to Manual first.");
    return;
  }
  database.ref('rooftop_system/roof_status').set(status);
}

function applyTableFilter(filterValue) {
  activeFilter = filterValue;
  renderFilteredTable();
}

function getFilteredData() {
  const now = new Date();
  if (activeFilter === "24h") {
    const cutoff = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return rawTelemetryLogs.filter(log => log.timestamp >= cutoff);
  } else if (activeFilter === "7d") {
    const cutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    return rawTelemetryLogs.filter(log => log.timestamp >= cutoff);
  }
  return rawTelemetryLogs;
}

function renderFilteredTable() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  const logs = getFilteredData();
  let rowsHtml = "";

  logs.forEach(log => {
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

  tableBody.innerHTML = rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="6" style="text-align:center;">Waiting for 5s sampling tick...</td></tr>`;
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
// APP INVENTOR COMPATIBLE PDF EXPORT
// ----------------------------------------------------
function openReportModal() {
  const logs = getFilteredData();
  let rowsHtml = "";

  logs.forEach(log => {
    rowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px; font-size: 11px;">${log.timestamp.toLocaleTimeString()}</td>
        <td style="padding: 6px; font-size: 11px;">${log.temp} °C</td>
        <td style="padding: 6px; font-size: 11px;">${log.humidity} %</td>
        <td style="padding: 6px; font-size: 11px;">${log.brightness}</td>
        <td style="padding: 6px; font-size: 11px;">${log.is_raining}</td>
        <td style="padding: 6px; font-size: 11px;"><strong>${log.roof_status}</strong></td>
      </tr>
    `;
  });

  const reportHtml = `
    <div id="printable-report-area">
      <h3 style="text-align:center; margin-bottom:4px; font-size:14px; color:#0f172a;">SMART ROOFTOP TELEMETRY LOGS</h3>
      <p style="text-align:center; font-size:10px; color:#64748b; margin-top:0;">
        Generated: ${new Date().toLocaleString()}<br>Sampling: 5s Interval | Filter: ${activeFilter.toUpperCase()}
      </p>
      
      <table style="width:100%; border-collapse:collapse; margin-top:10px; text-align:left;">
        <thead>
          <tr style="background-color:#0f172a; color:#ffffff; font-size:11px;">
            <th style="padding:6px;">Time</th>
            <th style="padding:6px;">Temp</th>
            <th style="padding:6px;">Humid</th>
            <th style="padding:6px;">Bright</th>
            <th style="padding:6px;">Rain</th>
            <th style="padding:6px;">Roof</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align:center; padding:10px;">No logs sampled yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('modal-report-body').innerHTML = reportHtml;
  document.getElementById('report-modal').classList.add('active');
}

function closeReportModal() {
  document.getElementById('report-modal').classList.remove('active');
}

function triggerDownloadPDF() {
  const element = document.getElementById('printable-report-area');
  const opt = {
    margin:       5,
    filename:     'Rooftop_Telemetry_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Convert PDF to Base64 String and send straight to MIT App Inventor
  html2pdf().set(opt).from(element).output('datauristring').then(function(pdfDataUri) {
    if (window.AppInventor) {
      window.AppInventor.setWebViewString(pdfDataUri);
    } else {
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = 'Rooftop_Telemetry_Report.pdf';
      link.click();
    }
  });
}