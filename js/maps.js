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
});

    let map;
    let userMarker;
    let userCircle;
    let currentRadius = 2000; // Radio inicial en metros
    let allUserMarkers = []; // Para almacenar los marcadores de todos los usuarios

    // Función para inicializar el mapa
    function initMap(lat, lng) {
      const userLocation = { lat, lng };

      // Crear el mapa
      map = new google.maps.Map(document.getElementById("map"), {
        center: userLocation,
        zoom: 14
      });

      // Agregar marcador del usuario
      userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: "Tu ubicación",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
      });

      // Dibujar círculo alrededor de la ubicación del usuario
      userCircle = new google.maps.Circle({
        map: map,
        radius: currentRadius, // Radio en metros
        fillColor: "#AA0000",
        fillOpacity: 0.2,
        strokeColor: "#AA0000",
        strokeOpacity: 0.5
      });
      userCircle.setCenter(userLocation);

      // Mostrar marcadores dentro del radio
      showMarkersInRadius(userLocation);
    }

    // Calcular distancia entre dos coordenadas (Fórmula Haversine)
    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371e3; // Radio de la Tierra en metros
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng2 - lng1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distancia en metros
    }

    // Mostrar marcadores dentro del radio
    function showMarkersInRadius(userLocation) {
        
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email');
      // Limpiar los marcadores previos
      allUserMarkers.forEach(marker => marker.setMap(null));
      allUserMarkers = [];

      // Obtener los usuarios desde la base de datos
      const request = indexedDB.open("vitomaite14", 1);

      request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction("Usuarios", "readonly");
        const store = transaction.objectStore("Usuarios");
        const users = store.getAll(); // Obtener todos los usuarios

        users.onsuccess = function () {
          const markers = users.result;

          markers.forEach((user) => {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              user.lat,
              user.lng
            );

            if (distance <= currentRadius && user.email !== email) {
              // Crear un marcador con el nombre y la edad del usuario
              const marker = new google.maps.Marker({
                position: { lat: user.lat, lng: user.lng },
                map: map,
                title: `${user.nombre} (${user.edad} años)` // Mostrar nombre y edad
              });
              allUserMarkers.push(marker); // Almacenar el marcador para eliminarlo después si es necesario
            }
          });
        };
      };

      request.onerror = function (event) {
        console.error("Error al acceder a la base de datos:", event.target.error);
      };
    }

    // Obtener ubicación del usuario
    document.getElementById("getLocation").addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            initMap(latitude, longitude);
          },
          (error) => {
            alert("Error al obtener la ubicación: " + error.message);
          }
        );
      } else {
        alert("Geolocalización no soportada por este navegador.");
      }
    });

    // Actualizar el radio cuando se mueve el slider
    document.getElementById('radius').addEventListener('input', function() {
      const newRadius = parseInt(this.value);
      document.getElementById('radiusValue').textContent = newRadius + " metros";
      updateCircleRadius(newRadius);
    });

    // Actualizar el radio del círculo
    function updateCircleRadius(radius) {
      if (userCircle) {
        userCircle.setRadius(radius); // Cambiar el radio
      }
      currentRadius = radius; // Actualizar el radio global
      showMarkersInRadius(userMarker.getPosition()); // Mostrar nuevamente los marcadores dentro del nuevo radio
    }