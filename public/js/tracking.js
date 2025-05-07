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

// Declare global variables
let currentOrderId = null;
let websocket = null;

async function trackOrder(event) {
    event.preventDefault();
    
    const trackingId = document.getElementById('trackingId').value.trim();
    const trackingContent = document.getElementById('trackingContent');

    if (!trackingId) {
        showNotification('Please enter tracking ID', 'error');
        return;
    }

    try {
        // Show loading state
        trackingContent.style.display = 'none';

        const response = await fetch(`/api/orders/${trackingId}`);
        const data = await response.json();

        if (!data.success) {
            showNotification('Order not found or tracking expired', 'error');
            return;
        }

        // Update currentOrderId
        currentOrderId = data.order.orderId || data.order.paymentId;

        // Show success message
        showNotification(`Order found - ${data.order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`, 'success');

        // Update order details
        document.getElementById('displayOrderId').textContent = currentOrderId;
        document.getElementById('orderDate').textContent = new Date(data.order.orderDate).toLocaleDateString();
        document.getElementById('paymentMethod').textContent = data.order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment';
        document.getElementById('validUntil').textContent = new Date(data.order.validUntil).toLocaleDateString();

        // Update timeline
        updateTimeline(data.order.status);

        // Show tracking content
        trackingContent.style.display = 'block';

        // Connect to WebSocket
        initWebSocket();

    } catch (error) {
        console.error('Tracking error:', error);
        showNotification('Error fetching order details', 'error');
    }
}

function updateTimeline(status) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(status);

    // Update progress bar
    const progress = (currentIndex / (statuses.length - 1)) * 100;
    document.querySelector('.timeline-progress').style.height = `${progress}%`;

    // Update timeline points
    statuses.forEach((pointStatus, index) => {
        const point = document.querySelector(`.timeline-item[data-status="${pointStatus}"]`);
        if (index <= currentIndex) {
            point.classList.add('active');
            document.getElementById(`${pointStatus}Time`).textContent = 
                new Date().toLocaleTimeString();
        } else {
            point.classList.remove('active');
            document.getElementById(`${pointStatus}Time`).textContent = '--:--';
        }
    });
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function initWebSocket() {
    if (websocket) {
        websocket.close();
    }

    websocket = new WebSocket('ws://localhost:8080');

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ORDER_STATUS_UPDATE' && data.orderId === currentOrderId) {
            updateTimeline(data.status);
            showNotification(`Order status updated to ${data.status}`, 'success');
        }
    };

    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
        setTimeout(initWebSocket, 3000); // Reconnect after 3 seconds
    };
}

// Clean up WebSocket on page unload
window.addEventListener('unload', () => {
    if (websocket) {
        websocket.close();
    }
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ORDER_STATUS_UPDATE' && data.orderId === currentOrderId) {
            updateTimeline(data.status);
            showNotification(`Order status updated: ${data.status}`, 'success');
        }
    };

    ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
    };
}

function initMap(deliveryLocation) {
    if (!deliveryLocation) return;

    const map = new google.maps.Map(document.getElementById('mapSection'), {
        zoom: 15,
        center: deliveryLocation
    });

    new google.maps.Marker({
        position: deliveryLocation,
        map: map,
        title: 'Delivery Location'
    });
}
