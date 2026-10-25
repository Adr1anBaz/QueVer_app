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
            loadCatalog();
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
    const actions = document.createElement("div");
    actions.className = "detail__actions";
    const pendingButton = document.createElement("button");
    pendingButton.type = "button";
    pendingButton.className = "button--secondary";
    pendingButton.textContent = "La quiero ver";
    pendingButton.addEventListener("click", () => savePendingMovie(movie, pendingButton));
    const watchedButton = document.createElement("button");
    watchedButton.type = "button";
    watchedButton.textContent = "Ya la vi";
    watchedButton.addEventListener("click", () => showWatchedForm(movie, detail));
    actions.append(pendingButton, watchedButton);

    detail.append(title, meta, director, plot, actions);
    results.appendChild(detail);
}

function showWatchedForm(movie, detail) {
    const currentForm = detail.querySelector(".save-form");
    if (currentForm) {
        currentForm.remove();
    }

    const form = document.createElement("form");
    form.className = "save-form";
    const ratingLabel = document.createElement("label");
    ratingLabel.htmlFor = "rating-input";
    ratingLabel.textContent = "Calificación";
    const rating = document.createElement("select");
    rating.id = "rating-input";
    rating.name = "rating";
    for (let value = 1; value <= 5; value += 1) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = "★".repeat(value);
        rating.appendChild(option);
    }
    const opinionLabel = document.createElement("label");
    opinionLabel.htmlFor = "opinion-input";
    opinionLabel.textContent = "Tu opinión (opcional)";
    const opinion = document.createElement("textarea");
    opinion.id = "opinion-input";
    opinion.name = "opinion";
    opinion.placeholder = "¿Qué pensaste de la película?";
    const error = document.createElement("p");
    error.className = "form-error";
    error.hidden = true;
    error.setAttribute("role", "alert");
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Guardar como vista";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;
        saveButton.disabled = true;
        try {
            await saveMovie(movie, "watched", Number(rating.value), opinion.value.trim() || null);
            form.remove();
        } catch (saveError) {
            console.error("Error al guardar una película vista", saveError);
            error.textContent = saveError.message || "No se pudo guardar la película.";
            error.hidden = false;
        } finally {
            saveButton.disabled = false;
        }
    });

    form.append(ratingLabel, rating, opinionLabel, opinion, error, saveButton);
    detail.appendChild(form);
}

async function saveMovie(movie, status, myRating = null, opinion = null) {
    try {
        await insertMovie({
            ...movie,
            status,
            my_rating: myRating,
            opinion
        });
        await loadCatalog();
        showStatus(status === "watched" ? "Película guardada como vista." : "Película guardada como pendiente.");
    } catch (error) {
        showStatus(error.message || "No se pudo guardar la película.", true);
        throw error;
    }
}

async function savePendingMovie(movie, button) {
    button.disabled = true;
    try {
        await saveMovie(movie, "pending");
    } catch (error) {
        console.error("Error al guardar una película pendiente", error);
    } finally {
        button.disabled = false;
    }
}

async function loadCatalog() {
    const watchedContainer = document.getElementById("watched-movies");
    const pendingContainer = document.getElementById("pending-movies");
    try {
        const [pending, watched] = await Promise.all([
            getMoviesByStatus("pending"),
            getMoviesByStatus("watched")
        ]);
        renderMovieList(watchedContainer, watched, "Aún no tienes películas vistas.");
        renderMovieList(pendingContainer, pending, "Aún no tienes películas pendientes.");
        configureMoreButton("more-watched", watched, "Ya las vi");
        configureMoreButton("more-pending", pending, "Pendientes");
    } catch (error) {
        console.error("Error al cargar el catálogo", error);
        showStatus("No se pudo consultar el catálogo de películas.", true);
    }
}

function renderMovieList(container, movies, emptyMessage) {
    container.replaceChildren();
    if (movies.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-copy";
        empty.textContent = emptyMessage;
        container.appendChild(empty);
        return;
    }

    movies.slice(0, 5).forEach((movie) => container.appendChild(createMovieCard(movie)));
}

