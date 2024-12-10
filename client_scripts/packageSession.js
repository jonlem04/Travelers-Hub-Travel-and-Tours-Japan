document.addEventListener("DOMContentLoaded", async () => {
    const packageIds = ["package_1", "package_2", "package_3", "package_4"]; // IDs as stored in your database

    try {
        // Fetch and populate each package
        for (const id of packageIds) {
            try {
                const response = await fetch(`/api/auth/package-content?packageId=${id}`);
                if (!response.ok) {
                    console.error(`Failed to fetch package with ID: ${id}`);
                    continue;
                }

                const packageData = await response.json();

                // Check if valid data is received
                if (!packageData || !packageData.packageId) {
                    console.error(`Package with ID ${id} not found.`);
                    continue;
                }

                // Populate the package content into the DOM
                const packageNumber = id.split("_")[1]; // Extract the numeric part (e.g., "1" from "package_1")
                document.getElementById(`packageName_${packageNumber}`).textContent = packageData.packageName;
                document.getElementById(`description_${packageNumber}`).textContent = packageData.description;
                document.getElementById(`price_${packageNumber}`).textContent = packageData.price;

                console.log("Fetched path:", packageData.coverImage && packageData.coverImage.path);

                // Handle cover image path
                if (packageData.coverImage && packageData.coverImage.path) {
                    const imagePath = packageData.coverImage.path.replace(/\\/g, '/'); // Replace backslashes with forward slashes
                    document
                        .querySelector(`#coverImage_${packageNumber}`)
                        .setAttribute("src", `/uploads/${imagePath.split('/').pop()}`);
                } else {
                    console.error(`Cover image path missing for package ID: ${id}`);
                }
            } catch (error) {
                console.error(`Error fetching package with ID: ${id}`, error);
            }
        }

        // Add event listeners to track clicks on packages
        document.querySelectorAll(".linkcont").forEach(link => {
            link.addEventListener("click", async (e) => {
                const packageId = e.currentTarget.id.split("-").pop(); // Extract package ID from element ID
                const packageName = document.getElementById(`packageName_${packageId}`).textContent;

                if (packageName) {
                    // Save the clicked package's name to the session
                    try {
                        const saveResponse = await fetch('/api/auth/package-session-save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ packageName }),
                        });
                        const saveData = await saveResponse.json();
                        if (saveData.message) {
                            console.log(saveData.message);
                        }
                    } catch (error) {
                        console.error('Error saving package name to session:', error);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error fetching package data:', error);
    }
});
