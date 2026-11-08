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
            db = window.sqlitePlugin.openDatabase({ name: DB_NAME, location: "default" });
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
            // Preparamos el esquema completo; las operaciones se añadirán por fases.
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
                [], null,
                (_tx, error) => {
                    reject(createDatabaseError("No se pudo crear la tabla de películas.", error));
                    return true;
                }
            );
        }, (error) => reject(createDatabaseError("No se pudo preparar la base de datos.", error)), resolve);
    }));
}
