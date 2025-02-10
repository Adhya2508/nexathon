class SpinWheel {
    constructor() {
        this.wheel = document.getElementById('wheel');
        this.spinButton = document.getElementById('spinButton');
        this.rewards = [
            { text: '10% Extra', probability: 0.3, color: '#FF6B6B', value: 10 },
            { text: '20% Extra', probability: 0.2, color: '#4ECDC4', value: 20 },
            { text: 'Jackpot!', probability: 0.1, color: '#FFD93D', value: 50 },
            { text: '5% Extra', probability: 0.4, color: '#95A5A6', value: 5 }
        ];
        this.setupWheel();
    }

    setupWheel() {
        this.rewards.forEach((reward, index) => {
            const segment = document.createElement('div');
            segment.style.position = 'absolute';
            segment.style.width = '50%';
            segment.style.height = '50%';
            segment.style.transform = `rotate(${index * (360 / this.rewards.length)}deg)`;
            segment.style.transformOrigin = '100% 100%';
            segment.style.backgroundColor = reward.color;
            
            const text = document.createElement('span');
            text.textContent = reward.text;
            text.style.position = 'absolute';
            text.style.left = '20%';
            text.style.top = '20%';
            text.style.transform = 'rotate(45deg)';
            text.style.color = '#FFFFFF';
            segment.appendChild(text);
            
            this.wheel.appendChild(segment);
        });
    }

    spin() {
        return new Promise(resolve => {
            const randomDegrees = Math.floor(Math.random() * 360);
            const rotations = 5;
            const totalDegrees = (rotations * 360) + randomDegrees;
            
            this.wheel.style.transform = `rotate(${totalDegrees}deg)`;
            
            setTimeout(() => {
                const finalPosition = randomDegrees % 360;
                const rewardIndex = Math.floor(finalPosition / (360 / this.rewards.length));
                resolve(this.rewards[rewardIndex]);
            }, 4000);
        });
    }
}

class CustomerDashboard {
    constructor() {
        this.points = 0;
        this.spinWheel = new SpinWheel();
        this.setupEventListeners();
        this.loadUserData();
    }

    setupEventListeners() {
        document.getElementById('spinButton').addEventListener('click', () => this.handleSpin());
        document.getElementById('logout').addEventListener('click', () => this.handleLogout());
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/customer/data', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.points = data.points || 0;
                this.updateDashboardStats(data);
                this.loadClaimedOffers();
                this.loadAvailableOffers();
                this.loadRecentActivity(data);
            } else {
                throw new Error('Failed to load user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            alert('Error loading user data. Please try logging in again.');
            window.location.href = '/customer-login.html';
        }
    }

    updateDashboardStats(data) {
        document.getElementById('pointsDisplay').textContent = data.points || 0;
        document.getElementById('claimedOffersCount').textContent = (data.claimedOffers || []).length;
        document.getElementById('rewardsCount').textContent = (data.rewards || []).length;
        
        // Calculate total savings
        const totalSavings = [...(data.claimedOffers || []), ...(data.rewards || [])]
            .reduce((sum, item) => sum + (item.value || 0), 0);
        document.getElementById('totalSavings').textContent = `$${totalSavings}`;
    }

