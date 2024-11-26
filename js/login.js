document.addEventListener("DOMContentLoaded", function () {
    const dbName = "vitomaite14";

    // Abrir la base de datos
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const solicitud = indexedDB.open(dbName, 1);

            solicitud.onsuccess = function (evento) {
                resolve(evento.target.result);
            };

            solicitud.onerror = function (evento) {
                reject(evento.target.error);
            };
        });
    }

    // Obtener el usuario con su email y contraseña
    async function obtenerUsuario(email, password) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaccion = db.transaction("Usuarios", "readonly");
            const usuariosStore = transaccion.objectStore("Usuarios");
            const index = usuariosStore.index("email");

            const solicitud = index.get(email);

            solicitud.onsuccess = function (evento) {
                const usuario = evento.target.result;

                if (usuario && usuario.password === password) {
                    resolve(usuario); // Usuario válido
                } else {
                    resolve(null); // Usuario no encontrado o contraseña incorrecta
                }
            };

            solicitud.onerror = function () {
                reject("Error al buscar el usuario.");
            };
        });
    }

    // Manejo del evento de login
    document.getElementById("loginBtn").addEventListener("click", async function () {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const usuario = await obtenerUsuario(email, password);

            if (usuario) {
                console.log("Inicio de sesión correcto");

                // Construir URL con parámetros del usuario
                const url = `indexLogueado.html?email=${encodeURIComponent(usuario.email)}&nombre=${encodeURIComponent(usuario.nombre)}&foto=${encodeURIComponent(usuario.foto)}`;

                // Redirigir con un pequeño retraso (similar a la función de los filtros de búsqueda)
                setTimeout(() => {
                    window.location.href = url;
                }, 1000); // 1 segundo de espera
            } else {
                alert("Correo o contraseña incorrectos.");
            }
        } catch (error) {
            console.error("Error al iniciar sesión", error);
            alert("Hubo un error al iniciar sesión.");
        }
    });
});
