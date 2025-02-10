document.addEventListener('DOMContentLoaded', () => {
    const dealsGrid = document.getElementById('dealsGrid');
    const sortFilter = document.getElementById('sortFilter');
    const loadingSpinner = document.getElementById('loadingSpinner');
    let currentDeals = [];

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
    }

    async function getAllDeals() {
        showLoading();
        try {
            const response = await fetch('/api/deals');
            if (!response.ok) throw new Error('Failed to fetch deals');
            
            currentDeals = await response.json();
            sortAndDisplayDeals();
        } catch (error) {
            console.error('Error:', error);
            dealsGrid.innerHTML = '<p class="error">Failed to load deals. Please try again later.</p>';
        } finally {
            hideLoading();
        }
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function sortAndDisplayDeals() {
        let sortedDeals = [...currentDeals];
        
        switch(sortFilter.value) {
            case 'discount':
                sortedDeals.sort((a, b) => b.discount - a.discount);
                break;
            case 'expiry':
                sortedDeals.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
                break;
        }

        displayDeals(sortedDeals);
    }

    function displayDeals(deals) {
        if (deals.length === 0) {
            dealsGrid.innerHTML = '<p class="no-deals">No deals available at the moment.</p>';
            return;
        }

        dealsGrid.innerHTML = deals.map(deal => {
            const validUntil = new Date(deal.expiryDate);
            const today = new Date();
            const daysLeft = Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24));
            const expiryClass = daysLeft <= 3 ? 'expiring-soon' : '';

            return `
                <div class="deal-card ${expiryClass}">
                    <div class="deal-header">
                        <h3 class="deal-title">${deal.title || deal.name}</h3>
                        <span class="badge badge-discount">${deal.discount}% OFF</span>
                    </div>
                    <div class="deal-info">
                        <p class="deal-business">
                            <i class="fas fa-store"></i> ${deal.business || deal.businessName}
                        </p>
                        <p class="deal-description">${deal.description}</p>
                        <div class="deal-meta">
                            <span class="badge badge-expiry">
                                <i class="far fa-clock"></i> 
                                ${daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
                            </span>
                        </div>
                        <div class="deal-footer">
                            <p class="deal-expiry">Valid until: ${formatDate(deal.expiryDate)}</p>
                            <button onclick="claimDeal('${deal._id}')" class="primary-btn">
                                Claim Deal
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    sortFilter.addEventListener('change', sortAndDisplayDeals);
    getAllDeals();
});

async function claimDeal(dealId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to claim this deal');
            return;
        }

        const response = await fetch(`/api/deals/${dealId}/claim`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to claim deal');
        
        const result = await response.json();
        alert(`Deal claimed successfully! Your voucher code is: ${result.voucher.code}`);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to claim deal. Please try again later.');
    }
}