    loadRecentActivity(data) {
        const activityTable = document.getElementById('activityTable');
        activityTable.innerHTML = '';

        // Combine and sort all activities
        const activities = [
            ...(data.claimedOffers || []).map(offer => ({
                type: 'Claimed Offer',
                points: offer.points || 0,
                date: new Date(offer.claimedAt)
            })),
            ...(data.rewards || []).map(reward => ({
                type: 'Won Reward',
                points: reward.value || 0,
                date: new Date(reward.wonAt)
            }))
        ].sort((a, b) => b.date - a.date).slice(0, 5);

        activities.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${activity.type}</td>
                <td>${activity.points}</td>
                <td>${activity.date.toLocaleDateString()}</td>
            `;
            activityTable.appendChild(row);
        });
    }

    async handleSpin() {
        if (this.points < 10) {
            alert('You need 10 points to spin the wheel!');
            return;
        }

        document.getElementById('spinButton').disabled = true;

        try {
            const reward = await this.spinWheel.spin();
            
            // Deduct points and update backend
            this.points -= 10;
            await fetch('/api/customer/points', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ points: this.points })
            });

            // Save the reward
            await this.saveReward(reward);

            // Show reward modal
            const modal = new bootstrap.Modal(document.getElementById('rewardModal'));
            document.getElementById('rewardMessage').textContent = `You won ${reward.text}!`;
            modal.show();

            // Reload user data to update stats
            this.loadUserData();
        } catch (error) {
            console.error('Error during spin:', error);
            alert('Error occurred during spin. Please try again.');
        } finally {
            document.getElementById('spinButton').disabled = false;
        }
    }

    async saveReward(reward) {
        try {
            await fetch('/api/customer/rewards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reward })
            });
        } catch (error) {
            console.error('Error saving reward:', error);
        }
    }

    async loadClaimedOffers() {
        try {
            const response = await fetch('/api/customer/claimed-offers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
                }
            });
            
            if (response.ok) {
                const offers = await response.json();
                const container = document.getElementById('claimedOffers');
                container.innerHTML = '';
                
                offers.forEach(offer => {
                    const offerCard = this.createOfferCard(offer, true);
                    container.appendChild(offerCard);
                });
            }
        } catch (error) {
            console.error('Error loading claimed offers:', error);
        }
    }

    async loadAvailableOffers() {
        try {
            const response = await fetch('/api/customer/available-offers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
                }
            });
            
            if (response.ok) {
                const offers = await response.json();
                const container = document.getElementById('availableOffers');
                container.innerHTML = '';
                
                offers.forEach(offer => {
                    const offerCard = this.createOfferCard(offer, false);
                    container.appendChild(offerCard);
                });
            }
        } catch (error) {
            console.error('Error loading available offers:', error);
        }
    }

    createOfferCard(offer, claimed) {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        
        col.innerHTML = `
            <div class="offer-card ${claimed ? 'claimed' : ''}">
                <h5>${offer.title || 'Special Offer'}</h5>
                <p>${offer.description || 'No description available'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-primary">${offer.points || 0} points</span>
                    ${claimed ? 
                        `<span class="badge bg-success">Claimed</span>` : 
                        `<button class="btn btn-sm btn-primary claim-offer" data-offer-id="${offer._id}">Claim</button>`
                    }
                </div>
            </div>
        `;

        if (!claimed) {
            col.querySelector('.claim-offer').addEventListener('click', () => this.claimOffer(offer._id));
        }

        return col;
    }

    async claimOffer(offerId) {
        try {
            const response = await fetch('/api/customer/claim-offer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('customerToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ offerId })
            });

            if (response.ok) {
                alert('Offer claimed successfully!');
                this.loadUserData();
            } else {
                throw new Error('Failed to claim offer');
            }
        } catch (error) {
            console.error('Error claiming offer:', error);
            alert('Error claiming offer. Please try again.');
        }
    }

    handleLogout() {
        localStorage.removeItem('customerToken');
        window.location.href = '/customer-login.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading overlay
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    function showLoading() {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    }
    
    function hideLoading() {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    // Initialize tooltips and popovers
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'btn btn-primary position-fixed d-md-none';
    sidebarToggle.style.cssText = 'top: 10px; left: 10px; z-index: 1050;';
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.appendChild(sidebarToggle);

    sidebarToggle.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });

    // Fetch user data
    async function fetchUserData() {
        try {
            showLoading();
            const response = await fetch('/api/customer-data', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch user data');
            
            const data = await response.json();
            updateDashboard(data);
        } catch (error) {
            console.error('Error fetching user data:', error);
            showError('Failed to load user data. Please try again later.');
        } finally {
            hideLoading();
        }
    }

    // Update dashboard with user data
    function updateDashboard(data) {
        // Animate number updates
        animateNumber('pointsDisplay', data.points || 0);
        animateNumber('claimedOffersCount', data.claimedOffers?.length || 0);
        animateNumber('rewardsCount', data.rewards?.length || 0);
        animateNumber('totalSavings', data.totalSavings || 0, true);

        // Update activity table with animation
        const activityTable = document.getElementById('activityTable');
        activityTable.innerHTML = '';
        
        if (data.activity && data.activity.length > 0) {
            data.activity.forEach((activity, index) => {
                const row = document.createElement('tr');
                row.style.opacity = '0';
                row.style.transform = 'translateY(20px)';
                row.style.transition = 'all 0.3s ease';
                row.style.transitionDelay = `${index * 0.1}s`;
                
                row.innerHTML = `
                    <td>${activity.description}</td>
                    <td class="${activity.points >= 0 ? 'text-success' : 'text-danger'}">
                        ${activity.points >= 0 ? '+' : ''}${activity.points}
                    </td>
                    <td>${new Date(activity.date).toLocaleDateString()}</td>
                `;
                
                activityTable.appendChild(row);
                setTimeout(() => {
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, 50);
            });
        } else {
            activityTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">
                        <i class="fas fa-info-circle me-2"></i>No recent activity
                    </td>
                </tr>
            `;
        }

        // Update offers sections
        updateOffers(data.availableOffers || [], 'availableOffers');
        updateOffers(data.claimedOffers || [], 'claimedOffers', true);
    }

