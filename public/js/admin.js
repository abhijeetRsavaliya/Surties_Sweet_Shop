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
});