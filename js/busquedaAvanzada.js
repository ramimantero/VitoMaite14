document.addEventListener("DOMContentLoaded", function () {

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
        const backLink = document.getElementById('backLink');
        
        // Modificar el href para incluir el email
        backLink.href = `indexLogueado.html?email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}&foto=${encodeURIComponent(foto)}`;
    }
    // Añadir evento al botón de búsqueda
    const buscarBtn = document.getElementById("buscarUsuariosBtn");

    buscarBtn.addEventListener("click", function () {
        // Obtener las aficiones seleccionadas desde los checkboxes
        const aficionesSeleccionadas = [];
        const checkboxes = document.querySelectorAll("input[name='aficiones']:checked");  // Seleccionar checkboxes que están marcados

        console.log("Checkboxes seleccionados:", checkboxes);  // Verificar los checkboxes seleccionados

        checkboxes.forEach((checkbox) => {
            aficionesSeleccionadas.push(parseInt(checkbox.value, 10)); // Guardar los valores de las aficiones seleccionadas
        });

        console.log("Aficiones seleccionadas:", aficionesSeleccionadas);  // Mostrar las aficiones seleccionadas en la consola

        // Si se seleccionaron aficiones, hacer la búsqueda
        if (aficionesSeleccionadas.length > 0) {
            obtenerBaseDeDatos().then(db => {
                obtenerCorreosPorAficiones(db, aficionesSeleccionadas);
            }).catch(error => {
                console.error("Error al obtener la base de datos:", error);
            });
        } else {
            console.log("No se seleccionaron aficiones.");
            document.getElementById("resultados").innerHTML = "<p>Por favor selecciona al menos una afición.</p>";
        }
    });
});

// Función para obtener la base de datos
function obtenerBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("vitomaite14", 1);

        request.onsuccess = function (event) {
            const db = event.target.result;
            resolve(db);
        };

        request.onerror = function (event) {
            reject("Error al abrir la base de datos: " + event.target.error);
        };

        // Definir el esquema de la base de datos si no existe
        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            // Crear el almacén de objetos para usuarios si no existe
            if (!db.objectStoreNames.contains("Usuarios")) {
                const usuariosStore = db.createObjectStore("Usuarios", { keyPath: "id" });
                usuariosStore.createIndex("email", "email", { unique: true }); // Crear índice por email
            }

            // Crear el almacén de objetos para UsuarioAficion si no existe
            if (!db.objectStoreNames.contains("UsuarioAficion")) {
                const store = db.createObjectStore("UsuarioAficion", { keyPath: "id" });
                store.createIndex("idAfi", "idAfi");  // Crear el índice por idAfi
            }
        };
    });
}

// Función para obtener los correos electrónicos de los usuarios con las aficiones seleccionadas
function obtenerCorreosPorAficiones(db, aficionesSeleccionadas) {
    const transaccion = db.transaction("UsuarioAficion", "readonly");
    const usuarioAficionStore = transaccion.objectStore("UsuarioAficion");

    const correos = [];

    // Obtener los correos de los usuarios con las aficiones seleccionadas
    aficionesSeleccionadas.forEach(aficionId => {
        const solicitud = usuarioAficionStore.index("idAfi").openCursor(IDBKeyRange.only(aficionId)); // Usando el índice 'idAfi'

        solicitud.onsuccess = function () {
            const cursor = solicitud.result;
            if (cursor) {
                const email = cursor.value.email;
                if (!correos.includes(email)) {  // Evitar correos duplicados
                    correos.push(email);
                }
                cursor.continue();
            } else {
                // Cuando se obtienen todos los correos de los usuarios con las aficiones seleccionadas, obtener detalles de estos usuarios
                obtenerDetallesUsuarios(db, correos);
            }
        };

        solicitud.onerror = function () {
            console.log("Error al consultar los correos por afición");
        };
    });
}

