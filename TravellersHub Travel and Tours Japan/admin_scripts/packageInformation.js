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

// Fetch data and populate the table based on the selected status
async function fetchTours(statusFilter = 'Pending') {
    const response = await fetch('https://condor-right-partially.ngrok-free.app/api/auth/groupTours');
    const tours = await response.json();

    const tableBody = document.getElementById('packageTableBody');
    tableBody.innerHTML = '';

    // Determine user role
    const role = await getSessionRole();

    // Filter tours based on the statusFilter
    const filteredTours = tours.filter(tour => tour.status === statusFilter);

    filteredTours.forEach(tour => {
        const row = document.createElement('tr');
        row.innerHTML = `
            ${role !== 'Staff' ? `<td>
                <div style="max-width: 200px;">
                    ${tour.status === 'Pending' ? `
                        <button class="btn btn-primary btn-sm" style="background: #3ba639;" onclick="updateStatus('${tour.clientID}', 'Accepted')">Accept</button>
                        <button class="btn btn-danger btn-sm" style="background: #e13333;" onclick="updateStatus('${tour.clientID}', 'Declined')">Decline</button>
                    ` : ''}
                    ${tour.status === 'Accepted' ? `
                        <button class="btn btn-danger btn-sm" onclick="updateStatus('${tour.clientID}', 'Archived')">Archive</button>
                    ` : ''}
                </div>
            </td>` : ''}
            <td>${tour.leadName}</td>
            <td>${tour.email}</td>
            <td>${tour.packageName}</td>
            <td>${tour.groupTourName}</td>
            <td>${tour.status}</td>
            <td><a href="PackageInformationView.html?clientID=${tour.clientID}" class="btn btn-primary btn-sm" style="background: #08addc;">View</a></td>
        `;
        tableBody.appendChild(row);
    });
}

// Update status function
async function updateStatus(clientID, status) {
    try {
        const response = await fetch(`https://condor-right-partially.ngrok-free.app/api/auth/groupTours/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientID, status }),
        });

        if (response.ok) {
            alert(`Status successfully updated to ${status}.`);
            const currentStatus = document.getElementById('sortSelector').value;
            fetchTours(currentStatus); // Refresh the table based on the selected status
        } else {
            const errorMessage = await response.json();
            alert(`Failed to update status: ${errorMessage.error || response.statusText}`);
        }
    } catch (error) {
        alert('An error occurred while updating the status. Please try again.');
        console.error('Error updating status:', error);
    }
}

// Handle dropdown selection change
document.getElementById('sortSelector').addEventListener('change', (event) => {
    const selectedStatus = event.target.value;
    fetchTours(selectedStatus);
});

// Search functionality
document.getElementById('SearchPackage').addEventListener('input', (event) => {
    const searchValue = event.target.value.toLowerCase();
    document.querySelectorAll('#packageTableBody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(searchValue) ? '' : 'none';
    });
});

// Initialize with default status "Pending"
fetchTours();