document.addEventListener('DOMContentLoaded', function () {
    // Obtener el email del usuario logueado desde los parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const emailUsuarioLogueado = params.get('email');
    const nombre = params.get('nombre');
    const foto = params.get("foto");
    
    if(document.getElementById('back-link')){
        const backLink = document.getElementById('back-link');

        // Modificar el href para incluir el email
        backLink.href = `indexLogueado.html?email=${encodeURIComponent(emailUsuarioLogueado)}&nombre=${encodeURIComponent(nombre)}&foto=${encodeURIComponent(foto)}`;
    }

    if (emailUsuarioLogueado) {
        mostrarLikes(emailUsuarioLogueado);
    } else {
        console.error("Email del usuario no encontrado en los parámetros de la URL.");
    }
});

function mostrarLikes(emailUsuarioLogueado) {
    const solicitud = indexedDB.open("vitomaite14", 1);

    solicitud.onsuccess = function (evento) {
        const db = evento.target.result;
        obtenerLikes(db);
    }

    solicitud.onerror = function () {
        console.error("Error al abrir la base de datos:", solicitud.error);
    };
}

let likesMutuos = {}; // Definido globalmente para que esté disponible en toda la función

function obtenerLikes(db) {
    const params = new URLSearchParams(window.location.search);
    const emailActual = params.get("email"); // Email del usuario logueado
    const emailsQueLikearon = [];

    const transaccion = db.transaction("Likes", "readonly");
    const likesStore = transaccion.objectStore("Likes");

    likesStore.openCursor().onsuccess = function (evento) {
        const cursor = evento.target.result;

        if (cursor) {
            const like = cursor.value;

            // Si el usuario actual es el receptor del like, agrega al emisor (usuario1)
            if (like.usuario2 === emailActual) {
                emailsQueLikearon.push(like.usuario1);
                
                // Comprobar si también existe un like mutuo
                const transaccionVerificacion = db.transaction("Likes", "readonly");
                const likesStoreVerificacion = transaccionVerificacion.objectStore("Likes");
                
                likesStoreVerificacion.index("usuario2").openCursor(IDBKeyRange.only(like.usuario1)).onsuccess = function (evento) {
                    const cursorVerificacion = evento.target.result;
                    if (cursorVerificacion) {
                        if (cursorVerificacion.value.usuario1 === emailActual) {
                            likesMutuos[like.usuario1] = true; // Es un like mutuo
                        }
                    }
                };
            }

            cursor.continue();
        } else {
            console.log("Emails que dieron like:", emailsQueLikearon);
            obtenerUsuarios(db, emailsQueLikearon); // Pasar los emails sin necesidad de likesMutuos aquí
        }
    };
}

function obtenerUsuarios(db, emailsQueLikearon) {
    const resultados = [];
    const transaccion = db.transaction("Usuarios", "readonly");
    const usuariosStore = transaccion.objectStore("Usuarios");

    usuariosStore.openCursor().onsuccess = function (evento) {
        const cursor = evento.target.result;

        if (cursor) {
            const usuario = cursor.value;

            // Verifica si el email del usuario está en la lista de emails que dieron like
            if (emailsQueLikearon.includes(usuario.email)) {
                const esMutuo = likesMutuos[usuario.email] ? true : false; // Verifica si el like es mutuo
                usuario.esMutuo = esMutuo; // Añade esta propiedad al usuario
                resultados.push(usuario);
            }

            cursor.continue();
        } else {
            console.log("Usuarios que dieron like:", resultados);
            generarTablaLikes(resultados, likesMutuos); // Generar la tabla con los usuarios encontrados
        }
    };
}

