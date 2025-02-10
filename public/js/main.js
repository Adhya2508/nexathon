document.addEventListener('DOMContentLoaded', () => {
    const dealsList = document.getElementById('dealsList');
    const findDealsBtn = document.getElementById('findDeals');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const locationStatus = document.getElementById('locationStatus');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
    }

    function showError(message) {
        locationStatus.textContent = i18next.t(message);
        locationStatus.style.color = '#e74c3c';
    }

    async function getNearbyDeals(position) {
        const { latitude, longitude } = position.coords;
        showLoading();
        
        try {
            const currentLang = i18next.language;
            const response = await fetch(`/api/deals/nearby?lat=${latitude}&lng=${longitude}&lang=${currentLang}`);
            if (!response.ok) throw new Error('Failed to fetch deals');
            
            const deals = await response.json();
            displayDeals(deals);
        } catch (error) {
            showError('common.error');
            console.error('Error:', error);
        } finally {
            hideLoading();
        }
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString(i18next.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function displayDeals(deals) {
        if (deals.length === 0) {
            dealsList.innerHTML = `<p class="no-deals">${i18next.t('common.noDeals')}</p>`;
            return;
        }

        dealsList.innerHTML = deals.map(deal => `
            <div class="deal-card">
                <h3>${deal.name}</h3>
                <p class="deal-business">${deal.businessName}</p>
                <p class="deal-discount">${deal.discount}% ${i18next.t('deals.discount')}</p>
                <p class="deal-description">${deal.description}</p>
                <p class="deal-expiry">${i18next.t('deals.expires')}: ${formatDate(deal.expiryDate)}</p>
                <button onclick="simulatePayment('${deal._id}')" class="primary-btn">
                    ${i18next.t('deals.claimDeal')}
                </button>
            </div>
        `).join('');
    }

    // Chatbot functionality
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        chatMessages.innerHTML += `
            <div class="chat-message user-message">
                <p>${message}</p>
            </div>
        `;

        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Show loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'chat-message bot-message loading';
        loadingMessage.innerHTML = `<p>${i18next.t('chat.loading')}</p>`;
        chatMessages.appendChild(loadingMessage);

        try {
            const response = await fetch('/api/deals/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: message,
                    lang: i18next.language
                })
            });

            const data = await response.json();
            
            // Remove loading message
            loadingMessage.remove();

            // Add bot response
            chatMessages.innerHTML += `
                <div class="chat-message bot-message">
                    <p>${data.response}</p>
                </div>
            `;
        } catch (error) {
            loadingMessage.remove();
            chatMessages.innerHTML += `
                <div class="chat-message bot-message error">
                    <p>${i18next.t('common.error')}</p>
                </div>
            `;
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    findDealsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                getNearbyDeals,
                (error) => {
                    hideLoading();
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            showError('Please enable location access to find deals near you.');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            showError('Location information is unavailable.');
                            break;
                        case error.TIMEOUT:
                            showError('Location request timed out.');
                            break;
                        default:
                            showError('An unknown error occurred.');
                    }
                }
            );
        } else {
            showError('Geolocation is not supported by your browser');
        }
    });

    // Chat event listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

function simulatePayment(dealId) {
    alert(i18next.t('deals.claimSuccess'));
}
