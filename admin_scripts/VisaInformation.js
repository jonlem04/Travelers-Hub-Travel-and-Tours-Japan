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

document.addEventListener('DOMContentLoaded', async () => {
    const visaTableBody = document.getElementById('visaTableBody');
    const searchInput = document.getElementById('SearchVisa');
    const sortSelector = document.getElementById('sortSelector');

    // Fetch and display visas
    async function fetchVisaData(statusFilter = 'Pending', query = '') {
        try {
            const role = await getSessionRole();
            const response = await fetch(`/api/auth/requirements?search=${query}`);
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
                                <!-- Dropdown for Accepted Status -->
                                <div class="d-flex flex-row text-align-start" style="position: relative;">
                                    <div class="dropdown">
                                        <button 
                                            class="btn btn-primary btn-sm dropdown-toggle" 
                                            type="button" 
                                            id="actionDropdown-${req.uniqueID}" 
                                            data-bs-toggle="dropdown" 
                                            data-bs-container="body" 
                                            aria-expanded="false">
                                            Actions
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="actionDropdown-${req.uniqueID}">
                                            ${!req.sendOriginalDocuments ? `<li><a class="dropdown-item" onclick="sendDocument('${req.uniqueID}')">Send Document</a></li>` : ''}
                                            ${!req.documentSubmitted ? `<li><a class="dropdown-item" onclick="submitDocument('${req.uniqueID}')">Document Submitted</a></li>` : ''}
                                            ${!req.passportRecieved ? `<li><a class="dropdown-item" onclick="receivePassport('${req.uniqueID}')">Passport Received</a></li>` : ''}
                                            <li><hr class="dropdown-divider"></li>
                                            <li><a class="dropdown-item text-danger" onclick="updateStatus('${req.uniqueID}', 'Archived')">Archive</a></li>
                                        </ul>
                                    </div>
                                </div>
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
        const response = await fetch('/api/auth/requirements/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueID, status }),
        });
        const result = await response.json();
        alert(result.message);
        
        /*const currentStatus = document.getElementById('sortSelector').value;
        fetchVisaData(currentStatus);*/

        location.reload();

    } catch (err) {
        console.error('Error updating status:', err);
    }
}


// Send document function
async function sendDocument(uniqueID) {
    try {
        const response = await fetch('/api/auth/requirements/send-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueID }),
        });
        const result = await response.json();
        alert(result.message);

       /* const currentStatus = document.getElementById('sortSelector').value;
        fetchVisaData(currentStatus);*/
        location.reload();


    } catch (err) {
        console.error('Error sending document:', err);
    }
}

// Submit document function
async function submitDocument(uniqueID) {
    try {
        const response = await fetch('/api/auth/requirements/document-submitted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueID }),
        });
        const result = await response.json();
        alert(result.message);

        /*const currentStatus = document.getElementById('sortSelector').value;
        fetchVisaData(currentStatus);*/

        location.reload();
        
    } catch (err) {
        console.error('Error submitting document:', err);
    }
}

// Receive passport function
async function receivePassport(uniqueID) {
    try {
        const response = await fetch('/api/auth/requirements/passport-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uniqueID }),
        });
        const result = await response.json();
        alert(result.message);

        /*const currentStatus = document.getElementById('sortSelector').value;
        fetchVisaData(currentStatus);*/

        location.reload();


    } catch (err) {
        console.error('Error receiving passport:', err);
    }
}