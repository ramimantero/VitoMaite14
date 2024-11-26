document.addEventListener('DOMContentLoaded', function () {
    // Obtener los parámetros de la URL (filtros de búsqueda)
    const params = new URLSearchParams(window.location.search);
    const ciudad = params.get('ciudad') || ''; // Ciudad del filtro
    const generoBusqueda = params.get('genero') || 'hombre-busca-mujer'; // Género del filtro
    const edadMin = parseInt(params.get('edadMin'), 10) || 18; // Edad mínima
    const edadMax = parseInt(params.get('edadMax'), 10) || 100; // Edad máxima
    const email = params.get('email');
    const nombre = params.get('nombre');
    const foto = params.get("foto");
    
    if (email) {
       if(document.getElementById('back-link')){
            const backLink = document.getElementById('back-link');

            // Modificar el href para incluir el email
            backLink.href = `indexLogueado.html?email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}&foto=${encodeURIComponent(foto)}`;
        }
    }

    // Convertir el filtro de "genero" en el valor correspondiente ("H" para hombre, "M" para mujer)
    let generoFiltro;
    if (generoBusqueda === "hombre-busca-mujer" || generoBusqueda === "mujer-busca-mujer") {
        generoFiltro = "M"; // H para hombre
    } else {
        generoFiltro = "H"; // M para mujer
    }

    // Llamar a la función de búsqueda con los filtros
    buscarUsuarios(ciudad, generoFiltro, edadMin, edadMax,email);
});

// Función para buscar usuarios según los filtros de búsqueda
function buscarUsuarios(ciudad, genero, edadMin, edadMax,email) {
    const solicitud = indexedDB.open("vitomaite14", 1);

    solicitud.onsuccess = function (evento) {
        const db = evento.target.result;
        const transaccion = db.transaction("Usuarios", "readonly");
        const usuariosStore = transaccion.objectStore("Usuarios");

        const resultados = [];
        usuariosStore.openCursor().onsuccess = function (eventoCursor) {
            const cursor = eventoCursor.target.result;
            if (cursor) {
                const usuario = cursor.value;

                // Verifica cada filtro individualmente
                const cumpleCiudad = ciudad === "" || usuario.ciudad === ciudad; // Ciudad debe coincidir exactamente
                const cumpleGenero = usuario.genero === genero; // Género debe coincidir
                const cumpleEdad = usuario.edad >= edadMin && usuario.edad <= edadMax; // Rango de edad

                // Mostrar depuración para entender qué pasa
                console.log("Evaluando usuario:", usuario);
                console.log("Cumple ciudad:", cumpleCiudad, " | Ciudad seleccionada:", ciudad, " | Ciudad usuario:", usuario.ciudad);
                console.log("Cumple género:", cumpleGenero);
                console.log("Cumple edad:", cumpleEdad);

                // Solo agregar usuarios que cumplan TODOS los filtros
                if (cumpleCiudad && cumpleGenero && cumpleEdad && usuario.email !== email) {
                    resultados.push(usuario);
                }

                cursor.continue();
            } else {
                resultados.sort((a,b) => a.edad - b.edad );
                mostrarResultados(resultados);
            }
        };
    };

    solicitud.onerror = function (evento) {
        console.error("Error al abrir la base de datos:", evento.target.error);
    };
}


function mostrarResultados(resultados) {
    const contenedor = document.getElementById("resultados");
    if (resultados.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron resultados para los filtros seleccionados.</p>";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const emailLogueado = params.get('email');
    let tablaHTML;
    
    if(emailLogueado){
        tablaHTML = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Edad</th>
                        <th>Ciudad</th>
                        <th>Foto</th>
                    </tr>
                </thead>
                <tbody>
        `;

        resultados.forEach(usuario => {
            tablaHTML += `
                <tr class="usuario-row" data-email="${usuario.email}">
                    <td>${usuario.nombre}</td>
                    <td>${usuario.edad}</td>
                    <td>${usuario.ciudad}</td>
                    <td><img src="${usuario.foto}" alt="Foto de usuario" class="ml-2 rounded-circle" style="width: 40px; height: 40px; object-fit: cover;"></td>
                </tr>
            `;
        });
    }
    else{
        tablaHTML = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Edad</th>
                        <th>Ciudad</th>
                    </tr>
                </thead>
                <tbody>
        `;

        resultados.forEach(usuario => {
            tablaHTML += `
                <tr class="usuario-row" data-email="${usuario.email}">
                    <td>${usuario.nombre}</td>
                    <td>${usuario.edad}</td>
                    <td>${usuario.ciudad}</td>
                </tr>
            `;
        });
    }

    tablaHTML += `
            </tbody>
        </table>
    `;

    contenedor.innerHTML = tablaHTML;
    // Agregar eventos de clic a cada fila
    const filasUsuarios = document.querySelectorAll('.usuario-row');
    filasUsuarios.forEach(fila => {
        fila.addEventListener('click', function () {
            const usuarioEmail = this.dataset.email;

            if (emailLogueado) {
                // Usuario logueado: Mostrar aficiones y marcador en el mapa
                mostrarAficionesYMapa(usuarioEmail);
            } else {
                // Usuario no logueado: Redirigir a index.html
                window.location.href = 'index.html';
            }
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
