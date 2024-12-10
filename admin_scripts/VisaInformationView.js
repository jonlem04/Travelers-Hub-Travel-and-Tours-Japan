document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const uniqueID = params.get('uniqueID');

    if (!uniqueID) {
        alert('No requirement uniqueID provided.');
        return;
    }

    try {
        const response = await fetch(`/api/auth/requirements/${uniqueID}`);
        const data = await response.json();

        document.getElementById('fullName').textContent = data.name;
        document.getElementById('email').textContent = data.email;
        document.getElementById('status').textContent = data.status;

        // Map database fields to HTML IDs
        const fieldToIdMap = {
            passportFile: 'passportID',
            visaApplicationFile: 'visaID',
            photoFile: 'picture',
            birthCertificateFile: 'birthCertificate',
            marriageCertificateFile: 'marriageCertificate',
            itineraryJapan: 'itinerary',
            personalBankCertificateFile: 'personalBankCertificate',
            taxPaymentCertificateFile: 'taxPaymentCertificate',
            employmentCertificateFile: 'employmentCertificate',
        };

        // Load images dynamically
        Object.entries(fieldToIdMap).forEach(([field, id]) => {
            if (data[field]?.path) {
                const imgElement = document.getElementById(id);
                if (imgElement) {
                    imgElement.src = `${data[field].path}`;
                    imgElement.alt = `${field} file`; // Set an alt attribute for accessibility
                } else {
                    console.warn(`Element with ID '${id}' not found in the DOM.`);
                }
            }
        });
    } catch (err) {
        console.error('Error fetching requirement:', err);
    }
});