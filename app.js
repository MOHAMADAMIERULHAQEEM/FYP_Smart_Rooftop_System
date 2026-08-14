// Firebase Init
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Page Switcher
function switchPage(pageId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  
  if (pageId === 'page-2') {
    setTimeout(() => { tempChart.resize(); }, 100);
  }
}

// Chart.js Setup (Temperature vs Time)
const ctx = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Temperature (°C)',
      data: [],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { color: '#1f293d' } },
      y: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { color: '#1f293d' } }
    },
    plugins: { legend: { display: false } }
  }
});

// Live Roof Status & Sensor Data Listener
database.ref('rooftop_system').on('value', (snapshot) => {
  const data = snapshot.val() || {};
  
  // Status
  const status = data.roof_status || "UNKNOWN";
  const badge = document.getElementById('status-badge');
  badge.innerText = status;
  badge.className = 'badge ' + status.toLowerCase();
  
  document.getElementById('last-update').innerText = `Last sync: ${new Date().toLocaleTimeString()}`;
  
  // Sensors
  document.getElementById('val-temp').innerText = (data.temp !== undefined ? data.temp : '28.5') + ' °C';
  document.getElementById('val-bright').innerText = (data.brightness !== undefined ? data.brightness : '450') + ' Lux';
  document.getElementById('val-humid').innerText = (data.humidity !== undefined ? data.humidity : '65') + ' %';
});

// Set Command
function setRoofState(state) {
  database.ref('rooftop_system/roof_status').set(state);
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  
  // Push full record for Page 2
  database.ref('rooftop_logs').push({
    time: timeStr,
    temp: document.getElementById('val-temp').innerText,
    humid: document.getElementById('val-humid').innerText,
    bright: document.getElementById('val-bright').innerText,
    rain: "No Rain",
    origin: "Mobile App"
  });
}

// Data Logs & Chart Listener
database.ref('rooftop_logs').limitToLast(15).on('value', (snapshot) => {
  const tableBody = document.getElementById('logs-table-body');
  tableBody.innerHTML = '';
  
  if (!snapshot.exists()) {
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">No history logs recorded.</td></tr>';
    return;
  }

  let times = [];
  let temps = [];

  snapshot.forEach((child) => {
    const log = child.val();
    
    // Add row to table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-family: monospace;">${log.time || '--'}</td>
      <td>${log.temp || '--'}</td>
      <td>${log.humid || '--'}</td>
      <td>${log.bright || '--'}</td>
      <td><span style="color: #10b981;">${log.rain || 'No Rain'}</span></td>
      <td>${log.origin || 'System'}</td>
    `;
    tableBody.appendChild(row);

    // Collect chart data
    times.push(log.time || '');
    temps.push(parseFloat(log.temp) || 28);
  });

  // Update Graph
  tempChart.data.labels = times;
  tempChart.data.datasets[0].data = temps;
  tempChart.update();
});

// Table Search/Filter Function
function filterTable() {
  const input = document.getElementById('table-search').value.toLowerCase();
  const rows = document.querySelectorAll('#logs-table-body tr');
  
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? '' : 'none';
  });
}

// PDF Export Function
function generatePDF() {
  const element = document.getElementById('report-section');
  const opt = {
    margin:       5,
    filename:     'Rooftop_Telemetry_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, backgroundColor: '#111827' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}