function configureMoreButton(buttonId, movies, title) {
    const button = document.getElementById(buttonId);
    button.hidden = movies.length === 0;
    button.onclick = () => openFullList(movies, title);
}

function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "movie-card";
    const poster = document.createElement("img");
    poster.className = "movie-card__poster";
    poster.alt = movie.poster ? `Póster de ${movie.title}` : "Póster no disponible";
    poster.src = movie.poster || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='96'%3E%3C/svg%3E";
    const info = document.createElement("div");
    info.className = "movie-card__info";
    const title = document.createElement("h3");
    title.className = "movie-card__title";
    title.textContent = movie.title;
    const meta = document.createElement("p");
    meta.className = "movie-card__meta";
    meta.textContent = [movie.year, movie.director].filter(Boolean).join(" · ") || "Datos no disponibles";
    info.append(title, meta);

    if (movie.status === "watched" && movie.my_rating) {
        const rating = document.createElement("p");
        rating.className = "movie-card__rating";
        rating.textContent = `Tu calificación: ${"★".repeat(movie.my_rating)}`;
        info.appendChild(rating);
    }
    if (movie.status === "watched" && movie.opinion) {
        const opinion = document.createElement("p");
        opinion.className = "movie-card__opinion";
        opinion.textContent = movie.opinion;
        info.appendChild(opinion);
    }

    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.textContent = "Ver detalle";
    detailButton.addEventListener("click", () => renderSavedMovieDetail(movie));
    info.appendChild(detailButton);
    card.append(poster, info);
    return card;
}

function openFullList(movies, title) {
    const fullList = document.getElementById("full-list");
    fullList.replaceChildren();
    fullList.hidden = false;
    const heading = document.createElement("div");
    heading.className = "full-list__heading";
    const headingTitle = document.createElement("h2");
    headingTitle.textContent = `${title}: lista completa`;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "button--secondary";
    closeButton.textContent = "Cerrar lista";
    closeButton.addEventListener("click", () => {
        fullList.hidden = true;
        fullList.replaceChildren();
    });
    heading.append(headingTitle, closeButton);
    const list = document.createElement("div");
    list.className = "movie-grid";
    movies.forEach((movie) => list.appendChild(createMovieCard(movie)));
    fullList.append(heading, list);
    fullList.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSavedMovieDetail(movie) {
    const results = document.getElementById("results");
    results.replaceChildren();
    const detail = document.createElement("article");
    detail.className = "detail";
    const title = document.createElement("h3");
    title.textContent = movie.title;
    const meta = document.createElement("p");
    meta.className = "detail__meta";
    meta.textContent = [movie.year, movie.runtime, movie.genre].filter(Boolean).join(" · ") || "Datos no disponibles";
    const director = document.createElement("p");
    director.className = "detail__meta";
    director.textContent = `Dirección: ${movie.director || "No disponible"}`;
    const actors = document.createElement("p");
    actors.className = "detail__meta";
    actors.textContent = `Reparto: ${movie.actors || "No disponible"}`;
    const plot = document.createElement("p");
    plot.className = "detail__plot";
    plot.textContent = movie.plot || "Sin sinopsis disponible.";
    detail.append(title, meta, director, actors, plot);

    if (movie.status === "watched" && movie.my_rating) {
        const rating = document.createElement("p");
        rating.className = "movie-card__rating";
        rating.textContent = `Tu calificación: ${"★".repeat(movie.my_rating)}`;
        detail.appendChild(rating);
    }
    if (movie.status === "watched" && movie.opinion) {
        const opinion = document.createElement("p");
        opinion.className = "movie-card__opinion";
        opinion.textContent = `Tu opinión: ${movie.opinion}`;
        detail.appendChild(opinion);
    }
    results.appendChild(detail);
    showStatus("Detalle de una película guardada.");
}
