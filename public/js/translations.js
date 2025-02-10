// Initialize i18next
i18next
    .use(i18nextHttpBackend)
    .init({
        fallbackLng: 'en',
        backend: {
            loadPath: '/translations/{{lng}}.json'
        }
    })
    .then(function(t) {
        updateContent();
    });

// Function to update content with translations
function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18next.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18next.t(key);
    });
}

// Language selector change handler
document.getElementById('languageSelect').addEventListener('change', function(e) {
    i18next.changeLanguage(e.target.value).then(() => {
        updateContent();
        // Store language preference
        localStorage.setItem('preferredLanguage', e.target.value);
        // Reload deals with new language
        if (typeof loadDeals === 'function') {
            loadDeals();
        }
    });
});

// Set initial language from localStorage or browser preference
document.addEventListener('DOMContentLoaded', () => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    const browserLanguage = navigator.language.split('-')[0];
    const initialLanguage = savedLanguage || browserLanguage || 'en';
    
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect.querySelector(`option[value="${initialLanguage}"]`)) {
        languageSelect.value = initialLanguage;
        i18next.changeLanguage(initialLanguage).then(() => {
            updateContent();
        });
    }
});
