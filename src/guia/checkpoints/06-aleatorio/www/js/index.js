const CORDOVA_STARTUP_MESSAGE = "SQLite no disponible: abre la app con cordova run android / ios (o cordova run browser)";
let deviceReadyTimer = setTimeout(() => {
    showStatus(CORDOVA_STARTUP_MESSAGE, true);
}, 3000);

document.addEventListener("deviceready", onDeviceReady, false);

const RANDOM_WORDS = [
    "love", "war", "night", "man", "girl", "dark", "life", "time", "city",
    "world", "dream", "heart", "fire", "water", "star", "king", "queen",
    "death", "home", "road", "blood", "light"
];

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
    document.getElementById("random-button").addEventListener("click", getRandomMovieFromAPI);
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
    const actions = document.createElement("div");
    actions.className = "detail__actions detail__actions--crud";
    if (movie.status === "watched") {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button--secondary";
        editButton.textContent = "Editar opinión y calificación";
        editButton.addEventListener("click", () => showEditForm(movie, detail));
        actions.appendChild(editButton);
    } else {
        const markWatchedButton = document.createElement("button");
        markWatchedButton.type = "button";
        markWatchedButton.textContent = "Marcar como vista";
        markWatchedButton.addEventListener("click", () => showMarkWatchedForm(movie, detail));
        actions.appendChild(markWatchedButton);
    }
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button--danger";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => removeMovie(movie, deleteButton));
    actions.appendChild(deleteButton);
    detail.appendChild(actions);
    results.appendChild(detail);
    showStatus("Detalle de una película guardada.");
}

function createRatingSelect(selectedRating) {
    const rating = document.createElement("select");
    rating.name = "rating";
    for (let value = 1; value <= 5; value += 1) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = "★".repeat(value);
        option.selected = value === selectedRating;
        rating.appendChild(option);
    }
    return rating;
}

function createCrudForm(detail, titleText, movie, onSubmit) {
    const currentForm = detail.querySelector(".save-form");
    if (currentForm) {
        currentForm.remove();
    }
    const form = document.createElement("form");
    form.className = "save-form";
    const title = document.createElement("h4");
    title.textContent = titleText;
    const ratingLabel = document.createElement("label");
    ratingLabel.textContent = "Calificación";
    const rating = createRatingSelect(movie.my_rating || 1);
    ratingLabel.appendChild(rating);
    const opinionLabel = document.createElement("label");
    opinionLabel.textContent = "Tu opinión (opcional)";
    const opinion = document.createElement("textarea");
    opinion.name = "opinion";
    opinion.placeholder = "¿Qué pensaste de la película?";
    opinion.value = movie.opinion || "";
    opinionLabel.appendChild(opinion);
    const error = document.createElement("p");
    error.className = "form-error";
    error.hidden = true;
    error.setAttribute("role", "alert");
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Guardar cambios";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;
        submit.disabled = true;
        try {
            await onSubmit(Number(rating.value), opinion.value.trim() || null);
            form.remove();
        } catch (saveError) {
            console.error("Error en una operación del catálogo", saveError);
            error.textContent = saveError.message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    });
    form.append(title, ratingLabel, opinionLabel, error, submit);
    detail.appendChild(form);
}

function showEditForm(movie, detail) {
    createCrudForm(detail, "Editar película vista", movie, async (rating, opinion) => {
        try {
            await updateMovie(movie.imdb_id, rating, opinion);
            showStatus("Cambios guardados.");
            renderSavedMovieDetail({ ...movie, my_rating: rating, opinion });
            loadCatalog().catch(() => {
                showStatus("Los cambios se guardaron, pero no se pudo actualizar el catálogo.", true);
            });
        } catch (_error) {
            const message = "No se pudieron guardar los cambios";
            showStatus(message, true);
            throw new Error(message);
        }
    });
}

function showMarkWatchedForm(movie, detail) {
    createCrudForm(detail, "Marcar como vista", movie, async (rating, opinion) => {
        try {
            await updateMovieStatus(movie.imdb_id, "watched", rating, opinion);
            showStatus("Película marcada como vista.");
            renderSavedMovieDetail({ ...movie, status: "watched", my_rating: rating, opinion });
            loadCatalog().catch(() => {
                showStatus("El estado se actualizó, pero no se pudo actualizar el catálogo.", true);
            });
        } catch (_error) {
            const message = "No se pudo actualizar el estado";
            showStatus(message, true);
            throw new Error(message);
        }
    });
}

