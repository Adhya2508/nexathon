document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    let isLoginMode = true;

    function switchMode(mode) {
        isLoginMode = mode === 'login';
        if (isLoginMode) {
            loginTab.classList.remove('btn-secondary');
            loginTab.classList.add('btn-primary');
            signupTab.classList.remove('btn-primary');
            signupTab.classList.add('btn-secondary');
        } else {
            signupTab.classList.remove('btn-secondary');
            signupTab.classList.add('btn-primary');
            loginTab.classList.remove('btn-primary');
            loginTab.classList.add('btn-secondary');
        }
        updateFormFields();
    }

    // Toggle between login and signup
    loginTab.addEventListener('click', () => switchMode('login'));
    signupTab.addEventListener('click', () => switchMode('signup'));

    function updateFormFields() {
        const formHtml = isLoginMode ? `
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-btn">Login</button>
        ` : `
            <div class="form-group">
                <label for="fullname">Full Name</label>
                <input type="text" id="fullname" name="fullname" required>
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-btn">Sign Up</button>
        `;

        // Keep the social login section
        const socialSection = `
            <div class="social-login">
                <p>Or continue with</p>
                <div class="social-buttons">
                    <button type="button" class="social-btn">
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDE4IDE4Ij48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTYuNTEgOEg4Ljk4djNINTMuMDFBNy4xMiA3LjEyIDAgMCAxIDkgMTYuOTlhNy4xMiA3LjEyIDAgMCAxLTcuMTQtNy4wOEE3LjEyIDcuMTIgMCAwIDEgOSAyLjgzYTcuMDcgNy4wNyAwIDAgMSA0LjkgMS45MUwxNi40MyAyLjJBOS45MyA5LjkzIDAgMCAwIDkgMEE5IDkgMCAwIDAgOSAxOGE5IDkgMCAwIDAgOS05LjE4eiIvPjwvc3ZnPg==" alt="Google">
                        Google
                    </button>
                    <button type="button" class="social-btn">
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDE4IDE4Ij48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTggOUExNy45OSAxNy45OSAwIDAgMSAxNi4zNyAxNHYtLjAzYy0uODggMi41LTIuNDkgNC4xLTQuMzggNC4xLTIuMzEgMC00LjItMS44LTQuMi00LjA3IDAtMi4yNSAxLjg5LTQuMDcgNC4yLTQuMDcgMS4xIDAgMi4xLjQzIDIuODUgMS4xNFY3LjgzQzEzLjg3IDcuMzMgMTIuOTggNyAxMiA3Yy0zLjMxIDAtNiAyLjY5LTYgNnMyLjY5IDYgNiA2YzMuMDIgMCA1LjUxLTIuMjQgNS45Ny01LjE1SDEyVjEwaDZ6Ii8+PC9zdmc+" alt="Facebook">
                        Facebook
                    </button>
                </div>
            </div>
        `;

        loginForm.innerHTML = formHtml + socialSection;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        if (!isLoginMode) {
            formData.fullname = document.getElementById('fullname').value;
        }

        try {
            const endpoint = isLoginMode ? '/api/customer/login' : '/api/customer/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            if (isLoginMode) {
                localStorage.setItem('customerToken', data.token);
                window.location.href = '/customer-dashboard.html';
            } else {
                alert('Registration successful! Please login.');
                switchMode('login');
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message || 'An error occurred. Please try again.');
        }
    });

    // Handle social login buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Social login feature coming soon!');
        });
    });

    // Initialize form
    updateFormFields();
});
