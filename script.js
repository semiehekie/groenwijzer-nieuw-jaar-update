async function loadICalendarFromURL(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP fout! Status: ${response.status}`);
        }
        const icalData = await response.text();
        parseICalendar(icalData);
    } catch (error) {
        console.error("Fout bij het ophalen van iCalendar:", error);
    }
}

function parseICalendar(data) {
    const events = [];
    const lines = data.split(/\r?\n/);
    let event = {};

    lines.forEach(line => {
        if (line.startsWith("BEGIN:VEVENT")) {
            event = {};
        } else if (line.startsWith("END:VEVENT")) {
            events.push(event);
        } else if (line.startsWith("SUMMARY:")) {
            event.summary = line.replace("SUMMARY:", "").trim();
            // We splitsen de samenvatting: vak - klas - extra info
            const parts = event.summary.split(" - ");
            if (parts.length >= 3) {
                event.subject = parts[0]; // Vaknaam (bijv. Nederlands)
                event.classNumber = parts[1].replace(/h\d+/g, '').trim(); // Verwijder de klasnaam (zoals h2hv1)
                event.additionalInfo = parts[2]; // Extra informatie (zoals wtr)
            } else {
                event.subject = parts[0]; // Als de samenvatting geen extra info heeft, neem gewoon het vak
                event.classNumber = parts[1] || ''; // Nummer zoals 109
                event.additionalInfo = ''; // Geen extra info
            }
        } else if (line.startsWith("DTSTART:")) {
            event.start = line.replace("DTSTART:", "");
        } else if (line.startsWith("DTEND:")) {
            event.end = line.replace("DTEND:", "");
        }
    });

    const filteredEvents = filterEventsByCurrentWeek(events);
    displayEvents(filteredEvents);
}

function filterEventsByCurrentWeek(events) {
    const currentDate = new Date();
    const startOfWeek = getStartOfWeek(currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return events.filter(event => {
        if (!event.start) return false;
        const eventStartDate = new Date(convertICalDateToISO(event.start));
        return (eventStartDate >= startOfWeek && eventStartDate <= endOfWeek);
    });
}

function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

function formatHour(hour, minute) {
    const h = hour < 10 ? "0" + hour : hour;
    const m = minute < 10 ? "0" + minute : minute;
    return h + ":" + m;
}

function convertICalDateToISO(icalString) {
    const year = icalString.substring(0, 4);
    const month = icalString.substring(4, 6);
    const day = icalString.substring(6, 8);
    let time = "00:00:00";
    if (icalString.indexOf("T") > -1) {
        const hour = icalString.substring(9, 11);
        const minute = icalString.substring(11, 13);
        const second = icalString.substring(13, 15);
        time = `${hour}:${minute}:${second}`;
    }

    if (icalString.endsWith("Z")) {
        return `${year}-${month}-${day}T${time}Z`;
    } else {
        return `${year}-${month}-${day}T${time}`;
    }
}

function displayEvents(events) {
    const eventTable = document.getElementById("eventTable");
    const mobileSchedule = document.getElementById("mobileSchedule");
    eventTable.innerHTML = "";
    mobileSchedule.innerHTML = "";

    // Mobile view
    const days = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
    days.forEach((day, dayIndex) => {
        const dayEvents = events.filter(e => {
            const eventDate = new Date(convertICalDateToISO(e.start));
            return eventDate.getDay() === dayIndex + 1;
        }).sort((a, b) => {
            const timeA = new Date(convertICalDateToISO(a.start));
            const timeB = new Date(convertICalDateToISO(b.start));
            return timeA - timeB;
        });

        if (dayEvents.length > 0) {
            const dayHeader = document.createElement("div");
            dayHeader.className = "mobile-day-header";
            dayHeader.textContent = day;
            mobileSchedule.appendChild(dayHeader);

            dayEvents.forEach(event => {
                const eventDiv = document.createElement("div");
                eventDiv.className = "mobile-lesson";

                const startTime = new Date(convertICalDateToISO(event.start));
                const endTime = new Date(convertICalDateToISO(event.end));

                eventDiv.innerHTML = `
                    <div>
                        <div>${event.subject} ${event.classNumber}</div>
                        <div class="mobile-lesson-location">${event.additionalInfo || ''}</div>
                    </div>
                    <div class="mobile-lesson-time">
                        ${formatHour(startTime.getHours(), startTime.getMinutes())}
                    </div>
                `;
                mobileSchedule.appendChild(eventDiv);
            });
        }
    });


    const startHour = 8;
    const endHour = 20;
    const slotDuration = 30;
    const aantalSlots = (endHour - startHour) * 2;
    const daysDesktop = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
    const notesEnabled = getNotesVisibility();

    for (let i = 0; i < aantalSlots; i++) {
        const slotStartTotalMinutes = startHour * 60 + i * slotDuration;
        const slotEndTotalMinutes = slotStartTotalMinutes + slotDuration;
        const row = document.createElement("tr");

        const timeCell = document.createElement("td");
        timeCell.classList.add("tijdkolom");
        timeCell.textContent = formatHour(Math.floor(slotStartTotalMinutes / 60), slotStartTotalMinutes % 60) + " - " + 
                                formatHour(Math.floor(slotEndTotalMinutes / 60), slotEndTotalMinutes % 60);
        row.appendChild(timeCell);

        daysDesktop.forEach((dag, index) => {
            const dayCell = document.createElement("td");
            const eventForSlot = events.find(e => {
                if (!e.start) return false;
                const isoStart = convertICalDateToISO(e.start);
                const eventDate = new Date(isoStart);
                const eventTotalMinutes = eventDate.getHours() * 60 + eventDate.getMinutes();
                return eventTotalMinutes >= slotStartTotalMinutes && eventTotalMinutes < slotEndTotalMinutes && eventDate.getDay() === index + 1;
            });

            if (eventForSlot) {
                const eventText = `${eventForSlot.subject} ${eventForSlot.classNumber} ${eventForSlot.additionalInfo}`;
                dayCell.textContent = eventText;
                dayCell.classList.add("event-cell");

                if (notesEnabled) {
                    const noteInput = document.createElement("input");
                    noteInput.type = "text";
                    noteInput.placeholder = "Voeg notitie toe...";
                    noteInput.value = getSavedNote(eventText) || "";
                    noteInput.addEventListener("input", () => saveNote(eventText, noteInput.value));
                    dayCell.appendChild(noteInput);
                }
            } else {
                dayCell.textContent = "";
                dayCell.classList.add("empty-slot");
            }
            row.appendChild(dayCell);
        });
        eventTable.appendChild(row);
    }
}

function saveNote(eventText, note) {
    let notes = JSON.parse(localStorage.getItem("lessonNotes")) || {};
    notes[eventText] = note;
    localStorage.setItem("lessonNotes", JSON.stringify(notes));
}

function getSavedNote(eventText) {
    let notes = JSON.parse(localStorage.getItem("lessonNotes")) || {};
    return notes[eventText] || "";
}

function toggleNotesVisibility() {
    const currentState = getNotesVisibility();
    localStorage.setItem("notesEnabled", JSON.stringify(!currentState));
    location.reload();
}

function getNotesVisibility() {
    return JSON.parse(localStorage.getItem("notesEnabled")) ?? true;
}

function clearNotesOnNewWeek() {
    const currentWeek = getCurrentWeekNumber();
    const savedWeek = JSON.parse(localStorage.getItem("lastWeekSaved")) || 0;
    if (currentWeek !== savedWeek) {
        localStorage.removeItem("lessonNotes");
        localStorage.setItem("lastWeekSaved", JSON.stringify(currentWeek));
    }
}

function getCurrentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}
document.addEventListener("DOMContentLoaded", () => {
  // Check eerst of de gebruiker al is ingelogd
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const savedCalendarCode = localStorage.getItem('calendarCode');

  if (isLoggedIn && savedCalendarCode) {
    // Als ingelogd, laad direct de kalender
    loadICalendarFromURL(savedCalendarCode);
    document.getElementById("popup").style.display = "none";
  } else {
    // Anders toon login popup
    document.getElementById("popup").style.display = "flex";
  }

  // Haal de iCalendar-codes op van een JSON-bestand
  document.getElementById("submitCode").addEventListener("click", () => {
    const calendarCode = document.getElementById("calendarCode").value.trim();
    const accounts = JSON.parse(localStorage.getItem('calendarAccounts')) || [];
    const account = accounts.find(acc => acc.username === calendarCode);

    if (account) {
      loadICalendarFromURL(account.icalCode);
      // Save login state
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', calendarCode);
      localStorage.setItem('calendarCode', account.icalCode);
      // Verberg de pop-up na invoer
      document.getElementById("popup").style.display = "none";
    } else {
      alert("Ongeldige code.");
    }
  });
});

// ... (rest of the code)

// Counter.html code
document.addEventListener('DOMContentLoaded', () => {
  const deviceUsageData = JSON.parse(localStorage.getItem('deviceUsageData')) || {};

  const counterList = document.createElement('ul');
  for (const device in deviceUsageData) {
    const listItem = document.createElement('li');
    listItem.textContent = `${device}: ${deviceUsageData[device]} keer bezocht`;
    counterList.appendChild(listItem);
  }

  document.body.appendChild(counterList);
});

// ... (rest of the code)
document.addEventListener("DOMContentLoaded", () => {
    // Check eerst voor bestaande login
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const savedCalendarCode = localStorage.getItem('calendarCode');

    if (isLoggedIn && savedCalendarCode) {
        loadICalendarFromURL(savedCalendarCode);
        const popup = document.getElementById("popup");
        if (popup) {
            popup.style.display = "none";
        }
    } else {
        const popup = document.getElementById("popup");
        if (popup) {
            popup.style.display = "flex";
        }

        const submitButton = document.getElementById("submitCode");
        if (submitButton) {
            submitButton.addEventListener("click", () => {
                const calendarCodeInput = document.getElementById("calendarCode");
                if (calendarCodeInput) {
                    const calendarCode = calendarCodeInput.value.trim();
                    const accounts = JSON.parse(localStorage.getItem('calendarAccounts')) || [];
                    const account = accounts.find(acc => acc.username === calendarCode);

                    if (account) {
                        loadICalendarFromURL(account.icalCode);
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('username', calendarCode);
                        localStorage.setItem('calendarCode', account.icalCode);
                        popup.style.display = "none";
                    } else {
                        alert("Ongeldige code.");
                    }
                }
            });
        }
    }
});

// Functie om het IP-adres van de gebruiker op te halen
async function getUserIP() {
    try {
        const response = await fetch('https://api64.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Fout bij het ophalen van het IP-adres:", error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const userSelectModal = document.getElementById("userSelectModal");
    const userSelect = document.getElementById("userSelect");
    const userModal = document.getElementById("userModal");

    // Laad de gebruikerslijst in de dropdown
    fetch("calendarCodes.json")
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(name => {
                let option = document.createElement("option");
                option.value = data[name];
                option.textContent = name;
                userSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Fout bij laden van calendarCodes.json:", error));

    // Bij het selecteren van een gebruiker, laad het rooster
    userSelectModal.addEventListener("click", function () {
        const selectedUrl = userSelect.value;
        if (selectedUrl) {
            userModal.style.display = "none"; // Sluit het venster
            fetchICS(selectedUrl);
        }
    });

    function fetchICS(icsUrl) {
        fetch(`icsProxy.php?url=${encodeURIComponent(icsUrl)}`)
            .then(response => response.text())
            .then(data => parseICS(data))
            .catch(error => console.error("Fout bij laden van iCalendar:", error));
    }

    function parseICS(icsData) {
        let events = [];
        let lines = icsData.split("\n");
        let event = {};
        lines.forEach(line => {
            if (line.startsWith("BEGIN:VEVENT")) {
                event = {};
            } else if (line.startsWith("SUMMARY:")) {
                event.summary = line.replace("SUMMARY:", "");
            } else if (line.startsWith("DTSTART")) {
                event.start = line.split(":")[1];
            } else if (line.startsWith("DTEND")) {
                event.end = line.split(":")[1];
            } else if (line.startsWith("END:VEVENT")) {
                events.push(event);
            }
        });
        renderSchedule(events);
    }

    function renderSchedule(events) {
        const eventTable = document.getElementById("eventTable");
        eventTable.innerHTML = "";
        events.forEach(event => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td>${formatTime(event.start)}</td>
                <td colspan="5">${event.summary}</td>
            `;
            eventTable.appendChild(row);
        });
    }

    function formatTime(timeString) {
        return timeString.slice(9, 11) + ":" + timeString.slice(11, 13);
    }

    // Open het modal direct bij laden van de pagina
    userModal.style.display = "block";
});