    // Animate number updates
    function animateNumber(elementId, finalValue, isCurrency = false) {
        const element = document.getElementById(elementId);
        const startValue = parseInt(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const duration = 1000; // Animation duration in milliseconds
        const steps = 60; // Number of steps in the animation
        const stepValue = (finalValue - startValue) / steps;
        let currentStep = 0;

        const animation = setInterval(() => {
            currentStep++;
            const currentValue = startValue + (stepValue * currentStep);
            
            if (isCurrency) {
                element.textContent = `$${currentValue.toFixed(2)}`;
            } else {
                element.textContent = Math.round(currentValue);
            }

            if (currentStep >= steps) {
                clearInterval(animation);
                if (isCurrency) {
                    element.textContent = `$${finalValue.toFixed(2)}`;
                } else {
                    element.textContent = finalValue;
                }
            }
        }, duration / steps);
    }

    // Update offers display
    function updateOffers(offers, containerId, claimed = false) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (offers.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-${claimed ? 'check-circle' : 'gift'} fa-3x mb-3"></i>
                        <p class="mb-0">No ${claimed ? 'claimed' : 'available'} offers yet</p>
                    </div>
                </div>
            `;
            return;
        }

        offers.forEach((offer, index) => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-4';
            col.style.opacity = '0';
            col.style.transform = 'translateY(20px)';
            col.style.transition = 'all 0.3s ease';
            col.style.transitionDelay = `${index * 0.1}s`;

            col.innerHTML = `
                <div class="offer-card ${claimed ? 'claimed' : ''}">
                    <h5>
                        <i class="fas fa-${offer.icon || 'gift'} me-2"></i>
                        ${offer.title}
                    </h5>
                    <p>${offer.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${claimed ? 'success' : 'primary'}">
                            ${claimed ? 'Claimed' : `${offer.points} Points`}
                        </span>
                        ${!claimed ? `
                            <button class="btn btn-sm btn-outline-primary claim-offer" data-offer-id="${offer.id}">
                                <i class="fas fa-gift me-2"></i>Claim
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            container.appendChild(col);
            setTimeout(() => {
                col.style.opacity = '1';
                col.style.transform = 'translateY(0)';
            }, 50);
        });

        // Add click handlers for claim buttons
        if (!claimed) {
            container.querySelectorAll('.claim-offer').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const offerId = e.target.dataset.offerId;
                    await claimOffer(offerId);
                });
            });
        }
    }

    // Claim offer
    async function claimOffer(offerId) {
        try {
            showLoading();
            const response = await fetch('/api/claim-offer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ offerId })
            });

            if (!response.ok) throw new Error('Failed to claim offer');

            const data = await response.json();
            showSuccess('Offer claimed successfully!');
            await fetchUserData(); // Refresh dashboard data
        } catch (error) {
            console.error('Error claiming offer:', error);
            showError('Failed to claim offer. Please try again.');
        } finally {
            hideLoading();
        }
    }

    // Spin wheel functionality
    const spinButton = document.getElementById('spinButton');
    const wheel = document.getElementById('wheel');
    let isSpinning = false;

    spinButton.addEventListener('click', async function() {
        if (isSpinning) return;
        
        try {
            isSpinning = true;
            spinButton.disabled = true;
            
            const response = await fetch('/api/spin', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Spin failed');

            const data = await response.json();
            
            // Animate wheel spin
            const spinDegrees = 1800 + (data.segment * (360 / 8)); // Assuming 8 segments
            wheel.style.transform = `rotate(${spinDegrees}deg)`;
            
            // Show reward after spin animation
            setTimeout(() => {
                const rewardModal = new bootstrap.Modal(document.getElementById('rewardModal'));
                document.getElementById('rewardMessage').textContent = data.message;
                rewardModal.show();
                
                // Reset wheel and button after showing reward
                setTimeout(() => {
                    wheel.style.transform = 'rotate(0deg)';
                    isSpinning = false;
                    spinButton.disabled = false;
                    fetchUserData(); // Refresh dashboard data
                }, 1000);
            }, 4000);
        } catch (error) {
            console.error('Error spinning wheel:', error);
            showError('Failed to spin the wheel. Please try again.');
            isSpinning = false;
            spinButton.disabled = false;
        }
    });

    // Toast notifications
    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'danger');
    }

    function showToast(message, type) {
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
        return container;
    }

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // Initial load
    fetchUserData();
    new CustomerDashboard();
});
