// Fetch and display archived and declined tours
async function fetchArchivedTours(statusFilter = 'Declined') {
    const response = await fetch('/api/auth/groupTours/archive');
    const tours = await response.json();

    const tableBody = document.getElementById('packageArchiveTableBody');
    tableBody.innerHTML = '';

    // Filter tours based on the statusFilter
    const filteredTours = tours.filter(tour => tour.status === statusFilter);

    filteredTours.forEach(tour => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tour.leadName || '-'}</td>
            <td>${tour.email || '-'}</td>
            <td>${tour.packageName || '-'}</td>
            <td>${tour.groupTourName || '-'}</td>
            <td>${tour.leadName || '-'}</td>
            <td>${tour.status || '-'}</td>
            <td><a href="PackageInformationView.html?clientID=${tour.clientID}" class="btn btn-primary btn-sm" style="background: #08addc;">View</a></td>
        `;
        tableBody.appendChild(row);
    });
}

// Handle dropdown selection change
document.getElementById('sortSelector').addEventListener('change', (event) => {
    const selectedStatus = event.target.value;
    fetchArchivedTours(selectedStatus);
});

// Search functionality
document.getElementById('SearchPackageArchive').addEventListener('input', (event) => {
    const searchValue = event.target.value.toLowerCase();
    document.querySelectorAll('#packageArchiveTableBody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(searchValue) ? '' : 'none';
    });
});

// Initialize with default status "Declined"
fetchArchivedTours();
