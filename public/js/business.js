document.addEventListener('DOMContentLoaded', () => {
    const newDealForm = document.getElementById('newDealForm');
    const businessDeals = document.getElementById('businessDeals');
    let userLocation = null;

    function getUserLocation() {
        if (navigator.geolocation) { 
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Please enable location access to create deals.');
                }
            );
        }
    }

    async function getBusinessDeals(businessName) {
        try {
            const response = await fetch(`/api/business/deals?businessName=${encodeURIComponent(businessName)}`);
            if (!response.ok) throw new Error('Failed to fetch business deals');
            
            const deals = await response.json();
            displayBusinessDeals(deals);
        } catch (error) {
            console.error('Error:', error);
            businessDeals.innerHTML = '<p class="error">Failed to load your deals. Please try again later.</p>';
        }
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function displayBusinessDeals(deals) {
        if (deals.length === 0) {
            businessDeals.innerHTML = '<p class="no-deals">You haven\'t created any deals yet.</p>';
            return;
        }

        businessDeals.innerHTML = deals.map(deal => `
            <div class="deal-card">
                <h3>${deal.name}</h3>
                <p class="deal-discount">${deal.discount}% OFF</p>
                <p class="deal-description">${deal.description}</p>
                <p class="deal-expiry">Expires: ${formatDate(deal.expiryDate)}</p>
                <button onclick="editDeal('${deal._id}')" class="secondary-btn">Edit Deal</button>
            </div>
        `).join('');
    }

    newDealForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!userLocation) {
            alert('Please enable location access to create deals.');
            return;
        }

        const formData = new FormData(newDealForm);
        const dealData = {
            name: formData.get('name'),
            businessName: formData.get('businessName'),
            discount: parseInt(formData.get('discount')),
            description: formData.get('description'),
            expiryDate: formData.get('expiryDate'),
            location: {
                type: 'Point',
                coordinates: [userLocation.longitude, userLocation.latitude]
            }
        };

        try {
            const response = await fetch('/api/deals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dealData)
            });

            if (!response.ok) throw new Error('Failed to create deal');

            alert('Deal created successfully!');
            newDealForm.reset();
            getBusinessDeals(dealData.businessName);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create deal. Please try again.');
        }
    });

    getUserLocation();

    // Load existing deals if business name is stored
    const storedBusinessName = localStorage.getItem('businessName');
    if (storedBusinessName) {
        document.getElementById('businessName').value = storedBusinessName;
        getBusinessDeals(storedBusinessName);
    }
});

function editDeal(dealId) {
    alert('Edit functionality will be implemented in the next version.');
    // In a real app, this would open an edit form
}