// Voeg een knop toe om notities te verbergen/tonen
document.addEventListener("DOMContentLoaded", () => {
    const toggleNotesButton = document.createElement("button");
    toggleNotesButton.textContent = getNotesVisibility() ? "Verberg notities" : "Toon notities";
    toggleNotesButton.addEventListener("click", () => {
        toggleNotesVisibility();
        toggleNotesButton.textContent = getNotesVisibility() ? "Verberg notities" : "Toon notities";
    });

    const controlsContainer = document.getElementById("controlsContainer");
    if (controlsContainer) {
        controlsContainer.appendChild(toggleNotesButton);
    } else {
        document.body.appendChild(toggleNotesButton); // Voeg toe aan body als er geen container is
    }
});





let currentWeekOffset = 0;  // Houdt bij hoeveel weken we vooruit of achteruit zijn gegaan.

document.addEventListener("DOMContentLoaded", () => {
    // Voeg event listeners toe voor de knoppen.
    document.getElementById("nextWeekButton").addEventListener("click", () => {
        currentWeekOffset++;
        loadEventsForWeek(currentWeekOffset);
    });

    document.getElementById("prevWeekButton").addEventListener("click", () => {
        currentWeekOffset--;
        loadEventsForWeek(currentWeekOffset);
    });

    // Laad de kalender voor de huidige week
    loadEventsForWeek(currentWeekOffset);
});

function loadEventsForWeek(weekOffset) {
    const events = loadICalendarFromURL(savedCalendarCode);
    const filteredEvents = filterEventsByWeek(events, weekOffset);
    displayEvents(filteredEvents);
}

function filterEventsByWeek(events, weekOffset) {
    const currentDate = new Date();
    const startOfWeek = getStartOfWeek(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);  // Verschuif de week op basis van de offset

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return events.filter(event => {
        if (!event.start) return false;
        const eventStartDate = new Date(convertICalDateToISO(event.start));
        return (eventStartDate >= startOfWeek && eventStartDate <= endOfWeek);
    });
}
