// Functie om settings toe te passen op alle pagina's
function applyGlobalSettings() {
  const fontSize = localStorage.getItem('fontSize') || 'medium';
  const compactView = localStorage.getItem('compactView') === 'true';
  const startHour = localStorage.getItem('startHour') || '9';
  const endHour = localStorage.getItem('endHour') || '17';

  // Pas font size toe
  let baseFontSize = '16px';
  switch(fontSize) {
    case 'small': baseFontSize = '14px'; break;
    case 'large': baseFontSize = '18px'; break;
  }
  document.documentElement.style.setProperty('--base-font-size', baseFontSize);

  // Pas compact view toe
  const spacing = compactView ? '0.5rem' : '1rem';
  document.documentElement.style.setProperty('--content-spacing', spacing);
  document.documentElement.style.setProperty('--element-padding', spacing);

  // Update rooster uren als we op de roosterpagina zijn
  if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
    updateScheduleHours(startHour, endHour);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const accountStatus = document.getElementById('account-status');
  const logoutBtn = document.getElementById('logoutBtn');
  const usernameInput = document.getElementById('username');
  const icalTokenInput = document.getElementById('icalToken');
  const saveButton = document.getElementById('saveSettings');

  // Laad huidige instellingen
  const username = localStorage.getItem('username');
  const calendarCode = localStorage.getItem('calendarCode');

  if (username) usernameInput.value = username;
  if (calendarCode) icalTokenInput.value = calendarCode;

  // Check login status
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (isLoggedIn && username) {
    accountStatus.textContent = `Ingelogd als: ${username}`;
    logoutBtn.style.display = 'block';
  } else {
    accountStatus.textContent = 'Niet ingelogd';
    logoutBtn.style.display = 'none';
  }

  // Save settings
  saveButton.addEventListener('click', () => {
    const newUsername = usernameInput.value.trim();
    const newToken = icalTokenInput.value.trim();

    if (newUsername && newToken) {
      localStorage.setItem('username', newUsername);
      localStorage.setItem('calendarCode', newToken);
      localStorage.setItem('isLoggedIn', 'true');

      accountStatus.textContent = `Ingelogd als: ${newUsername}`;
      logoutBtn.style.display = 'block';

      // Toon bevestiging
      alert('Instellingen opgeslagen!');
    } else {
      alert('Vul beide velden in!');
    }
  });

  // Logout functionality
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('calendarCode');
    window.location.href = 'index.html';
  });
});

function loadSettings() {
  const settings = {
    fontSize: localStorage.getItem('fontSize') || 'medium',
    compactView: localStorage.getItem('compactView') === 'true',
    notifyDeadlines: localStorage.getItem('notifyDeadlines') !== 'false',
    startHour: localStorage.getItem('startHour') || '9',
    endHour: localStorage.getItem('endHour') || '17'
  };

  // Pas waarden toe op form elementen
  Object.entries(settings).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = value;
      } else {
        element.value = value;
      }
    }
  });

  return settings;
}

function saveSettings() {
  const fontSize = document.getElementById('fontSize').value;
  const compactView = document.getElementById('compactView').checked;
  const notifyDeadlines = document.getElementById('notifyDeadlines').checked;
  const startHour = document.getElementById('startHour').value;
  const endHour = document.getElementById('endHour').value;
  
  localStorage.setItem('fontSize', fontSize);
  localStorage.setItem('compactView', compactView);
  localStorage.setItem('notifyDeadlines', notifyDeadlines);
  localStorage.setItem('startHour', startHour);
  localStorage.setItem('endHour', endHour);
  
  applyFontSize(fontSize);
  applyCompactView(compactView);
}

function applyFontSize(size) {
  const rootElement = document.documentElement;
  switch(size) {
    case 'small':
      rootElement.style.setProperty('--base-font-size', '14px');
      break;
    case 'medium':
      rootElement.style.setProperty('--base-font-size', '16px');
      break;
    case 'large':
      rootElement.style.setProperty('--base-font-size', '18px');
      break;
  }
}

function applyCompactView(isCompact) {
  const rootElement = document.documentElement;
  if (isCompact) {
    rootElement.style.setProperty('--content-spacing', '0.5rem');
    rootElement.style.setProperty('--element-padding', '0.5rem');
  } else {
    rootElement.style.setProperty('--content-spacing', '1rem');
    rootElement.style.setProperty('--element-padding', '1rem');
  }
}

