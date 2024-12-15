const GroupTour = require("../models/groupTour");
const multer = require('multer');

// Multer configuration for dynamic file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

exports.upload = multer({
    storage,
}).any(); // Accept any file field

//Generate a random ID for every client booking
const generateRandomID = () => {
    return `ID_${Math.random().toString(36).substr(2, 9)}`;
};


// Handle booking submission
exports.createBooking = async (req, res) => {
    try {
        // Fetch session data
        const client = req.session?.client;
        const packageName = req.session?.packageName;

        if (!client || !packageName) {
            return res.status(400).json({ message: 'Session data missing for leadName or packageName' });
        }

        // Generate leadName and retrieve email from session
        const leadName = `${client.firstName} ${client.middleName || ''} ${client.lastName}`.trim();
        const email = client.email;

        // Generate a random ID for the booking
        const clientID = generateRandomID();

        // Destructure form data
        const {
            additionalTravellers,
            adultNumber,
            childNumber,
            infantNumber,
            ...primaryInfo
        } = req.body;

        const additionalTravellersData = JSON.parse(additionalTravellers || '[]');

        // Helper function to find files by dynamic name
        const findFile = (name) =>
            req.files.find((file) => file.fieldname === name) || null;

        // Map uploaded files to their respective fields
        const mapFile = (file) =>
            file && {
                filename: file.filename,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
            };

        // Create the booking record
        const booking = new GroupTour({
            ...primaryInfo,
            leadName,
            packageName,
            email,
            clientID, // Assign generated ID
            adult: Number(adultNumber),
            child: Number(childNumber),
            infant: Number(infantNumber),
            passportID: mapFile(findFile('passport')),
            visaID: mapFile(findFile('visa')),
            validID: mapFile(findFile('validId')),
            birthCertificate: mapFile(findFile('birthCertificate')),
            picture: mapFile(findFile('picture')),
            paymentReceipt: mapFile(findFile('paymentReceipt')),
            additionalTravellers: additionalTravellersData.map((traveller, index) => ({
                name: index === 0 ? traveller.name : traveller[`name_${index + 1}`],
                passportID: mapFile(findFile(index === 0 ? 'addpassport' : `addpassport_${index + 1}`)),
                visaID: mapFile(findFile(index === 0 ? 'addvisa' : `addvisa_${index + 1}`)),
                validID: mapFile(findFile(index === 0 ? 'addvalidId' : `addvalidId_${index + 1}`)),
                birthCertificate: mapFile(findFile(index === 0 ? 'addbirthCertificate' : `addbirthCertificate_${index + 1}`)),
                picture: mapFile(findFile(index === 0 ? 'addpicture' : `addpicture_${index + 1}`)),
            })),
        });

        await booking.save();
        res.status(201).json({ message: 'Booking successfully submitted!' });
        console.log('Booking successfully submitted: ', booking);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting booking', error });
    }
};
