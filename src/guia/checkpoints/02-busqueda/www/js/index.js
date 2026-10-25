const CORDOVA_STARTUP_MESSAGE = "SQLite no disponible: abre la app con cordova run android / ios (o cordova run browser)";
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

    document.getElementById("search-form").addEventListener("submit", searchMovies);
}

function showSearchMessage(message) {
    const results = document.getElementById("results");
    results.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "empty-copy";
    paragraph.textContent = message;
    results.appendChild(paragraph);
}

function getOmdbUrl(parameters) {
    if (typeof OMDB_API_KEY !== "string" || OMDB_API_KEY === "TU_API_KEY" || !OMDB_API_KEY.trim()) {
        throw new Error("Agrega tu clave personal de OMDb en js/config.local.js antes de buscar.");
    }

    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("apikey", OMDB_API_KEY.trim());
    Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
}

async function requestOmdb(parameters) {
    let response;
    try {
        response = await fetch(getOmdbUrl(parameters));
    } catch (error) {
        if (error.message.includes("clave personal")) {
            throw error;
        }
        throw new Error("No se pudo conectar con OMDb. Revisa la conexión e inténtalo de nuevo.");
    }

    if (!response.ok) {
        throw new Error("OMDb no respondió correctamente. Inténtalo de nuevo.");
    }

    let data;
    try {
        data = await response.json();
    } catch (_error) {
        throw new Error("OMDb devolvió una respuesta inválida. Inténtalo de nuevo.");
    }

    if (!data || data.Response !== "True") {
        throw new Error(data && data.Error ? `OMDb: ${data.Error}` : "OMDb devolvió una respuesta inválida. Inténtalo de nuevo.");
    }

    return data;
}

async function searchMovies(event) {
    event.preventDefault();
    const title = document.getElementById("search-input").value.trim();

    if (!title) {
        showStatus("Escribe el título de una película para buscar.", true);
        showSearchMessage("Aún no hay una búsqueda para mostrar.");
        return;
    }

    showStatus("Buscando películas…");
    showSearchMessage("Buscando en OMDb…");

    try {
        const data = await requestOmdb({ s: title, type: "movie" });
        if (!Array.isArray(data.Search) || data.Search.length === 0) {
            throw new Error("OMDb no devolvió resultados válidos.");
        }
        renderSearchResults(data.Search);
        showStatus(`${data.Search.length} resultado(s) encontrado(s).`);
    } catch (error) {
        console.error("Error de búsqueda en OMDb", error);
        showStatus(error.message, true);
        showSearchMessage("No se pudieron cargar los resultados.");
    }
}

function renderSearchResults(movies) {
    const results = document.getElementById("results");
    results.replaceChildren();

    movies.forEach((movie) => {
        const item = document.createElement("article");
        item.className = "movie-result";

        const poster = document.createElement("img");
        poster.className = "movie-result__poster";
        poster.alt = movie.Poster && movie.Poster !== "N/A" ? `Póster de ${movie.Title}` : "Póster no disponible";
        poster.src = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='90'%3E%3C/svg%3E";

        const info = document.createElement("div");
        info.className = "movie-result__info";
        const title = document.createElement("h3");
        title.className = "movie-result__title";
        title.textContent = movie.Title;
        const year = document.createElement("p");
        year.className = "movie-result__year";
        year.textContent = movie.Year || "Año no disponible";
        const detailButton = document.createElement("button");
        detailButton.type = "button";
        detailButton.textContent = "Ver detalle";
        detailButton.addEventListener("click", () => loadMovieDetail(movie.imdbID));

        info.append(title, year, detailButton);
        item.append(poster, info);
        results.appendChild(item);
    });
}

async function loadMovieDetail(imdbID) {
    showStatus("Cargando detalle de la película…");

    try {
        const movie = await requestOmdb({ i: imdbID, plot: "short" });
        renderMovieDetail(movie);
        showStatus("Detalle cargado. En el siguiente checkpoint podrás guardarla.");
    } catch (error) {
        console.error("Error al obtener detalle de OMDb", error);
        showStatus(error.message, true);
        showSearchMessage("No se pudo cargar el detalle de esta película.");
    }
}

function renderMovieDetail(movie) {
    const results = document.getElementById("results");
    results.replaceChildren();

    const detail = document.createElement("article");
    detail.className = "detail";
    const title = document.createElement("h3");
    title.textContent = movie.Title;
    const meta = document.createElement("p");
    meta.className = "detail__meta";
    meta.textContent = [movie.Year, movie.Runtime, movie.Genre].filter(Boolean).join(" · ") || "Datos no disponibles";
    const director = document.createElement("p");
    director.className = "detail__meta";
    director.textContent = `Dirección: ${movie.Director || "No disponible"}`;
    const plot = document.createElement("p");
    plot.className = "detail__plot";
    plot.textContent = movie.Plot || "Sin sinopsis disponible.";
    const nextStep = document.createElement("p");
    nextStep.className = "detail__next-step";
    nextStep.textContent = "La información ya está lista para guardarse. El formulario para elegir estado, calificación y opinión se agrega en el siguiente checkpoint.";

    detail.append(title, meta, director, plot, nextStep);
    results.appendChild(detail);
}