function generarTablaLikes(usuarios, likesMutuos) {
    const contenedor = document.getElementById("resultados");

    if (usuarios.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron likes hacia tu perfil.</p>";
        return;
    }

    let tablaHTML = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Foto</th>
                </tr>
            </thead>
            <tbody>
    `;

    usuarios.forEach(usuario => {
        // Verificamos si el like es mutuo
        const esMutuo = likesMutuos[usuario.email] ? true : false; 

        tablaHTML += `
            <tr class="like-row" data-email="${usuario.email}">
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td style="position: relative;">
                    <img src="${usuario.foto}" alt="Foto" style="width: 40px; height: 40px; border-radius: 50%;">

                    <!-- Corazón flotante -->
                    ${esMutuo ? `<span style="position: absolute; top: 5px; right: 5px; font-size: 24px; color: red;">❤️</span>` : ''}
                </td>
            </tr>
        `;
    });

    tablaHTML += `
            </tbody>
        </table>
    `;

    contenedor.innerHTML = tablaHTML;

    // Agregar eventos de clic a cada fila
    const filasLikes = document.querySelectorAll('.like-row');
    filasLikes.forEach(fila => {
        fila.addEventListener('click', function () {
            const usuarioEmail = this.dataset.email;
            mostrarAficionesYMapa(usuarioEmail);
        });
    });
}

// Función para mostrar aficiones y un marcador en el mapa
function mostrarAficionesYMapa(emailUsuario) {
    console.log("Email recibido para búsqueda:", emailUsuario); // Depuración

    // Abrir la base de datos IndexedDB
    const solicitud = indexedDB.open("vitomaite14", 1);

    solicitud.onsuccess = function (evento) {
        const db = evento.target.result;

        // Transacción para consultar UsuarioAficion
        const transaccionUsuarioAficion = db.transaction(["UsuarioAficion", "Aficiones", "Usuarios"], "readonly");

        const usuarioAficionStore = transaccionUsuarioAficion.objectStore("UsuarioAficion");
        const indexEmail = usuarioAficionStore.index("email");
        const solicitudRelaciones = indexEmail.getAll(emailUsuario); // Obtener todas las relaciones del usuario

        solicitudRelaciones.onsuccess = function (eventoRelaciones) {
            const relaciones = eventoRelaciones.target.result;

            if (relaciones && relaciones.length > 0) {
                console.log("Relaciones encontradas:", relaciones); // Depuración

                // Extraer los IDs de las aficiones
                const idsAficiones = relaciones.map(relacion => relacion.idAfi);

                // Consultar los nombres de las aficiones
                const aficionesStore = transaccionUsuarioAficion.objectStore("Aficiones");
                const nombresAficiones = [];

                let contador = 0;
                idsAficiones.forEach(idAfi => {
                    const solicitudAficion = aficionesStore.get(idAfi);

                    solicitudAficion.onsuccess = function (eventoAficion) {
                        const aficion = eventoAficion.target.result;

                        if (aficion) {
                            nombresAficiones.push(aficion.nombreAfi);
                        }

                        contador++;
                        if (contador === idsAficiones.length) {
                            // Todas las consultas completadas
                            mostrarAlertYMapa(db, emailUsuario, nombresAficiones);
                        }
                    };

                    solicitudAficion.onerror = function () {
                        console.error("Error al obtener una afición.");
                        contador++;
                        if (contador === idsAficiones.length) {
                            mostrarAlertYMapa(db, emailUsuario, nombresAficiones);
                        }
                    };
                });
            } else {
                console.error("No se encontraron relaciones para el usuario.");
                alert("No se encontraron aficiones para este usuario.");
                mostrarAlertYMapa(db, emailUsuario, []);
            }
        };

        solicitudRelaciones.onerror = function () {
            console.error("Error al consultar las relaciones.");
        };
    };

    solicitud.onerror = function () {
        console.error("Error al abrir la base de datos.");
    };
}

// Función para mostrar el alert y luego el mapa con los marcadores
function mostrarAlertYMapa(db, emailUsuario, nombresAficiones) {
    // Transacción para consultar Usuarios
    const transaccionUsuarios = db.transaction("Usuarios", "readonly");
    const usuariosStore = transaccionUsuarios.objectStore("Usuarios");
    const indexEmail = usuariosStore.index("email");

    const solicitudUsuario = indexEmail.get(emailUsuario);

    solicitudUsuario.onsuccess = function (eventoUsuario) {
        const usuario = eventoUsuario.target.result;

        if (usuario) {
            console.log("Usuario encontrado:", usuario); // Depuración
            // Mostrar aficiones en un alert
            if(nombresAficiones.length !== 0){
                alert(`Aficiones de ${usuario.nombre}: ${nombresAficiones.join(', ')}`);
            }

            // Obtener ubicación del usuario local y mostrar el mapa
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        initMap(latitude, longitude, usuario.lat, usuario.lng, usuario.nombre, usuario.edad) // Mostrar nombre y edad);
                    },
                    (error) => {
                        alert("Error al obtener la ubicación: " + error.message);
                    }
                );
            } else {
                alert("Geolocalización no soportada por este navegador.");
            }
        } else {
            console.error("Usuario no encontrado.");
            alert("Usuario no encontrado.");
        }
    };

    solicitudUsuario.onerror = function () {
        console.error("Error al obtener el usuario.");
    };
}

// Función para inicializar el mapa
function initMap(userLat, userLng, selectedUserLat, selectedUserLng,usuarioNombre,usuarioEdad) {
    document.getElementById('map').style.display = 'block';
    const userLocation = { lat: userLat, lng: userLng };
    const selectedUserLocation = { lat: selectedUserLat, lng: selectedUserLng };

    // Crear el mapa centrado en la ubicación del usuario local
    map = new google.maps.Map(document.getElementById("map"), {
        center: userLocation,
        zoom: 14
    });

    // Agregar marcador para la ubicación del usuario local (tu ubicación)
    userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: "Tu ubicación",
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
    });

    // Agregar marcador para el usuario seleccionado
    selectedUserMarker = new google.maps.Marker({
        position: selectedUserLocation,
        map: map,
        title: `${usuarioNombre} (${usuarioEdad} años)`, // Mostrar nombre y edad
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
    });
}