async function removeMovie(movie, button) {
    if (!window.confirm(`¿Eliminar “${movie.title}” del catálogo?`)) {
        return;
    }
    button.disabled = true;
    try {
        await deleteMovie(movie.imdb_id);
        document.getElementById("results").replaceChildren();
        showStatus("Película eliminada.");
        loadCatalog().catch(() => {
            showStatus("La película se eliminó, pero no se pudo actualizar el catálogo.", true);
        });
    } catch (error) {
        console.error("Error al eliminar una película", error);
        showStatus("No se pudo eliminar la película", true);
        button.disabled = false;
    }
}

async function getRandomMovieFromAPI() {
    showStatus("Buscando una recomendación…");
    try {
        const word = RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
        const data = await requestOmdb({ s: word, type: "movie" });
        if (!Array.isArray(data.Search) || data.Search.length === 0) {
            throw new Error("No hay resultados para recomendar.");
        }
        const movie = data.Search[Math.floor(Math.random() * data.Search.length)];
        await showRandomModal(movie.imdbID);
    } catch (error) {
        console.error("Error al buscar una recomendación", error);
        showStatus("No se pudo cargar la película aleatoria. Revisa la conexión e inténtalo de nuevo", true);
    }
}

async function showRandomModal(imdbID) {
    let movie;
    try {
        movie = await requestOmdb({ i: imdbID, plot: "full" });
    } catch (error) {
        console.error("Error al cargar el detalle aleatorio", error);
        showStatus("No se pudo cargar la película aleatoria. Revisa la conexión e inténtalo de nuevo", true);
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("section");
    modal.className = "random-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "random-movie-title");
    const heading = document.createElement("div");
    heading.className = "random-modal__heading";
    const headingTitle = document.createElement("h2");
    headingTitle.textContent = "Película recomendada";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "button--secondary";
    closeButton.textContent = "Cerrar";
    closeButton.addEventListener("click", () => overlay.remove());
    heading.append(headingTitle, closeButton);

    const title = document.createElement("h3");
    title.id = "random-movie-title";
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
    modal.append(heading);

    if (movie.Poster && movie.Poster !== "N/A") {
        const poster = document.createElement("img");
        poster.className = "random-modal__poster";
        poster.src = movie.Poster;
        poster.alt = `Póster de ${movie.Title}`;
        modal.appendChild(poster);
    }
    modal.append(title, meta, director, plot);

    const actions = document.createElement("div");
    actions.className = "detail__actions";
    const pendingButton = document.createElement("button");
    pendingButton.type = "button";
    pendingButton.className = "button--secondary";
    pendingButton.textContent = "La quiero ver";
    pendingButton.addEventListener("click", () => {
        saveRandomMovie(movie, "pending", null, null, overlay, pendingButton).catch(() => {});
    });
    const watchedButton = document.createElement("button");
    watchedButton.type = "button";
    watchedButton.textContent = "Ya la vi";
    watchedButton.addEventListener("click", () => showRandomWatchedForm(movie, modal, overlay));
    actions.append(pendingButton, watchedButton);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
    document.body.appendChild(overlay);
    showStatus("Recomendación cargada.");
}

function showRandomWatchedForm(movie, modal, overlay) {
    const currentForm = modal.querySelector(".random-modal .save-form");
    if (currentForm) {
        currentForm.remove();
    }
    const form = document.createElement("form");
    form.className = "save-form";
    const ratingLabel = document.createElement("label");
    ratingLabel.textContent = "Calificación";
    const rating = createRatingSelect(1);
    ratingLabel.appendChild(rating);
    const opinionLabel = document.createElement("label");
    opinionLabel.textContent = "Tu opinión (opcional)";
    const opinion = document.createElement("textarea");
    opinion.placeholder = "¿Qué pensaste de la película?";
    opinionLabel.appendChild(opinion);
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
            await saveRandomMovie(movie, "watched", Number(rating.value), opinion.value.trim() || null, overlay, saveButton);
        } catch (saveError) {
            error.textContent = saveError.message || "No se pudo guardar la película.";
            error.hidden = false;
        } finally {
            saveButton.disabled = false;
        }
    });
    form.append(ratingLabel, opinionLabel, error, saveButton);
    modal.appendChild(form);
}

async function saveRandomMovie(movie, status, rating, opinion, overlay, button) {
    button.disabled = true;
    try {
        await saveMovie(movie, status, rating, opinion);
        overlay.remove();
    } catch (error) {
        console.error("Error al guardar una recomendación", error);
        throw error;
    } finally {
        if (overlay.isConnected) {
            button.disabled = false;
        }
    }
}
