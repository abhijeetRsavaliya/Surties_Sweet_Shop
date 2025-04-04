// Load Google Maps
function loadGoogleMaps() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve(window.google.maps);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBH2MtV0hLHArBCIvVJdIfG129cqifcCdI&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google.maps);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Get simulated order status
function getOrderStatus(orderId) {
    return new Promise((resolve) => {
        const now = new Date();
        const orderDate = new Date(now - 60 * 60000); // Order placed 1 hour ago

        const status = {
            confirmed: {
                status: true,
                time: new Date(orderDate).toLocaleTimeString()
            },
            preparing: {
                status: true,
                time: new Date(orderDate.getTime() + 15 * 60000).toLocaleTimeString() // 15 mins after order
            },
            dispatched: {
                status: orderId.length > 8,
                time: orderId.length > 8 ? new Date(orderDate.getTime() + 30 * 60000).toLocaleTimeString() : null // 30 mins after order
            },
            delivered: {
                status: false,
                time: null
            }
        };
        
        // Set order date for display
        status.orderDate = orderDate.toLocaleString();
        
        setTimeout(() => resolve(status), 500);
    });
}

// Update timeline
function updateOrderTimeline(status) {
    const progress = document.getElementById('timelineProgress');
    const points = document.querySelectorAll('.point');
    let progressWidth = 0;

    // Update each point
    points.forEach((point, index) => {
        const statusKey = point.dataset.status;
        if (status[statusKey] && status[statusKey].status) {
            point.classList.add('active');
            const timeElement = point.querySelector('small');
            if (timeElement) {
                timeElement.textContent = status[statusKey].time;
            }
            progressWidth = ((index + 1) * 100) / points.length;
        } else {
            point.classList.remove('active');
            const timeElement = point.querySelector('small');
            if (timeElement) {
                timeElement.textContent = '--:--';
            }
        }
    });

    if (progress) {
        progress.style.width = `${progressWidth}%`;
    }
}

// Track order with better error handling
const SHOP_ADDRESS = {
    address: "7,8,9, Dharmanandan Complex, Savaliya Circle, Yoginagar Society, Punagam, Surat, Gujarat 395010",
    coordinates: { lat: 21.2192, lng: 72.8836 } // Savaliya Circle coordinates
};

// Add map styles for better visibility
const mapStyles = [
    {
        featureType: "all",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }]
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#f5f5f5" }]
    }
];

// Update getUserLocation function
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            error => {
                console.warn('Error getting location:', error);
                showNotification('Unable to get your location. Please enable location services.', 'error');
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

async function initializeMap(container) {
    try {
        // Get user's current location
        const userLocation = await getUserLocation();
        
        // Create map centered between shop and user
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(SHOP_ADDRESS.coordinates);
        bounds.extend(userLocation);

        const map = new google.maps.Map(container, {
            zoom: 12,
            center: bounds.getCenter(),
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false
        });

        // Add shop marker
        const shopMarker = new google.maps.Marker({
            position: SHOP_ADDRESS.coordinates,
            map: map,
            title: 'Surties Sweet Shop',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            animation: google.maps.Animation.DROP
        });

        // Add user location marker
        const userMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            title: 'Your Location',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            animation: google.maps.Animation.DROP
        });

        // Draw route
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true // Use our custom markers
        });

        const route = await directionsService.route({
            origin: SHOP_ADDRESS.coordinates,
            destination: userLocation,
            travelMode: google.maps.TravelMode.DRIVING
        });

        directionsRenderer.setDirections(route);

        // Update distance and time
        const leg = route.routes[0].legs[0];
        document.getElementById('orderDistance').textContent = leg.distance.text;
        document.getElementById('estimatedTime').textContent = leg.duration.text;

        // Fit map to show entire route
        map.fitBounds(bounds);

        // Hide loading overlay
        document.getElementById('mapOverlay').style.display = 'none';

        return map;
    } catch (error) {
        console.error('Map initialization error:', error);
        showNotification('Error loading map. Please try again.', 'error');
        throw error;
    }
}

async function trackOrderById(event) {
    event?.preventDefault();
    showLoading();
    
    const input = document.getElementById('trackingPaymentId');
    const paymentId = input.value.trim();

    try {
        const orderDetails = JSON.parse(localStorage.getItem(`order_${paymentId}`));
        if (!orderDetails) {
            throw new Error('Invalid payment ID. Please check and try again.');
        }

        showNotification('Order found! Loading tracking details...', 'success');
        document.getElementById('trackingContent').style.display = 'block';

        // Wait for map to be initialized
        if (!window.googleMap) {
            await new Promise(resolve => {
                const checkMap = setInterval(() => {
                    if (window.googleMap) {
                        clearInterval(checkMap);
                        resolve();
                    }
                }, 100);
            });
        }

        const map = window.googleMap;
        const shopLocation = { lat: 21.2192, lng: 72.8836 }; // Savaliya Circle coordinates

        // Get delivery location from order details
        const geocoder = new google.maps.Geocoder();
        const fullAddress = `${orderDetails.address}, ${orderDetails.city}, ${orderDetails.state}`;
        
        geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === 'OK') {
                const deliveryLocation = results[0].geometry.location;
                
                // Add delivery marker
                const deliveryMarker = new google.maps.Marker({
                    position: deliveryLocation,
                    map: map,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: new google.maps.Size(40, 40)
                    },
                    title: 'Delivery Location',
                    animation: google.maps.Animation.DROP
                });

                // Draw route
                const directionsService = new google.maps.DirectionsService();
                const directionsRenderer = new google.maps.DirectionsRenderer({
                    map: map,
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: '#ff4757',
                        strokeWeight: 5
                    }
                });

                directionsService.route({
                    origin: shopLocation,
                    destination: deliveryLocation,
                    travelMode: google.maps.TravelMode.DRIVING
                }, (response, status) => {
                    if (status === 'OK') {
                        directionsRenderer.setDirections(response);
                        const route = response.routes[0];
                        document.getElementById('orderDistance').textContent = route.legs[0].distance.text;
                        document.getElementById('estimatedTime').textContent = route.legs[0].duration.text;
                        
                        // Fit map to show entire route
                        const bounds = new google.maps.LatLngBounds();
                        bounds.extend(shopLocation);
                        bounds.extend(deliveryLocation);
                        map.fitBounds(bounds);
                    }
                });
            }
        });

        // Update order info
        document.getElementById('trackingOrderId').textContent = paymentId;
        document.getElementById('orderDate').textContent = new Date(orderDetails.orderDate).toLocaleString();

        // Update timeline
        updateOrderTimeline(await getOrderStatus(paymentId));

        // Add refund button
        addRefundButton(paymentId);

    } catch (error) {
        console.error('Tracking error:', error);
        showNotification(error.message, 'error');
        document.getElementById('trackingContent').style.display = 'none';
    } finally {
        hideLoading();
    }
}

