// Fetch session data to determine the role
async function getSessionRole() {
    try {
        const response = await fetch('/api/auth/session-data-admin');
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
    const response = await fetch('/api/auth/groupTours');
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
                        <!-- Add additional buttons for document actions -->
                       <div class="d-flex flex-row text-align-start" style="position: relative;">
                                <div class="dropdown">
                                    <button 
                                        class="btn btn-primary btn-sm dropdown-toggle" 
                                        type="button" 
                                        id="actionDropdown-${tour.clientID}" 
                                        data-bs-toggle="dropdown" 
                                        data-bs-container="body" 
                                        aria-expanded="false">
                                        Actions
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="actionDropdown-${tour.clientID}">
                                        ${!tour.sendOriginalDocuments ? `<li><a class="dropdown-item" onclick="sendDocument('${tour.clientID}')">Send Document</a></li>` : ''}
                                        ${!tour.documentSubmitted ? `<li><a class="dropdown-item" onclick="submitDocument('${tour.clientID}')">Document Submitted</a></li>` : ''}
                                        ${!tour.passportRecieved ? `<li><a class="dropdown-item" onclick="receivePassport('${tour.clientID}')">Passport Received</a></li>` : ''}
                                        ${!tour.paymentAcknowledged ? `<li><a class="dropdown-item" onclick="acknowledgePayment('${tour.clientID}')">Acknowledge Payment</a></li>` : ''}
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" onclick="updateStatus('${tour.clientID}', 'Archived')">Archive</a></li>
                                    </ul>
                                </div>
                            </div> 

                    ` : ''}
                </div>
            </td>` : ''}
            <td>${tour.leadName}</td>
           <!-- <td>${tour.email}</td> -->
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
        const response = await fetch(`/api/auth/groupTours/status`, {
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

// Send document notification function
async function sendDocument(clientID) {
    try {
        const response = await fetch(`/api/auth/groupTours/send-document`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientID }),
        });

        if (response.ok) {
            alert('Document notification sent successfully.');
            const currentStatus = document.getElementById('sortSelector').value;
            fetchTours(currentStatus); // Refresh the table
        } else {
            const errorMessage = await response.json();
            alert(`Failed to send document notification: ${errorMessage.error || response.statusText}`);
        }
    } catch (error) {
        alert('An error occurred while sending the document notification. Please try again.');
        console.error('Error sending document notification:', error);
    }
}

// Document submitted function
async function submitDocument(clientID) {
    try {
        const response = await fetch(`/api/auth/groupTours/document-submitted`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientID }),
        });

        if (response.ok) {
            alert('Document submission notification sent successfully.');
            const currentStatus = document.getElementById('sortSelector').value;
            fetchTours(currentStatus); // Refresh the table
        } else {
            const errorMessage = await response.json();
            alert(`Failed to send document submission notification: ${errorMessage.error || response.statusText}`);
        }
    } catch (error) {
        alert('An error occurred while sending the document submission notification. Please try again.');
        console.error('Error sending document submission notification:', error);
    }
}

// Passport received function
async function receivePassport(clientID) {
    try {
        const response = await fetch(`/api/auth/groupTours/passport-received`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientID }),
        });

        if (response.ok) {
            alert('Passport received notification sent successfully.');
            const currentStatus = document.getElementById('sortSelector').value;
            fetchTours(currentStatus); // Refresh the table
        } else {
            const errorMessage = await response.json();
            alert(`Failed to send passport received notification: ${errorMessage.error || response.statusText}`);
        }
    } catch (error) {
        alert('An error occurred while sending the passport received notification. Please try again.');
        console.error('Error sending passport received notification:', error);
    }
}

// Acknowledge payment function
async function acknowledgePayment(clientID) {
    try {
        const response = await fetch(`/api/auth/groupTours/payment-acknowledged`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientID }),
        });

        if (response.ok) {
            alert('Payment acknowledged successfully.');
            const currentStatus = document.getElementById('sortSelector').value;
            fetchTours(currentStatus);
        } else {
            const errorMessage = await response.json();
            alert(`Failed to acknowledge payment: ${errorMessage.error || response.statusText}`);
        }
    } catch (error) {
        alert('An error occurred while acknowledging payment.');
        console.error('Error:', error);
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