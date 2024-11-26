document.addEventListener('DOMContentLoaded', function() {
    // Obtener el email desde la URL
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const nombre = params.get('nombre');
    const foto = params.get("foto");
    
    if (!email) {
        console.error("El email no está presente en la URL.");
        return;
    }

    // Verificar si el email existe
    if (email) {
        // Obtener el enlace 'Editar Perfil'
        const backLink = document.getElementById('back-link');
        
        // Modificar el href para incluir el email
        backLink.href = `indexLogueado.html?email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}&foto=${encodeURIComponent(foto)}`;
    }

    // Llamar a la función para abrir la base de datos y cargar el perfil
    abrirBaseDeDatos(email);

    // Escuchar el evento de click en el botón "Guardar Cambios"
    document.querySelector('.app-button').addEventListener('click', function() {
        guardarCambios(email);
    });
    const imagenes = document.querySelectorAll('#imagenes img');
    imagenes.forEach(inicializarImagen);

    // Configurar la zona de drop
    const recuadro = document.getElementById('drop-zone');
    recuadro.addEventListener('dragover', permitirDrop);
    recuadro.addEventListener('drop', drop);
});

// Función para abrir la base de datos y cargar los datos del usuario
function abrirBaseDeDatos(email) {
    const solicitud = indexedDB.open("vitomaite14", 1);

    solicitud.onerror = function(event) {
        console.error("Error al abrir la base de datos:", event.target.error);
    };

    solicitud.onsuccess = function(event) {
        const db = event.target.result;

        // Obtener el usuario desde la base de datos
        const transaction = db.transaction(["Usuarios"], "readonly");
        const usuariosStore = transaction.objectStore("Usuarios");
        const request = usuariosStore.index("email").get(email);

        request.onsuccess = function() {
            const usuario = request.result;
            if (usuario) {
                // Llenar el formulario con los datos del usuario
                document.getElementById('username').value = usuario.nombre;
                document.getElementById('edad').value = usuario.edad;
                document.getElementById('ciudad').value = usuario.ciudad;  // Cargar la ciudad
                
                if (usuario.genero === "H") {
                    document.getElementById('generoHombre').checked = true;
                } else if (usuario.genero === "M") {
                    document.getElementById('generoMujer').checked = true;
                }
                
                
                // Cargar las aficiones del usuario
                cargarAficionesUsuario(db, email);
                
                if (usuario.foto) {
                    const imagen = document.createElement('img');
                    imagen.src = usuario.foto;  // Asignar la imagen en base64 al src
                    imagen.style.width = '100%'; // O el tamaño que desees para mostrar la imagen
                    imagen.style.height = '100%';
                    imagen.style.objectFit = 'cover'; // Ajustar la imagen al contenedor

                    // Añadir la imagen a la zona de drop
                    const recuadro = document.getElementById('drop-zone');
                    recuadro.innerHTML = '';  // Limpiar el recuadro antes de agregar la imagen
                    recuadro.appendChild(imagen);
                }
            } else {
                console.error("No se encontró el usuario con el email:", email);
            }
        };

        request.onerror = function() {
            console.error("Error al obtener el usuario de la base de datos.");
        };
    };
}

// Función para cargar las aficiones del usuario desde la base de datos
function cargarAficionesUsuario(db, email) {
    // Obtener las aficiones del usuario de la tabla UsuarioAficion
    const transaction = db.transaction(["UsuarioAficion", "Aficiones"], "readonly");
    const usuarioAficionStore = transaction.objectStore("UsuarioAficion");
    const aficionesStore = transaction.objectStore("Aficiones");

    const request = usuarioAficionStore.index("email").getAll(email);

    request.onsuccess = function () {
        const aficionesUsuario = request.result;

        // Obtener todas las aficiones disponibles
        const aficionesSelect = document.getElementById('aficiones');
        aficionesSelect.innerHTML = ''; // Limpiar las opciones anteriores

        // Obtener los IDs de las aficiones asociadas al usuario
        const aficionesIds = aficionesUsuario.map(item => item.idAfi);

        const aficionesRequest = aficionesStore.getAll();

        aficionesRequest.onsuccess = function () {
            const aficiones = aficionesRequest.result;

            // Iterar sobre todas las aficiones disponibles
            aficiones.forEach(aficion => {
                const option = document.createElement('option');
                option.value = aficion.id;
                option.textContent = aficion.nombreAfi;

                // Verificar si la afición está asociada al usuario y marcarla como seleccionada
                if (aficionesIds.includes(aficion.id)) {
                    option.selected = true;
                }

                aficionesSelect.appendChild(option);
            });
        };

        aficionesRequest.onerror = function () {
            console.error("Error al obtener todas las aficiones de la base de datos.");
        };

        // Si el usuario no tiene aficiones asociadas, mostrar todas las aficiones disponibles
        if (aficionesUsuario.length === 0) {
            aficiones.forEach(aficion => {
                const option = document.createElement('option');
                option.value = aficion.id;
                option.textContent = aficion.nombreAfi;
                aficionesSelect.appendChild(option);
            });
        }
    };

    request.onerror = function () {
        console.error("Error al obtener las aficiones del usuario.");
    };
}

