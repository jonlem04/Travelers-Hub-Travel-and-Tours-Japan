// Fetch session data to determine the role
async function getSessionRole() {
    try {
        const response = await fetch('https://condor-right-partially.ngrok-free.app/api/auth/session-data-admin');
        if (!response.ok) {
            console.error('Failed to fetch session data');
            return null;
        }
        const sessionData = await response.json();
        return sessionData.role;
    } catch (error) {
        console.error('Error fetching session data:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const visaTableBody = document.getElementById('visaTableBody');
    const searchInput = document.getElementById('SearchVisa');
    const sortSelector = document.getElementById('sortSelector');

    // Fetch and display visas
    async function fetchVisaData(statusFilter = 'Pending', query = '') {
        try {
            const role = await getSessionRole();
            const response = await fetch(`https://condor-right-partially.ngrok-free.app/api/auth/requirements?search=${query}`);
            const data = await response.json();

            visaTableBody.innerHTML = '';
            const filteredVisas = data.filter(req => req.status === statusFilter);

            filteredVisas.forEach(req => {
                visaTableBody.innerHTML += `
                    <tr>
                        ${role !== 'Staff' ? `<td>
                            ${req.status === 'Pending' ? `
                                <button class="btn btn-primary btn-sm" style="background: #3ba639;" onclick="updateStatus('${req.uniqueID}', 'Accepted')">Accept</button>
                                <button class="btn btn-danger btn-sm" style="background: #e13333;" onclick="updateStatus('${req.uniqueID}', 'Declined')">Decline</button>
                            ` : req.status === 'Accepted' ? `
                                <button class="btn btn-danger btn-sm" onclick="updateStatus('${req.uniqueID}', 'Archived')">Archive</button>
                            ` : ''} 
                        </td>` : ''}
                        <td>${req.name}</td>
                        <td>${req.email}</td>
                        <td>${req.status}</td>
                        <td>${new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td>
                            <a href="VisaInformationView.html?uniqueID=${req.uniqueID}" class="btn btn-primary btn-sm" style="background: #08addc;">View</a>
                        </td>
                    </tr>`;
            });
        } catch (err) {
            console.error('Error fetching visa data:', err);
        }
    }

    // Handle search input
    searchInput.addEventListener('input', (e) => {
        fetchVisaData(sortSelector.value, e.target.value);
    });

    // Handle dropdown selection
    sortSelector.addEventListener('change', (e) => {
        fetchVisaData(e.target.value, searchInput.value);
    });

    // Initialize with default status "Pending"
    fetchVisaData();
});

// Update status function
async function updateStatus(uniqueID, status) {
    try {
        const response = await fetch('http://localhost:5000/api/auth/requirements/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueID, status }),
        });
        const result = await response.json();
        alert(result.message);
        location.reload(); // Refresh the table
    } catch (err) {
        console.error('Error updating status:', err);
    }
}
