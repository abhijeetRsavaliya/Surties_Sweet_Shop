// Add at the beginning of the file
async function checkAdminAuth() {
    try {
        const response = await fetch('/admin-auth-check');
        if (!response.ok) {
            window.location.href = '/admin-login';
        }
    } catch (error) {
        window.location.href = '/admin-login';
    }
}

// Add authentication check
function checkAuth() {
    const adminId = sessionStorage.getItem('adminId');
    const adminPass = sessionStorage.getItem('adminPass');
    
    if (adminId !== 'admin' || adminPass !== 'admin@#123') {
        window.location.href = '/admin';
        return false;
    }
    return true;
}

// Update API request headers
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json'
    };
}

// Update logout function
function adminLogout() {
    fetch('/admin-logout').then(() => {
        window.location.href = '/admin-login';
    });
}

// Update order status functionality - removed SMS sending
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (data.success) {
            if (status === 'delivered') {
                loadActiveOrders();
                loadCompletedOrders();
            }
            showNotification(`Order status updated to ${status}`, 'success');
        } else {
            throw new Error(data.error || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating order status', 'error');
    }
}

function loadActiveOrders() {
    fetch('/api/orders?status=active')
        .then(response => response.json())
        .then(orders => {
            const ordersList = document.getElementById('activeOrdersList');
            ordersList.innerHTML = orders.map(order => `
                <tr>
                    <td>${order.orderId}</td>
                    <td>
                        <strong>${order.customerDetails.name}</strong><br>
                        ${order.customerDetails.email}<br>
                        ${order.customerDetails.phone}
                    </td>
                    <td>${order.items.map(item => 
                        `${item.name} (${item.unit === 'kg' ? `${item.weight}kg` : `${item.quantity} pcs`})`
                    ).join('<br>')}</td>
                    <td>₹${order.totalAmount.toFixed(2)}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn ${order.status === 'pending' ? 'btn-primary' : 'btn-outline-primary'}"
                                    onclick="updateOrderStatus('${order._id}', 'pending')"
                                    ${order.status === 'pending' ? 'disabled' : ''}>
                                <i class="bi bi-clock"></i> Pending
                            </button>
                            <button class="btn ${order.status === 'processing' ? 'btn-primary' : 'btn-outline-primary'}"
                                    onclick="updateOrderStatus('${order._id}', 'processing')"
                                    ${order.status === 'processing' ? 'disabled' : ''}>
                                <i class="bi bi-gear"></i> Processing
                            </button>
                            <button class="btn ${order.status === 'shipped' ? 'btn-primary' : 'btn-outline-primary'}"
                                    onclick="updateOrderStatus('${order._id}', 'shipped')"
                                    ${order.status === 'shipped' ? 'disabled' : ''}>
                                <i class="bi bi-truck"></i> Shipped
                            </button>
                            <button class="btn ${order.status === 'delivered' ? 'btn-success' : 'btn-outline-success'}"
                                    onclick="updateOrderStatus('${order._id}', 'delivered')"
                                    ${order.status === 'delivered' ? 'disabled' : ''}>
                                <i class="bi bi-check-circle"></i> Delivered
                            </button>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading active orders:', error);
            document.getElementById('activeOrdersList').innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">Error loading orders</td></tr>
            `;
        });
}

async function loadAdvertisements() {
    try {
        const advertisementsList = document.getElementById('advertisementsList');
        if (!advertisementsList) return;

        advertisementsList.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

        const response = await fetch('/api/advertisements');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            if (data.data.length === 0) {
                advertisementsList.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            No active advertisements found
                        </div>
                    </div>`;
                return;
            }

            advertisementsList.innerHTML = data.data.map(ad => {
                const validUntil = new Date(ad.validUntil);
                const isExpired = validUntil < new Date();
                
                return `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 ${isExpired ? 'bg-light opacity-75' : ''}">
                            <div class="position-relative">
                                <img src="/uploads/${ad.image}" 
                                     class="card-img-top"
                                     alt="${ad.title}"
                                     style="height: 200px; object-fit: cover;"
                                     onerror="this.src='/img/placeholder.jpg'">
                                ${isExpired ? `
                                    <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50">
                                        <span class="badge bg-danger fs-5">Expired</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">${ad.title}</h5>
                                <p class="card-text">${ad.description}</p>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <del class="text-muted">₹${ad.originalPrice}</del>
                                        <span class="text-danger fw-bold ms-2">₹${ad.offerPrice}</span>
                                    </div>
                                    <small class="text-muted">
                                        Valid till: ${validUntil.toLocaleDateString()}
                                    </small>
                                </div>
                                <button class="btn btn-danger btn-sm w-100" 
                                        onclick="deleteAdvertisement('${ad._id}')">
                                    <i class="bi bi-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading advertisements:', error);
        advertisementsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading advertisements
                </div>
            </div>`;
    }
}

// Add new advertisement form handler
document.getElementById('advertisementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';

        // Validate form
        const title = formData.get('title');
        const description = formData.get('description');
        const originalPrice = parseFloat(formData.get('originalPrice'));
        const offerPrice = parseFloat(formData.get('offerPrice'));
        const validUntil = new Date(formData.get('validUntil'));
        const image = formData.get('image');

        // Basic validation
        if (!title || !description || !originalPrice || !offerPrice || !validUntil || !image) {
            throw new Error('Please fill all required fields');
        }

        if (offerPrice >= originalPrice) {
            throw new Error('Offer price must be less than original price');
        }

        if (validUntil <= new Date()) {
            throw new Error('Validity date must be in the future');
        }

        // Send request
        const response = await fetch('/api/advertisements', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            showNotification('Advertisement added successfully!', 'success');
            
            // Reset form
            form.reset();
            
            // Reload advertisements list
            loadAdvertisements();
        } else {
            throw new Error(result.error || 'Failed to add advertisement');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Advertisement';
    }
});

// Add calculate offer price function
function calculateOfferPrice() {
    const originalPrice = document.getElementById('originalPrice').value;
    const discountPercentage = document.getElementById('discountPercentage').value;
    
    if (originalPrice && discountPercentage) {
        const offerPrice = originalPrice - (originalPrice * discountPercentage / 100);
        document.getElementById('offerPrice').value = offerPrice.toFixed(2);
    }
}

// Update initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    
    // Add logout button
    document.querySelector('.navbar-nav').insertAdjacentHTML('beforeend', `
        <li class="nav-item">
            <button class="btn btn-outline-danger ms-2" onclick="adminLogout()">
                <i class="bi bi-box-arrow-right"></i> Logout
            </button>
        </li>
    `);

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
    
    // Load initial data (removed help requests)
    loadSweets();
    loadActiveOrders();
    loadCompletedOrders();
    loadAdvertisements();
});