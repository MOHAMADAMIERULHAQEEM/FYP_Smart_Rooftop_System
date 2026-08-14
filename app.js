// --- Firebase Database Configuration ---
const firebaseConfig = {
  databaseURL: "https://smart-rooftop-32071-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Live Roof Status Listener ---
database.ref('rooftop_system/roof_status').on('value', (snapshot) => {
  const status = snapshot.val() || "UNKNOWN";
  const badge = document.getElementById('status-badge');
  const lastUpdate = document.getElementById('last-update');
  
  badge.innerText = status;
  badge.className = 'badge ' + status.toLowerCase();
  
  const now = new Date().toLocaleTimeString();
  lastUpdate.innerText = `Last cloud sync: ${now}`;
});

// --- Command Trigger Function ---
function setRoofState(state) {
  // Update state node
  database.ref('rooftop_system/roof_status').set(state);
  
  // Format precise timestamp
  const now = new Date();
  const timestamp = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, '0') + "-" +
    String(now.getDate()).padStart(2, '0') + " " +
    String(now.getHours()).padStart(2, '0') + ":" +
    String(now.getMinutes()).padStart(2, '0') + ":" +
    String(now.getSeconds()).padStart(2, '0');

  // Push record into history log table
  database.ref('rooftop_logs').push({
    timestamp: timestamp,
    action: state,
    source: "Mobile App Command"
  });
}

// --- Live Telemetry Data Logs Table Listener ---
database.ref('rooftop_logs').limitToLast(8).on('value', (snapshot) => {
  const tableBody = document.getElementById('logs-table-body');
  tableBody.innerHTML = '';
  
  if (!snapshot.exists()) {
    tableBody.innerHTML = '<tr><td colspan="3" class="loading-cell">No historical data records found.</td></tr>';
    return;
  }

  let logsArray = [];
  snapshot.forEach((childSnapshot) => {
    logsArray.unshift(childSnapshot.val()); // Latest records on top
  });

  logsArray.forEach((log) => {
    const row = document.createElement('tr');
    
    // Highlight action colors
    const actionColor = log.action === 'OPEN' ? '#10b981' : '#ef4444';

    row.innerHTML = `
      <td style="font-family: monospace;">${log.timestamp}</td>
      <td style="font-weight: 700; color: ${actionColor};">${log.action}</td>
      <td>${log.source}</td>
    `;
    tableBody.appendChild(row);
  });
});

// --- Professional PDF Report Generator ---
function generatePDF() {
  const element = document.getElementById('report-section');
  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     'Rooftop_System_Telemetry_Log.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, backgroundColor: '#111827' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}