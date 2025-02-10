// Auth utility functions
const authUtils = {
    isLoggedIn() {
        return localStorage.getItem('token') !== null;
    },

    getUser() {
        return {
            token: localStorage.getItem('token'),
            username: localStorage.getItem('username'),
            userType: localStorage.getItem('userType')
        };
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userType');
        window.location.href = '/login.html';
    },

    redirectIfNotAuthenticated() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
        }
    },

    redirectIfAuthenticated() {
        if (this.isLoggedIn()) {
            const userType = localStorage.getItem('userType');
            if (userType === 'business') {
                window.location.href = '/business-dashboard.html';
            } else {
                window.location.href = '/customer-dashboard.html';
            }
        }
    },

    updateNavigation() {
        const isLoggedIn = this.isLoggedIn();
        const userType = localStorage.getItem('userType');
        const navLinks = document.querySelector('.navbar-nav');
        
        if (!navLinks) return;

        if (isLoggedIn) {
            navLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="/">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/deals.html">Deals</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="${userType === 'business' ? '/business-dashboard.html' : '/customer-dashboard.html'}">Dashboard</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="authUtils.logout(); return false;">Logout</a>
                </li>
            `;
        } else {
            navLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="/">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/deals.html">Deals</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/login.html">Customer Login</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/business-auth.html">Business Login</a>
                </li>
            `;
        }
    }
};
