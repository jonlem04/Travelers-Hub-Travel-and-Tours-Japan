// Fetch and update dashboard statistics
document.addEventListener('DOMContentLoaded', () => {
    const userCountElem = document.getElementById('UserCount');
    const packageCountElem = document.getElementById('PackageCount');
    const visaCountElem = document.getElementById('VisaCount');
    const testimonialCountElem = document.getElementById('TestimonialsCount');

    fetch('/api/auth/dashboard-stats')
        .then((response) => {
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            return response.json();
        })
        .then((data) => {
            userCountElem.textContent = data.users;
            packageCountElem.textContent = data.packages;
            visaCountElem.textContent = data.visas; // Dynamic visa count
            testimonialCountElem.textContent = data.testimonials;
        })
        .catch((error) => console.error('Error fetching dashboard stats:', error));
});

// Function to initialize charts
function initializeCharts(packageData, visaData) {
    // Package Overview Chart
    const packageCtx = document.getElementById('packageOverviewChart').getContext('2d');
    new Chart(packageCtx, {
        type: 'bar',
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [{
                label: 'Packages',
                backgroundColor: '#acf248',
                borderColor: '#8dc53e',
                borderWidth: 4,
                data: packageData,
            }],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: { grid: { drawOnChartArea: false } },
                y: { grid: { drawOnChartArea: true } },
            },
        },
    });

    // Visa Overview Chart
    const visaCtx = document.getElementById('visaOverviewChart').getContext('2d');
    new Chart(visaCtx, {
        type: 'bar',
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [{
                label: 'Visas',
                backgroundColor: '#e45858',
                borderColor: '#b12121',
                borderWidth: 4,
                data: visaData,
            }],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: { grid: { drawOnChartArea: false } },
                y: { grid: { drawOnChartArea: true } },
            },
        },
    });
}

// Fetch chart data and initialize charts
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/auth/chart-data')
        .then((response) => {
            if (!response.ok) throw new Error('Failed to fetch chart data');
            return response.json();
        })
        .then((data) => initializeCharts(data.packages, data.visas))
        .catch((error) => console.error('Error initializing charts:', error));
});