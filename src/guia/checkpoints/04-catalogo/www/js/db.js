const DB_NAME = "quever.db";
let db = null;

function createDatabaseError(message, cause) {
    const error = new Error(message);
    error.cause = cause;
    return error;
}

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        if (!window.sqlitePlugin || typeof window.sqlitePlugin.openDatabase !== "function") {
            reject(createDatabaseError("SQLite no está disponible en este dispositivo."));
            return;
        }

        try {
            db = window.sqlitePlugin.openDatabase({
                name: DB_NAME,
                location: "default"
            });
            resolve(db);
        } catch (error) {
            db = null;
            reject(createDatabaseError("No se pudo abrir la base de datos.", error));
        }
    });
}

function initDB() {
    return openDB().then((database) => new Promise((resolve, reject) => {
        database.transaction((tx) => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS movies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    imdb_id TEXT UNIQUE,
                    title TEXT,
                    year TEXT,
                    runtime TEXT,
                    genre TEXT,
                    director TEXT,
                    actors TEXT,
                    plot TEXT,
                    poster TEXT,
                    imdb_rating TEXT,
                    status TEXT,
                    my_rating INTEGER,
                    opinion TEXT,
                    added_at TEXT
                )`,
                [],
                null,
                (_tx, error) => {
                    reject(createDatabaseError("No se pudo crear la tabla de películas.", error));
                    return true;
                }
            );
        }, (error) => {
            reject(createDatabaseError("No se pudo preparar la base de datos.", error));
        }, resolve);
    }));
}

function insertMovie(movie) {
    return openDB().then((database) => new Promise((resolve, reject) => {
        database.transaction((tx) => {
            tx.executeSql(
                "SELECT imdb_id FROM movies WHERE imdb_id = ?",
                [movie.imdbID],
                (_tx, result) => {
                    if (result.rows.length > 0) {
                        reject(createDatabaseError("Esta película ya está en tu catálogo."));
                        return;
                    }

                    tx.executeSql(
                        `INSERT INTO movies
                        (imdb_id, title, year, runtime, genre, director, actors, plot, poster, imdb_rating, status, my_rating, opinion, added_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            movie.imdbID,
                            movie.Title,
                            movie.Year,
                            movie.Runtime,
                            movie.Genre,
                            movie.Director,
                            movie.Actors,
                            movie.Plot,
                            movie.Poster !== "N/A" ? movie.Poster : null,
                            movie.imdbRating,
                            movie.status,
                            movie.my_rating || null,
                            movie.opinion || null,
                            new Date().toISOString()
                        ],
                        () => resolve(),
                        (_insertTx, error) => {
                            reject(createDatabaseError("No se pudo guardar la película.", error));
                            return true;
                        }
                    );
                },
                (_tx, error) => {
                    reject(createDatabaseError("No se pudo consultar el catálogo.", error));
                    return true;
                }
            );
        }, (error) => {
            reject(createDatabaseError("No se pudo guardar la película.", error));
        });
    }));
}

function getMoviesByStatus(status) {
    return openDB().then((database) => new Promise((resolve, reject) => {
        database.transaction((tx) => {
            tx.executeSql(
                "SELECT * FROM movies WHERE status = ? ORDER BY added_at DESC",
                [status],
                (_tx, result) => {
                    const movies = [];
                    for (let index = 0; index < result.rows.length; index += 1) {
                        movies.push(result.rows.item(index));
                    }
                    resolve(movies);
                },
                (_tx, error) => {
                    reject(createDatabaseError("No se pudo consultar el catálogo.", error));
                    return true;
                }
            );
        }, (error) => {
            reject(createDatabaseError("No se pudo consultar el catálogo.", error));
        });
    }));
}