// Función para guardar los cambios del formulario
function guardarCambios(email) {
    // Obtener los valores del formulario
    const nuevoNombre = document.getElementById('username').value;
    const nuevaEdad = document.getElementById('edad').value;
    const nuevaCiudad = document.getElementById('ciudad').value;  // Obtener la nueva ciudad
    const nuevoGenero = document.querySelector('input[name="genero"]:checked').value; // Obtener el género seleccionado

    // Obtener las aficiones seleccionadas
    const aficionesSelect = document.getElementById('aficiones');
    const nuevasAficiones = Array.from(aficionesSelect.selectedOptions).map(option => option.value);

    // Verificar que los campos obligatorios no estén vacíos
    if (!nuevoNombre || !nuevaEdad || !nuevaCiudad || !nuevoGenero) {
        alert("Por favor, complete todos los campos obligatorios.");
        return;
    }

    // Abrir la base de datos en modo 'readwrite' para actualizar los datos
    const solicitud = indexedDB.open("vitomaite14", 1);

    solicitud.onerror = function(event) {
        console.error("Error al abrir la base de datos:", event.target.error);
    };

    solicitud.onsuccess = function(event) {
        const db = event.target.result;

        // Obtener el usuario desde la base de datos
        const transaction = db.transaction(["Usuarios", "UsuarioAficion"], "readwrite");
        const usuariosStore = transaction.objectStore("Usuarios");
        const usuarioAficionStore = transaction.objectStore("UsuarioAficion");

        // Obtener el usuario por su email
        const request = usuariosStore.index("email").get(email);

        request.onsuccess = function() {
            const usuario = request.result;
            if (usuario) {
                // Modificar los datos del usuario con los nuevos valores
                usuario.nombre = nuevoNombre;
                usuario.edad = nuevaEdad;
                usuario.ciudad = nuevaCiudad;  // Actualizar la ciudad
                usuario.genero = nuevoGenero;
                // Actualizar la foto si se ha seleccionado una nueva imagen
                if (imagenBase64) {
                    usuario.foto = imagenBase64;  // Guardar la imagen en Base64
                }


                // Actualizar el registro del usuario en la base de datos
                const updateRequest = usuariosStore.put(usuario);

                updateRequest.onsuccess = function() {
                    // Eliminar las aficiones anteriores del usuario
                    const deleteRequest = usuarioAficionStore.index("email").getAll(email);
                    deleteRequest.onsuccess = function() {
                        const aficionesUsuario = deleteRequest.result;
                        aficionesUsuario.forEach(item => {
                            usuarioAficionStore.delete(item.id);
                        });

                        // Insertar las nuevas aficiones del usuario
                        nuevasAficiones.forEach(idAficion => {
                            const aficionData = {
                                email: email,
                                idAfi: idAficion
                            };
                            usuarioAficionStore.put(aficionData);
                        });

                        alert("Datos actualizados con éxito.");
                    };
                    
                    deleteRequest.onerror = function() {
                        console.error("Error al eliminar las aficiones anteriores.");
                    };
                };

                updateRequest.onerror = function() {
                    console.error("Error al actualizar los datos del usuario.");
                };
            } else {
                console.error("No se encontró el usuario con el email:", email);
            }
        };

        request.onerror = function() {
            console.error("Error al obtener el usuario de la base de datos.");
        };
    };
}
function inicializarImagen(imagen) {
    imagen.setAttribute('draggable', 'true');
    imagen.addEventListener('dragstart', dragInicio);
}

function dragInicio(ev) {
    ev.dataTransfer.setData('text', ev.target.id);
}

function permitirDrop(ev) {
    ev.preventDefault();
}

let imagenBase64 = ""; // Variable para almacenar la imagen en formato Base64

function drop(ev) {
    ev.preventDefault();
    const idImagen = ev.dataTransfer.getData('text');
    const recuadro = document.getElementById('drop-zone');
    const listaImagenes = document.getElementById('imagenes');

    // Si hay una imagen en el recuadro, devolverla a la lista
    const imagenExistente = recuadro.querySelector('img');
    if (imagenExistente) {
        listaImagenes.appendChild(imagenExistente);
        restaurarEstiloLista(imagenExistente); // Restaurar estilo de la imagen para la lista
    }

    // Mover la nueva imagen al recuadro
    const imagenNueva = document.getElementById(idImagen);
    recuadro.innerHTML = ''; // Limpiar contenido previo
    recuadro.appendChild(imagenNueva);

    // Ajustar estilo para que la nueva imagen ocupe todo el recuadro
    imagenNueva.style.width = '100%';
    imagenNueva.style.height = '100%';
    imagenNueva.style.objectFit = 'cover';

    // Convertir la imagen en Base64 y almacenarla
    convertirImagenABase64(imagenNueva.src);
}

function convertirImagenABase64(url) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob'; // Obtener la imagen como un Blob
    xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
            imagenBase64 = reader.result; // Guardar el Base64 en la variable
            console.log("Imagen en Base64:", imagenBase64); // Mostrar en consola
        };
        reader.readAsDataURL(xhr.response); // Convertir Blob a Base64
    };
    xhr.open('GET', url);
    xhr.send();
}

function restaurarEstiloLista(imagen) {
    imagen.style.width = '100px'; // Tamaño pequeño para la lista
    imagen.style.height = '100px';
    imagen.style.objectFit = 'contain';
}