// Add error display function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.search-box').appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Add new map initialization function
async function initializeMap(container) {
    const map = new google.maps.Map(container, {
        zoom: 15,
        center: SHOP_ADDRESS.coordinates,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: mapStyles,
        gestureHandling: 'cooperative'
    });

    // Add shop marker with custom icon
    const shopMarker = new google.maps.Marker({
        position: SHOP_ADDRESS.coordinates,
        map: map,
        title: 'Surties Sweet Shop',
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40)
        },
        animation: google.maps.Animation.DROP
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 10px;">
                <h5 style="margin: 0 0 5px 0;">Surties Sweet Shop</h5>
                <p style="margin: 0;">${SHOP_ADDRESS.address}</p>
            </div>`
    });

    shopMarker.addListener('click', () => {
        infoWindow.open(map, shopMarker);
    });

    return map;
}

// Add markers and route
async function addMarkersAndRoute(map, mainBranchLocation, deliveryLocation) {
    // Add shop marker
    const shopMarker = new google.maps.Marker({
        position: mainBranchLocation,
        map: map,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40)
        },
        title: 'Surties Sweet Shop',
        animation: google.maps.Animation.DROP
    });

    // Add delivery marker
    const deliveryMarker = new google.maps.Marker({
        position: deliveryLocation,
        map: map,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new google.maps.Size(40, 40)
        },
        title: 'Delivery Location',
        animation: google.maps.Animation.DROP
    });

    // Add info windows
    const shopInfo = new google.maps.InfoWindow({
        content: '<div style="padding: 10px;"><strong>Surties Sweet Shop</strong><br>Main Branch</div>'
    });

    const deliveryInfo = new google.maps.InfoWindow({
        content: '<div style="padding: 10px;"><strong>Delivery Location</strong><br>Estimated delivery point</div>'
    });

    shopMarker.addListener('click', () => {
        shopInfo.open(map, shopMarker);
    });

    deliveryMarker.addListener('click', () => {
        deliveryInfo.open(map, deliveryMarker);
    });

    // Draw route
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#ff4757',
            strokeWeight: 5
        }
    });

    const route = await directionsService.route({
        origin: mainBranchLocation,
        destination: deliveryLocation,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
    });

    directionsRenderer.setDirections(route);

    // Update distance and time
    const distance = route.routes[0].legs[0].distance.text;
    const duration = route.routes[0].legs[0].duration.text;
    
    document.getElementById('orderDistance').textContent = distance;
    document.getElementById('estimatedTime').textContent = duration;
}

// Add route drawing function
async function drawRouteToShop(map, userLocation) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#ff4757',
            strokeWeight: 5
        }
    });

    try {
        const route = await directionsService.route({
            origin: userLocation,
            destination: SHOP_ADDRESS.coordinates,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        });

        directionsRenderer.setDirections(route);
        const leg = route.routes[0].legs[0];
        
        // Update distance and time
        document.getElementById('orderDistance').textContent = leg.distance.text;
        document.getElementById('estimatedTime').textContent = leg.duration.text;
        
        // Show route info
        showNotification(`Distance: ${leg.distance.text}, Estimated time: ${leg.duration.text}`, 'success');
        
        return route;
    } catch (error) {
        console.error('Error drawing route:', error);
        showNotification('Error calculating route', 'error');
        throw error;
    }
}

// Show loading state
function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

// Add refund button
function addRefundButton(orderId) {
    const actionDiv = document.createElement('div');
    actionDiv.className = 'text-center mt-3';
    actionDiv.innerHTML = `
        <button class="btn btn-warning" onclick="requestRefund('${orderId}')">
            <i class="bi bi-currency-exchange"></i> Request Refund
        </button>
    `;
    document.querySelector('.tracking-details').appendChild(actionDiv);
}

// Make function globally available
window.trackOrderById = trackOrderById;

// Auto-track if ID is in URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('id');
    if (trackingId) {
        document.getElementById('trackingPaymentId').value = trackingId;
        trackOrderById();
    }
});

function showNotification(message, type) {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            <div>${message}</div>
        </div>
    `;
    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
