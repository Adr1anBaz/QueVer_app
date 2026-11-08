const CORDOVA_STARTUP_MESSAGE = "SQLite no disponible: ejecuta cordova run android --emulator desde la carpeta quever";
let deviceReadyTimer = setTimeout(() => {
    showStatus(CORDOVA_STARTUP_MESSAGE, true);
}, 3000);

document.addEventListener("deviceready", onDeviceReady, false);

function showStatus(message, isError = false) {
    const status = document.getElementById("app-status");
    status.textContent = message;
    status.classList.toggle("status--error", isError);
}

function onDeviceReady() {
    clearTimeout(deviceReadyTimer);
    if (!window.sqlitePlugin) {
        showStatus(CORDOVA_STARTUP_MESSAGE, true);
        return;
    }

    initDB()
        .then(() => {
            showStatus("Tu catálogo está listo para recibir películas.");
        })
        .catch((error) => {
            console.error("Error al preparar SQLite", error);
            showStatus("No se pudo preparar la base de datos. Revisa que el plugin SQLite esté instalado e inténtalo de nuevo.", true);
        });
}
