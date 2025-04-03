// Hero section slider
function rotateSlides() {
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;

    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 6000);
}

// Initialize cart array and localStorage
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// Initialize favorites array from localStorage
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// Cart functionality
function addToCart(sweet) {
    try {
        const sweetObj = typeof sweet === 'string' ? JSON.parse(sweet) : sweet;
        
        // Calculate discount if applicable
        let finalPrice = sweetObj.price;
        if (sweetObj.discount && sweetObj.discount.isActive) {
            finalPrice = sweetObj.price - (sweetObj.price * sweetObj.discount.percentage / 100);
        }

        const existingItem = cart.find(item => item._id === sweetObj._id);
        if (existingItem) {
            if (sweetObj.unit === 'kg') {
                existingItem.weight = (existingItem.weight || 0.25) + 0.25;
            } else {
                existingItem.quantity = (existingItem.quantity || 1) + 1;
            }
        } else {
            cart.push({
                _id: sweetObj._id,
                name: sweetObj.name,
                price: finalPrice,
                originalPrice: sweetObj.price,
                discount: sweetObj.discount,
                image: sweetObj.image,
                unit: sweetObj.unit,
                weight: sweetObj.unit === 'kg' ? 0.25 : null,
                quantity: sweetObj.unit === 'kg/s' ? 1 : null
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showNotification('Item added to cart', 'success');
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart', 'error');
    }
}

// Add function to handle likes
function toggleFavorite(sweet) {
    try {
        const sweetObj = typeof sweet === 'string' ? JSON.parse(sweet) : sweet;
        const index = favorites.findIndex(item => item._id === sweetObj._id);
        
        if (index === -1) {
            favorites.push(sweetObj);
            showNotification('Added to favorites ❤️', 'success');
        } else {
            favorites.splice(index, 1);
            showNotification('Removed from favorites', 'info');
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesCount();
        
        // Update heart icon
        const heartIcon = document.querySelector(`[data-sweet-id="${sweetObj._id}"] i`);
        if (heartIcon) {
            heartIcon.classList.toggle('bi-heart');
            heartIcon.classList.toggle('bi-heart-fill');
            heartIcon.classList.toggle('text-danger');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Error updating favorites', 'error');
    }
}

// Add function to update favorites count
function updateFavoritesCount() {
    const count = favorites.length;
    document.getElementById('favoritesCount').textContent = count;
}

// Add function to show favorites sidebar
function showFavorites() {
    const favoritesSidebar = document.querySelector('.favorites-sidebar');
    const overlay = document.querySelector('.cart-overlay');
    
    if (favoritesSidebar && overlay) {
        favoritesSidebar.classList.add('active');
        overlay.classList.add('active');
        updateFavoritesList();
    }
}

// Add function to update favorites list
function updateFavoritesList() {
    const favoritesList = document.getElementById('favoritesList');
    if (!favoritesList) return;

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="text-center">No favorites yet</p>';
        return;
    }

    let html = '<div class="list-group">';
    favorites.forEach(item => {
        html += `
            <div class="list-group-item">
                <div class="d-flex gap-3">
                    <div class="favorite-item-image" style="width: 80px; height: 80px;">
                        <img src="${item.image}" 
                             alt="${item.name}" 
                             class="img-fluid rounded"
                             style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="mb-1">${item.name}</h6>
                            <button class="btn btn-sm btn-danger" onclick="toggleFavorite('${JSON.stringify(item).replace(/'/g, "\\'")}')">
                                <i class="bi bi-heart-fill"></i>
                            </button>
                        </div>
                        <p class="mb-1">₹${item.price}</p>
                        <button class="btn btn-sm btn-primary" onclick='addToCart(${JSON.stringify(item)})'>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    favoritesList.innerHTML = html;
}

// Add filterProducts function
function filterProducts(category) {
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        const productCategory = product.querySelector('.badge').textContent;
        if (category === 'all' || productCategory === category) {
            product.closest('.col-md-4').style.display = 'block';
        } else {
            product.closest('.col-md-4').style.display = 'none';
        }
    });
}

// Products loading
function loadProducts(category = 'all') {
    fetch('/api/sweets')
        .then(response => response.json())
        .then(sweets => {
            const sweetsListDiv = document.getElementById('sweetsList');
            sweetsListDiv.innerHTML = '';

            // Update CSS styles
            const style = document.createElement('style');
            style.textContent = `
                .product-card {
                    height: 500px; /* Fixed height for all cards */
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    border: none;
                    border-radius: 20px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    background: #fff;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }

                .product-image-wrapper {
                    height: 250px; /* Fixed height for image section */
                    position: relative;
                    overflow: hidden;
                    border-radius: 20px 20px 0 0;
                }

                .product-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s ease;
                }

                .like-btn {
                    background: white;
                    border: 2px solid #ff4757 !important;
                    border-radius: 50%;
                    width: 35px;
                    height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .like-btn:hover {
                    transform: scale(1.1);
                    background: #fff5f5;
                }

                .like-btn i {
                    color: #ff4757;
                    font-size: 1.2rem;
                }

                .like-btn i.bi-heart-fill {
                    color: #ff4757;
                }

                .product-info {
                    flex: 1;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                }

                .product-name {
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #2d3436;
                }

                .product-description {
                    position: relative;
                    height: 4.5em; /* Exactly 3 lines (1.5em × 3) */
                    line-height: 1.5em;
                    overflow-y: auto;
                    color: #636e72;
                    font-size: 0.9rem;
                    margin-bottom: 15px;
                    padding-right: 5px; /* Space for scrollbar */

                    /* Hide scrollbar for Firefox */
                    scrollbar-width: none;
                }

                /* Hide scrollbar for Chrome, Safari and Opera */
                .product-description::-webkit-scrollbar {
                    display: none;
                }

                .price-tag {
                    margin-top: auto;
                    display: inline-flex;
                    align-items: center;
                    background: #f1f2f6;
                    padding: 8px 15px;
                    border-radius: 25px;
                    margin-bottom: 15px;
                }

                .add-to-cart-btn {
                    margin-top: auto;
                    padding: 12px;
                    border: none;
                    border-radius: 15px;
                    background: linear-gradient(45deg, #ff4757, #ff6b81);
                    color: white;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }

                .discount-badge {
                    display: none; /* Remove the old discount badge */
                }

                .product-card.has-discount {
                    border: 2px solid #ff4757;
                }

                .product-card.has-discount::before {
                    display: none; /* Remove the ::before pseudo-element */
                }

                .discount-ribbon {
                    position: absolute;
                    top: 20px;
                    left: -15px;
                    background: #ff4757;
                    color: white;
                    padding: 8px 15px;
                    font-weight: 600;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }

                .discount-ribbon:after {
                    content: '';
                    position: absolute;
                    left: 0;
                    bottom: -10px;
                    border-top: 10px solid #cc1f1f;
                    border-left: 15px solid transparent;
                }

                .price-section {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 15px 0;
                }

                .original-price {
                    color: #a4b0be;
                    text-decoration: line-through;
                    font-size: 0.9rem;
                }

                .discounted-price {
                    color: #ff4757;
                    font-weight: 700;
                    font-size: 1.3rem;
                }

                .saving-badge {
                    background: #ffeaa7;
                    color: #ff4757;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                @keyframes pulse {
                    0% { transform: rotate(15deg) scale(1); }
                    50% { transform: rotate(15deg) scale(1.1); }
                    100% { transform: rotate(15deg) scale(1); }
                }
            `;
            document.head.appendChild(style);

            sweets.forEach(sweet => {
                const hasDiscount = sweet.discount && sweet.discount.isActive;
                const discountedPrice = hasDiscount ? 
                    sweet.price - (sweet.price * sweet.discount.percentage / 100) : 
                    sweet.price;

                if (category === 'all' || sweet.category === category) {
                    sweetsListDiv.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card product-card ${hasDiscount ? 'has-discount' : ''}">
                                <div class="product-image-wrapper">
                                    <img src="${sweet.image}" 
                                         class="product-image" 
                                         alt="${sweet.name}"
                                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                                </div>
                                <div class="product-info">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        ${hasDiscount ? `
                                            <div>
                                                <span class="badge bg-danger">SPECIAL OFFER</span>
                                                <span class="badge bg-warning text-dark ms-1">-${sweet.discount.percentage}% OFF</span>
                                            </div>
                                        ` : ''}
                                        <button class="like-btn border-0 bg-transparent" 
                                                data-sweet-id="${sweet._id}"
                                                onclick='toggleFavorite(${JSON.stringify(sweet)})'>
                                            <i class="bi ${favorites.some(f => f._id === sweet._id) ? 'bi-heart-fill text-danger' : 'bi-heart'} fs-5"></i>
                                        </button>
                                    </div>
                                    <h5 class="product-name">${sweet.name}</h5>
                                    <div class="product-description">${sweet.description}</div>
                                    <div class="price-section">
                                        ${hasDiscount ? `
                                            <span class="original-price">₹${sweet.price.toFixed(2)}</span>
                                            <span class="discounted-price">₹${discountedPrice.toFixed(2)}</span>
                                        ` : `
                                            <span class="discounted-price">₹${sweet.price.toFixed(2)}</span>
                                        `}
                                    </div>
                                    <button class="add-to-cart-btn" 
                                            onclick='addToCart(${JSON.stringify({
                                                ...sweet,
                                                price: discountedPrice
                                            })})'>
                                        <i class="bi bi-cart-plus"></i>
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('sweetsList').innerHTML =
                '<div class="col-12 text-center text-danger">Error loading products</div>';
        });
}

// Cart management functions
function updateCartCount() {
    const count = cart.reduce((total, item) => {
        if (item.unit === 'kg') {
            return total + 1;
        }
        return total + (item.quantity || 1);
    }, 0);
    document.getElementById('cartCount').textContent = count;
}

// Enhanced notification function
function showNotification(message, type, duration = 3000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type} animate__animated animate__fadeInLeft`;

    // Show login/signup buttons only for auth-related notifications
    const showAuthButtons = message.toLowerCase().includes('login') ||
        message.toLowerCase().includes('account');

    const iconMap = {
        success: 'check-circle-fill',
        error: 'exclamation-circle-fill',
        info: 'info-circle-fill',
        warning: 'exclamation-triangle-fill'
    };

    let toastContent = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <i class="bi bi-${iconMap[type] || 'bell'} me-2"></i>
                <div class="toast-message">${message}</div>
            </div>
            <button class="btn-close ms-3" onclick="this.closest('.custom-toast').remove()"></button>
        </div>
    `;

    if (showAuthButtons) {
        toastContent += `
            <div class="toast-action mt-2 d-flex gap-2">
                <a href="/auth.html?mode=login&redirect=checkout" 
                   class="btn btn-sm btn-light flex-grow-1">
                    Login
                </a>
                <a href="/auth.html?mode=signup&redirect=checkout" 
                   class="btn btn-sm btn-primary flex-grow-1">
                    Sign Up
                </a>
            </div>
        `;
    }

    toast.innerHTML = toastContent;
    document.querySelector('.toast-container').appendChild(toast);

    // Add hover effect to pause timeout
    let timeoutId;
    const startTimeout = () => {
        timeoutId = setTimeout(() => {
            toast.classList.remove('animate__fadeInLeft');
            toast.classList.add('animate__fadeOutLeft');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    toast.addEventListener('mouseleave', startTimeout);

    startTimeout();
}

// Razorpay integration
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userDetailsForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const total = cart.reduce((sum, item) => sum + (item.price * (item.unit === 'kg' ? item.weight || 0.25 : (item.quantity || 1))), 0);
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

        const options = {
            key: 'rzp_live_1ZlF3tPntMSkxX',
            amount: Math.round(total * 100), // Convert to paise and ensure it's an integer
            currency: 'INR',
            name: 'Surties Sweet Shop',
            description: 'Sweet Shop Purchase',
            image: 'https://your-logo-url.com/logo.png', // Add your logo URL
            prefill: {
                name: document.getElementById('userName').value,
                email: document.getElementById('userEmail').value,
                contact: document.getElementById('userPhone').value
            },
            notes: {
                address: document.getElementById('userAddress').value,
                state: document.getElementById('userState').value,
                city: document.getElementById('userCity').value
            },
            theme: {
                color: '#ff4757'
            },
            retry: {
                enabled: true,
                max_count: 3
            },
            modal: {
                ondismiss: function() {
                    // Re-enable submit button if payment modal is dismissed
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Proceed to Payment';
                },
                animation: true,
                confirm_close: true
            },
            handler: function (response) {
                handlePaymentSuccess(response, {
                    address: document.getElementById('userAddress').value,
                    name: document.getElementById('userName').value,
                    email: document.getElementById('userEmail').value
                });
            }
        };

        try {
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                showError('Payment failed: ' + response.error.description);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Retry Payment';
            });

            rzp.on('payment.error', function(error) {
                console.error('Payment error:', error);
                showError('Payment error occurred. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Retry Payment';
            });

            rzp.open();
        } catch (error) {
            console.error('Razorpay error:', error);
            showError('Failed to initialize payment. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Proceed to Payment';
        }
    });

    // Initialize cart on page load
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    updateCartCount();
    loadProducts();
    rotateSlides();

    // Add event listeners to category dropdown items
    const categoryLinks = document.querySelectorAll('.dropdown-item[data-category]');
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('data-category');
            loadProducts(category);

            // Update active state in dropdown
            categoryLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');

            // Scroll to products section
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Add click handlers for login/signup buttons
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            redirectToAuth('login');
        });
    }

    // Update auth UI based on user state
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        const loginBtn = document.getElementById('loginButton');
        const userDropdown = document.getElementById('userDropdown');
        const userDisplayName = document.getElementById('userDisplayName');

        if (loginBtn) loginBtn.classList.add('d-none');
        if (userDropdown) {
            userDropdown.classList.remove('d-none');
            userDisplayName.textContent = user.displayName || user.email;
        }
    }

    // Check for redirect after login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showCart') === 'true' && localStorage.getItem('pendingCheckout')) {
        localStorage.removeItem('pendingCheckout');
    }

    // Initialize favorites count
    updateFavoritesCount();
});

// Add PDF generation function
function generateReceipt(paymentResponse) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get current date and time
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    // Get form data
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;
    const address = document.getElementById('userAddress').value;
    const city = document.getElementById('userCity').value;
    const state = document.getElementById('userState').value;

    // Set font styles
    doc.setFont("times", "italic");
    doc.setFontSize(40);
    doc.setTextColor(255, 71, 87); // #ff4757
    doc.text("Surties", 105, 30, { align: "center" });

    // Customer details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    doc.text(`Date: ${date}`, 20, 50);
    doc.text(`Time: ${time}`, 20, 60);
    doc.text(`Receipt ID: ${paymentResponse.razorpay_payment_id}`, 20, 70);

    doc.text("Customer Details:", 20, 90);
    doc.text(`Name: ${name}`, 20, 100);
    doc.text(`Email: ${email}`, 20, 110);
    doc.text(`Phone: ${phone}`, 20, 120);
    doc.text(`Address: ${address}`, 20, 130);
    doc.text(`City: ${city}`, 20, 140);
    doc.text(`State: ${state}`, 20, 150);

    // Order details
    doc.text("Order Details:", 20, 170);
    let y = 180;
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * (item.unit === 'kg' ? item.weight : item.quantity);
        total += itemTotal;
        doc.text(`${item.name} - ${item.unit === 'kg' ? `${item.weight}kg` : `${item.quantity} pcs`} x ₹${item.price} = ₹${itemTotal.toFixed(2)}`, 20, y);
        y += 10;
    });

    doc.text(`Total Amount: ₹${total.toFixed(2)}`, 20, y + 10);

    // Generate QR Code
    const qrData = {
        receiptId: paymentResponse.razorpay_payment_id,
        amount: total,
        date: date,
        time: time
    };

    // Create temporary QR code element
    const qrContainer = document.createElement('div');
    const qr = new QRCode(qrContainer, {
        text: JSON.stringify(qrData),
        width: 100,
        height: 100
    });

    // Add QR code to PDF after it's generated
    setTimeout(() => {
        const qrImage = qrContainer.querySelector('img');
        doc.addImage(qrImage.src, 'PNG', 150, y - 50, 40, 40);

        // Save PDF
        doc.save(`surties-receipt-${paymentResponse.razorpay_payment_id}.pdf`);
    }, 500);
}

// Add order tracking function
async function trackOrder(paymentId, userAddress) {
    try {
        // Initialize map with main branch location
        const mainBranchLocation = { lat: 21.2315, lng: 72.8782 }; // Yogichowk Savaliya Circle coordinates

        // Get user's location from address using Geocoding API
        const geocoder = new google.maps.Geocoder();
        const userLocation = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: userAddress }, (results, status) => {
                if (status === 'OK') {
                    resolve(results[0].geometry.location);
                } else {
                    reject('Geocoding failed');
                }
            });
        });

        // Calculate route and distance
        const directionsService = new google.maps.DirectionsService();
        const route = await directionsService.route({
            origin: mainBranchLocation,
            destination: userLocation,
            travelMode: google.maps.TravelMode.DRIVING
        });

        // Show tracking modal with map
        const trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));
        const map = new google.maps.Map(document.getElementById('orderMap'), {
            zoom: 12,
            center: mainBranchLocation
        });

        // Draw route on map
        const directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
        directionsRenderer.setDirections(route);

        // Update tracking info
        document.getElementById('orderDistance').textContent =
            route.routes[0].legs[0].distance.text;
        document.getElementById('estimatedTime').textContent =
            route.routes[0].legs[0].duration.text;
        document.getElementById('trackingOrderId').textContent = paymentId;

        trackingModal.show();

    } catch (error) {
        console.error('Tracking error:', error);
        showError('Error tracking order. Please try again.');
    }
}

// Add the trackOrderById function
async function trackOrderById() {
    const paymentId = document.getElementById('trackingPaymentId').value.trim();
    if (!paymentId) {
        alert('Please enter a payment ID');
        return;
    }

    try {
        // Close tracking input modal
        bootstrap.Modal.getInstance(document.getElementById('trackOrderModal')).hide();

        // Retrieve address from local storage (if available) or use default location
        const defaultLocation = 'Surat, Gujarat'; // Fallback location

        const mainBranchLocation = { lat: 21.2315, lng: 72.8782 }; // Yogichowk Savaliya circle

        // Get user's location coordinates
        const geocoder = new google.maps.Geocoder();
        const userLocation = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: defaultLocation }, (results, status) => {
                if (status === 'OK') {
                    resolve(results[0].geometry.location);
                } else {
                    reject('Geocoding failed');
                }
            });
        });

        // Calculate route
        const directionsService = new google.maps.DirectionsService();
        const route = await directionsService.route({
            origin: mainBranchLocation,
            destination: userLocation,
            travelMode: google.maps.TravelMode.DRIVING
        });

        // Show tracking details
        const trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));
        const map = new google.maps.Map(document.getElementById('orderMap'), {
            zoom: 12,
            center: mainBranchLocation
        });

        // Draw route
        const directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
        directionsRenderer.setDirections(route);

        // Update tracking info
        document.getElementById('orderDistance').textContent = route.routes[0].legs[0].distance.text;
        document.getElementById('estimatedTime').textContent = route.routes[0].legs[0].duration.text;
        document.getElementById('trackingOrderId').textContent = paymentId;

        trackingModal.show();

    } catch (error) {
        console.error('Tracking error:', error);
        alert('Error tracking order. Please try again.');
    }
}

// Add these helper functions for tracking
function loadGoogleMaps() {
    return new Promise((resolve, reject) => {
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
            resolve(window.google.maps);
            return;
        }

        // If not loaded, create and add the script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBH2MtV0hLHArBCIvVJdIfG129cqifcCdI&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google.maps);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Update trackOrderById function
async function trackOrderById() {
    const paymentId = document.getElementById('trackingPaymentId').value.trim();
    if (!paymentId) {
        alert('Please enter a payment ID');
        return;
    }

    try {
        // Load Google Maps if not already loaded
        await loadGoogleMaps();

        // Close tracking input modal
        bootstrap.Modal.getInstance(document.getElementById('trackOrderModal')).hide();

        // Define locations
        const mainBranchLocation = { lat: 21.2315, lng: 72.8782 }; // Yogichowk Savaliya circle
        const userLocation = { lat: 21.1702, lng: 72.8311 }; // Default to Surat city center

        // Create map
        const map = new google.maps.Map(document.getElementById('orderMap'), {
            zoom: 12,
            center: mainBranchLocation
        });

        // Add markers
        new google.maps.Marker({
            position: mainBranchLocation,
            map: map,
            title: 'Main Branch',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }
        });

        new google.maps.Marker({
            position: userLocation,
            map: map,
            title: 'Delivery Location',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });

        // Calculate route
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true // We'll use our own markers
        });

        const route = await directionsService.route({
            origin: mainBranchLocation,
            destination: userLocation,
            travelMode: google.maps.TravelMode.DRIVING
        });

        directionsRenderer.setDirections(route);

        // Update tracking info
        document.getElementById('orderDistance').textContent = route.routes[0].legs[0].distance.text;
        document.getElementById('estimatedTime').textContent = route.routes[0].legs[0].duration.text;
        document.getElementById('trackingOrderId').textContent = paymentId;

        // Show the tracking modal
        const trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));
        trackingModal.show();

    } catch (error) {
        console.error('Tracking error:', error);
        alert('Error tracking order. Please try again.');
    }
}

// Add this to window object to make it accessible
window.trackOrderById = trackOrderById;

// Update the payment success handler
function handlePaymentSuccess(response, userDetails) {
    const orderData = {
        orderId: `ORD${Date.now()}`,
        userId: JSON.parse(localStorage.getItem('user')).uid,
        customerDetails: {
            name: userDetails.name || document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            phone: document.getElementById('userPhone').value,
            address: userDetails.address,
            city: document.getElementById('userCity').value,
            state: document.getElementById('userState').value
        },
        items: cart.map(item => ({
            sweetId: item._id,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice,
            discount: item.discount,
            quantity: item.quantity || null,
            weight: item.weight || null,
            unit: item.unit
        })),
        totalAmount: cart.reduce((sum, item) =>
            sum + (item.price * (item.unit === 'kg' ? item.weight : item.quantity)), 0),
        status: 'confirmed',
        paymentId: response.razorpay_payment_id
    };

    // Save order to database
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error);

            // Continue with existing success handling
            generateReceipt(response);
            showSuccess('Payment Successful! Receipt downloaded.');

            // Show tracking option
            const trackingBtn = document.createElement('button');
            trackingBtn.className = 'btn btn-primary mt-3 w-100';
            trackingBtn.innerHTML = '<i class="bi bi-geo-alt me-2"></i>Track Order';
            trackingBtn.onclick = () => {
                window.location.href = `/tracking.html?id=${response.razorpay_payment_id}`;
            };

            document.querySelector('.cart-sidebar').appendChild(trackingBtn);

            // Clear cart
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
        })
        .catch(error => {
            console.error('Error saving order:', error);
            showError('Error saving order details');
        });
}

// Update trackOrderById function
async function trackOrderById() {
    const paymentId = document.getElementById('trackingPaymentId').value.trim();
    if (!paymentId) {
        alert('Please enter a payment ID');
        return;
    }

    try {
        // Load Google Maps
        await loadGoogleMaps();

        // Close input modal
        bootstrap.Modal.getInstance(document.getElementById('trackOrderModal')).hide();

        // Simulate order status (replace with actual API call)
        const orderStatus = await getOrderStatus(paymentId);
        updateOrderTimeline(orderStatus);

        // Set up map
        const mainBranchLocation = { lat: 21.2315, lng: 72.8782 }; // Yogichowk
        const deliveryLocation = { lat: 21.1702, lng: 72.8311 }; // Default location

        const map = new google.maps.Map(document.getElementById('orderMap'), {
            zoom: 12,
            center: mainBranchLocation
        });

        // Add markers
        const shopMarker = new google.maps.Marker({
            position: mainBranchLocation,
            map: map,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            title: 'Surties Sweet Shop'
        });

        const deliveryMarker = new google.maps.Marker({
            position: deliveryLocation,
            map: map,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            title: 'Delivery Location'
        });

        // Draw route
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true
        });

        const route = await directionsService.route({
            origin: mainBranchLocation,
            destination: deliveryLocation,
            travelMode: google.maps.TravelMode.DRIVING
        });

        directionsRenderer.setDirections(route);

        // Update info
        document.getElementById('trackingOrderId').textContent = paymentId;
        document.getElementById('orderDistance').textContent = route.routes[0].legs[0].distance.text;
        document.getElementById('estimatedTime').textContent = route.routes[0].legs[0].duration.text;

        // Show tracking modal
        const trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));
        trackingModal.show();

    } catch (error) {
        console.error('Tracking error:', error);
        alert('Error tracking order. Please try again.');
    }
}

// Add new helper functions for order tracking
function getOrderStatus(orderId) {
    // Simulate API call - replace with actual API
    return new Promise((resolve) => {
        // Simulate different statuses based on order ID
        const now = new Date();
        const status = {
            confirmed: {
                status: true,
                time: new Date(now - 30 * 60000).toLocaleTimeString()
            },
            preparing: {
                status: true,
                time: new Date(now - 20 * 60000).toLocaleTimeString()
            },
            dispatched: {
                status: orderId.length > 8,
                time: orderId.length > 8 ? new Date(now - 10 * 60000).toLocaleTimeString() : null
            },
            delivered: {
                status: false,
                time: null
            }
        };
        setTimeout(() => resolve(status), 500);
    });
}

function updateOrderTimeline(status) {
    const progress = document.getElementById('timelineProgress');
    const points = document.querySelectorAll('.timeline-points .point');
    let progressWidth = 0;

    // Update each point
    points.forEach((point, index) => {
        const statusKey = point.dataset.status;
        const timeElement = document.getElementById(`${statusKey}Time`);

        if (status[statusKey].status) {
            point.classList.add('active');
            timeElement.textContent = status[statusKey].time;
            progressWidth = (index + 1) * 33.33;
        } else {
            point.classList.remove('active');
            timeElement.textContent = '--:--';
        }
    });

    // Update progress bar
    progress.style.width = `${progressWidth}%`;
}

// Remove the trackOrderModal code and replace the track order link
document.querySelector('[data-bs-target="#trackOrderModal"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/tracking.html';
});

// Add login redirect function
function redirectToAuth(type = 'login') {
    const currentPath = window.location.pathname;
    const redirect = currentPath === '/' ? 'home' : currentPath.replace('/', '').replace('.html', '');
    window.location.href = `/auth.html?mode=${type}&redirect=${redirect}`;
}

// Add updateAuthUI function
function updateAuthUI() {
    const userData = localStorage.getItem('user');
    const loginButton = document.getElementById('loginButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userData && loginButton && userDropdown) {
        const user = JSON.parse(userData);
        // Update login button to show user name
        loginButton.innerHTML = `
            <i class="bi bi-person-circle"></i>
            <span>${user.displayName || user.email}</span>
        `;
        // Show dropdown menu and update user name
        userDropdown.style.display = 'block';
        document.getElementById('userDisplayName').textContent = user.displayName || user.email;
    } else if (loginButton) {
        // Reset to login state
        loginButton.innerHTML = `
            <i class="bi bi-person-circle"></i>
            <span>Login</span>
        `;
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }
    }
}

// Add DOM load event listener
document.addEventListener('DOMContentLoaded', () => {
    // ...existing initialization code...
    updateAuthUI();
});

// Update storage event listener
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        updateAuthUI();
    }
});

// Update sign out handler
window.handleSignOut = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        updateAuthUI(); // Update UI before redirect
        window.location.href = '/auth.html';
    } catch (error) {
        console.error('Sign out error:', error);
        alert('Error signing out. Please try again.');
    }
};

// Help Form Functions
function toggleHelpForm() {
    const form = document.getElementById('helpForm');
    const helpButton = document.querySelector('.help-button');
    const userData = localStorage.getItem('user');
    
    if (form.classList.contains('active')) {
        form.classList.remove('active');
        helpButton.innerHTML = '<i class="bi bi-question-circle"></i>';
        setTimeout(() => {
            form.style.display = 'none';
            // Reset form when closing
            document.getElementById('customerHelpForm').reset();
            document.getElementById('bankDetails').style.display = 'none';
        }, 300);
    } else {
        if (!userData) {
            showNotification('Please login to submit a help request', 'warning');
            return;
        }
        form.style.display = 'block';
        // Force reflow
        form.offsetHeight;
        form.classList.add('active');
        helpButton.innerHTML = '<i class="bi bi-x-circle"></i>';
        
        // Pre-fill user data
        const user = JSON.parse(userData);
        form.querySelector('[name="name"]').value = user.displayName || '';
        form.querySelector('[name="email"]').value = user.email || '';
    }
}

// Update toggleBankDetails function to handle required fields
function toggleBankDetails() {
    const issueType = document.getElementById('issueType').value;
    const bankDetails = document.getElementById('bankDetails');
    const bankInputs = bankDetails.querySelectorAll('input');
    
    if (issueType === 'refund') {
        bankDetails.style.display = 'block';
        bankInputs.forEach(input => {
            input.required = true;
        });
    } else {
        bankDetails.style.display = 'none';
        bankInputs.forEach(input => {
            input.required = false;
            input.value = ''; // Clear values when hiding
        });
    }
}

// Update submitHelpRequest function
async function submitHelpRequest(event) {
    event.preventDefault();
    
    const userData = localStorage.getItem('user');
    if (!userData) {
        showNotification('Please login to submit a help request', 'warning');
        return;
    }

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

        const user = JSON.parse(userData);
        const formData = new FormData(form);
        const issueType = formData.get('type');
        
        const requestData = {
            userId: user.uid,
            name: formData.get('name'),
            email: formData.get('email'),
            orderId: formData.get('orderId'),
            type: issueType,
            message: formData.get('message'),
            timestamp: new Date().toISOString()
        };

        // Add bank details for refund requests
        if (issueType === 'refund') {
            const bankName = formData.get('bankName');
            const accountNumber = formData.get('accountNumber');
            const ifscCode = formData.get('ifscCode');

            // Validate bank details
            if (!bankName || !accountNumber || !ifscCode) {
                throw new Error('Please fill in all bank details for refund request');
            }

            requestData.bankDetails = {
                bankName,
                accountNumber,
                ifscCode
            };
        }

        console.log('Sending help request:', {
            ...requestData,
            bankDetails: requestData.bankDetails ? 'Present' : 'Not present'
        });

        const response = await fetch('/api/help-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit request');
        }

        showNotification('Your request has been submitted successfully. We will contact you soon!', 'success');
        form.reset();
        toggleHelpForm();

    } catch (error) {
        console.error('Help request error:', error);
        showNotification(error.message || 'Error submitting request. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit';
    }
}

window.toggleHelpForm = toggleHelpForm;
window.toggleBankDetails = toggleBankDetails;
window.submitHelpRequest = submitHelpRequest;