// Función para obtener los detalles completos de los usuarios usando sus correos electrónicos
function obtenerDetallesUsuarios(db, correosEncontrados) {
    const transaccion = db.transaction("Usuarios", "readonly");
    const usuariosStore = transaccion.objectStore("Usuarios");

    const usuariosDetalles = [];

    correosEncontrados.forEach((email) => {
        console.log("Buscando usuario con correo:", email);  // Verificar correo electrónico

        // Usamos el índice para obtener el usuario por su email
        const solicitud = usuariosStore.index("email").get(email);  // Obtener usuario por email usando el índice

        solicitud.onsuccess = function () {
            const usuario = solicitud.result;
            console.log("Usuario encontrado:", usuario); // Verificar si el usuario fue encontrado

            if (usuario) {
                usuariosDetalles.push(usuario);  // Agregar el usuario a los resultados si existe
            } else {
                console.error("Usuario no encontrado para el email:", email);  // Error si no se encuentra el usuario
            }

            // Cuando se obtienen todos los detalles, mostrar los resultados
            if (usuariosDetalles.length === correosEncontrados.length) {
                console.log("Todos los usuarios obtenidos. Mostrando resultados...");
                mostrarResultados(usuariosDetalles);
            }
        };

        solicitud.onerror = function () {
            console.error("Error al obtener el usuario con correo:", email);
        };
    });
}

// Función para mostrar los resultados en la página
function mostrarResultados(resultados) {
    const contenedor = document.getElementById("resultados");
    console.log("Mostrando resultados:", resultados); // Verificar los resultados

    // Verificar si no hay resultados
    if (resultados.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron usuarios con las aficiones seleccionadas.</p>";
        return;
    }

    // Limpiar el contenido anterior
    contenedor.innerHTML = '';
    
    console.log("Generando tabla HTML...");

    // Crear la tabla
    const tabla = document.createElement('table');
    tabla.classList.add('table', 'table-bordered');
    const encabezado = document.createElement('thead');
    const filaEncabezado = document.createElement('tr');

    // Crear el encabezado de la tabla
    const thNombre = document.createElement('th');
    thNombre.textContent = 'Nombre';
    const thEdad = document.createElement('th');
    thEdad.textContent = 'Edad';
    const thCiudad = document.createElement('th');
    thCiudad.textContent = 'Ciudad';

    // Añadir los encabezados a la fila
    filaEncabezado.appendChild(thNombre);
    filaEncabezado.appendChild(thEdad);
    filaEncabezado.appendChild(thCiudad);
    encabezado.appendChild(filaEncabezado);
    
    // Añadir el encabezado a la tabla
    tabla.appendChild(encabezado);

    // Crear el cuerpo de la tabla
    const cuerpo = document.createElement('tbody');

    // Añadir cada fila de usuario
    resultados.forEach(usuario => {
        console.log("Usuario procesado:", usuario);

        // Verificar si el usuario tiene la propiedad 'nombre', 'edad' y 'ciudad'
        if (usuario && usuario.nombre && usuario.edad && usuario.ciudad) {
            const fila = document.createElement('tr');
            const tdNombre = document.createElement('td');
            tdNombre.textContent = usuario.nombre;
            const tdEdad = document.createElement('td');
            tdEdad.textContent = usuario.edad;
            const tdCiudad = document.createElement('td');
            tdCiudad.textContent = usuario.ciudad;

            // Añadir las celdas a la fila
            fila.appendChild(tdNombre);
            fila.appendChild(tdEdad);
            fila.appendChild(tdCiudad);

            // Añadir la fila al cuerpo de la tabla
            cuerpo.appendChild(fila);
        } else {
            console.error("Usuario no válido o faltan datos:", usuario);
        }
    });

    // Añadir el cuerpo de la tabla a la tabla
    tabla.appendChild(cuerpo);

    // Insertar la tabla en el contenedor
    contenedor.appendChild(tabla);
}
