// Function to fetch package data and populate cards
async function populatePackages() {
    try {
        // Fetch the package data from the server for specific package IDs
        const response = await fetch('/api/auth/package-content-list');
        if (!response.ok) throw new Error('Failed to fetch package data.');

        const packages = await response.json();

        // Define the mapping for package IDs to card elements
        const packageMapping = {
            "package_1": {
                card: "firstPackage",
                name: "firstPackageName",
                description: "firstPackageDescription",
                coverImage: "coverImage_1",
            },
            "package_2": {
                card: "secondPackage",
                name: "secondPackageName",
                description: "secondPackageDescription",
                coverImage: "coverImage_2",
            },
            "package_3": {
                card: "thirdPackage",
                name: "thirdPackageName",
                description: "thirdPackageDescription",
                coverImage: "coverImage_3",
            },
            "package_4": {
                card: "fourthPackage",
                name: "fourthPackageName",
                description: "fourthPackageDescription",
                coverImage: "coverImage_4",
            },
        };

        // Populate cards with the fetched data
        packages.forEach((pkg) => {
            const elements = packageMapping[pkg.packageId];
            if (!elements) return;

            // Set the package name and description
            document.getElementById(elements.name).textContent = pkg.packageName || '-';
            document.getElementById(elements.description).textContent = pkg.description || '-';

            // Set the cover image
            if (pkg.coverImage?.path) {
                const coverImageUrl = `${window.location.origin}/${pkg.coverImage.path}`;
                console.log(`Cover Image URL for ${pkg.packageId}:`, coverImageUrl); // Debug log
                document.getElementById(elements.coverImage).src = coverImageUrl;
            } else {
                console.warn(`Cover image missing for ${pkg.packageId}`);
            }
        });
    } catch (error) {
        console.error('Error populating packages:', error);
    }
}

// Call the function when the page is loaded
document.addEventListener('DOMContentLoaded', populatePackages);