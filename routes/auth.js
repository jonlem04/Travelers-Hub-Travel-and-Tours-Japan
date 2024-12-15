const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const Testimony = require('../models/Testimony');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Requirements = require('../models/Requirements'); // Path to your Requirements model
const PackageContent = require('../models/PackageContent'); // Adjust path as needed
const GroupTour = require('../models/groupTour');

const bookingController = require('../routes/bookingController'); 


const jwtSecret = process.env.JWT_SECRET || 'defaultFallbackSecret'; //JWT Secret for authentication


// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join('uploads/');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueSuffix);
    }
});

// Initialize multer with only storage
const upload = multer({ storage });

const router = express.Router();

//routes for booking
router.post('/booking-lead',
    bookingController.upload, // Handle file uploads
    bookingController.createBooking // Handle booking logic
);



/* --------------------------------- Register Route ------------------------------------- */

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'travellershubtravelandtours03@gmail.com', // Your email
        pass: 'fdty wppr jqps awcc', // Your app password
    },
});

router.post('/register', async (req, res) => {
    const {
        firstName,
        middleName,
        lastName,
        email,
        password,
        confirmPassword,
        phoneNumber,
        birthDate,
        addressHouseNumber,
        addressStreet,
        addressVillage,
        addressBarangay,
        addressCity,
    } = req.body;

    if (password !== confirmPassword) {
        return res.json({ success: false, msg: 'Passwords do not match' });
    }

    // Combine address fields into a single string
    const address = `${addressHouseNumber} ${addressStreet}, ${addressVillage}, ${addressBarangay}, ${addressCity}`;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.json({ success: false, msg: 'User already exists' });
        }

        // Create new user with "Not Verified" status
        user = new User({
            firstName,
            middleName,
            lastName,
            email,
            password,
            phoneNumber,
            birthDate,
            address,
            status: 'Not Verified',
        });
        await user.save();

        // Generate token for email verification
        const token = jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });

        // Send email with the verification link
        const baseUrl = `${req.protocol}://${req.get('host')}`; // Automatically detects the deployed URL
        const verificationLink = `${baseUrl}/EmailConfirm?token=${token}`;

        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<p>Click the link below to verify your email:</p>
                   <a href="${verificationLink}">Verify Email</a>`,
        });

        // Redirect to Email Verify page
        res.redirect('/EmailVerify');
        console.log("Email verification link sent to " + email);
        
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ success: false, msg: 'Server error' });
    }
});



// Email verification endpoint
router.get('/EmailConfirmed', async (req, res) => {
    const { token } = req.query;

    try {
        // Verify token
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res.status(400).send('Invalid token or user not found.');
        }

        if (user.status === 'Verified') {
            console.log('User already verified.');
            return res.status(200).send('User already verified.');
        }

        // Update user status to "Verified"
        user.status = 'Verified';
        await user.save();
        console.log(user.email + ' updated to verified.');

        return res.status(200).send('Email verified successfully.');
    } catch (err) {
        console.error('Verification error:', err);
        return res.status(400).send('Invalid or expired token.');
    }
});


// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, msg: 'User not found' });
        }

        // Check if the user is verified
        if (user.status !== 'Verified') {
            return res.json({ success: false, msg: 'Please verify your email first.' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, msg: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(payload, jwtSecret, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;

            // Save user information in session
            req.session.client = {
                objectID: user._id.toString(),
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                birthDate: user.birthDate,
                address: user.address,
                status: user.status,
            };

            console.log('Session created:', req.session.client);

            // Check if packageID exists in session
            const packageID = req.session.selectedPackage; // Assume 'selectedPackage' stores the package ID
            console.log('Selected package ID:', packageID);

            // If packageID exists, redirect to the package-specific page
            if (packageID) {
                const packagePage = `/Clientpage/${packageID}`;
                console.log('Redirecting to package-specific page:', packagePage + ' using ' + packageID);

                return res.json({ success: true, redirectTo: packagePage, token });


            } else {
                // No packageID, redirect to Clientpage by default
                return res.json({ success: true, redirectTo: '/Clientpage', token });
            }
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ success: false, msg: 'Server error' });
    }
});



// Logout Route
router.post('/logout-client', (req, res) => {
    if (req.session.client) {
        delete req.session.client; // Clear client-specific data
        res.json({ success: true, msg: 'Client logged out successfully' });
    } else {
        res.status(400).json({ success: false, msg: 'No client session to log out' });
    }
});


//Routes for session data of client
router.get('/session-data-client', (req, res) => {
    if (req.session && req.session.client) {
        // If a client session exists, send the client information
        res.status(200).json({
            objectID: req.session.client.objectID, // Include ObjectID in the response
            firstName: req.session.client.firstName,
            middleName: req.session.client.middleName,
            lastName: req.session.client.lastName,
            email: req.session.client.email,
            phoneNumber: req.session.client.phoneNumber,
            birthDate: req.session.client.birthDate,
            address: req.session.client.address,
            status: req.session.client.status,
        });
        console.log('Session data:', req.session.client); // Debugging log
    } else {
        // If no client session exists, log a message and respond with an error
        console.log({ message: 'Not logged in for session' });
        res.status(401).json({ message: 'Not logged in' });
    }
});


//Routes for updating user data/information
router.post('/update-user-data', (req, res) => {
    if (req.session && req.session.client) {
        const {
            firstName,
            middleName,
            lastName,
            email,
            phoneNumber,
            birthDate,
            address,
            newPassword,
        } = req.body;
        console.log("update-user-data")
        // Update session data
        req.session.client = {
            ...req.session.client,
            firstName,
            middleName,
            lastName,
            email,
            phoneNumber,
            birthDate,
            address,
        };

        if (newPassword) {
            // Ensure the new password is different from the old password
            if (req.session.client.password === newPassword) {
                return res.status(400).json({ message: "New password cannot be the same as the current password." });
            }
            req.session.client.password = newPassword; // Update password
        }

        res.status(200).json({ message: "User information updated successfully." });
    } else {
        res.status(401).json({ message: "Not logged in" });
    }
});



/*------------------------------------- Admin Routes ------------------------------------------------*/
// Remove one of the two /create-admin routes to avoid duplication
router.post('/create-admin', async (req, res) => {
    const { name, email, contactNumber, password, selectRole } = req.body;

    try {
        // Check if an admin with the same email already exists
        let admin = await Admin.findOne({ email });
        if (admin) {
            // Send a response indicating that the admin already exists
           console.log('Admin already exists');
        }

        // Create new admin
        admin = new Admin({
            name,
            email,
            contactNumber,
            password,
            selectRole
        });

        await admin.save();

        // Send a success message
        console.log('Admin created successfully');
        console.log('Admin created successfully', admin);


    } catch (error) {
        console.error('Error creating admin:', error);
        console.log('Server error');
    }
});



// Login Route
router.post('/login-admin', async (req, res) => {
    const { email, password } = req.body;
    try {
        let admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).send('User not found');

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).send('Invalid credentials');

        const payload = {
            id: admin.id,
            selectRole: admin.selectRole, // Include the role
        };

        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;

            req.session.admin = {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                selectRole: admin.selectRole,
                contactNumber: admin.contactNumber,
            };

            res.status(200).json({ token });
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send('Server error');
    }
});


router.post('/logout-admin', (req, res) => {
    if (req.session.admin) {
        delete req.session.admin; // Clear admin-specific data
        res.json({ success: true, msg: 'Admin logged out successfully' });
    } else {
        res.status(400).json({ success: false, msg: 'No admin session to log out' });
    }
});



// Route to get name and role for display
router.get('/session-data-admin', (req, res) => {
    
    if (req.session && req.session.admin) {
        res.status(200).json({
            name: req.session.admin.name,
            role: req.session.admin.selectRole,
            email: req.session.admin.email,
            contactNumber: req.session.admin.contactNumber
        });
        console.log({ message: 'Session admin information fetched successfully' });
    } 
        
    else {
      console.log({ message: 'Not logged in' });
    }
}); 


// Route to get name and role for display
router.get('/session-data-admin', (req, res) => {
    if (req.session && req.session.admin) {
        res.status(200).json({
            name: req.session.admin.name,
            role: req.session.admin.selectRole,
            email: req.session.admin.email,
            contactNumber: req.session.admin.contactNumber
        });
    } else {
      console.log({ message: 'Not logged in' });
    }
}); 

//Remove admins in database
router.delete('/remove-admin/:id', async (req, res) => {
    const adminId = req.params.id;

    try {
        const admin = await Admin.findByIdAndDelete(adminId);
        if (!admin) {
            console.log({ message: 'Admin not found' });
        }

        console.log({ message: 'Admin removed successfully' });

    } catch (error) {
        console.error('Error removing admin:', error);
        console.log({ message: 'Server error' });
    }
});


// Get all Admins for ManageAdmin.html table
router.get('/get-admins', async (req, res) => {
    try {
        const admins = await Admin.find({}, 'name email contactNumber selectRole'); // Adjust fields as needed
        res.status(200).json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        console.log({ message: 'Server error' });
    }
});


/*------------------------------- Route for Payment Method email -----------------------------------------*/
// POST endpoint to send email
router.post('/send-email', (req, res) => {
    const { to, subject, body } = req.body;

    // Email options
    const mailOptions = {
        from: 'travellershubtravelandtours03@gmail.com', // Your configured email
        to,
        subject,
        html: body,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Email not sent.' });
        }
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Email sent successfully.' });
    });
});



/*-------------------------------- Route for Edit Profile and change password (ADMIN)-----------------------------------------*/

//Route for edit profile on admin
router.put('/edit-profile', async (req, res) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const { name, email, contactNumber } = req.body;

    try {
        // Ensure the admin exists in the database
        const admin = await Admin.findById(req.session.admin.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Update the admin's profile
        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.contactNumber = contactNumber || admin.contactNumber;

        await admin.save();

        // Update session data
        req.session.admin.name = admin.name;
        req.session.admin.email = admin.email;
        req.session.admin.contactNumber = admin.contactNumber;

        res.status(200).json({ message: 'Profile updated successfully', admin });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


//Route for change password on admin
router.put('/change-password', async (req, res) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        // Retrieve the admin from the database
        const admin = await Admin.findById(req.session.admin.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if the new password matches the current one
        const isSamePassword = await bcrypt.compare(password, admin.password);
        if (isSamePassword) {
            return res.status(400).json({ message: 'New password cannot be the same as the current password' });
        }

        // Hash and update the password
        const hashedPassword = await bcrypt.hash(password, 10);
        admin.password = hashedPassword;

        await admin.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



/*---------------------- Route for User ---------------------*/

// Get all users
router.get('/clients', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
        console.log(users);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching users' });
    }
});


/* ---------------------------------------------- Testimony Routes ----------------------------------------------- */

//Route for submit testimonies
// Submit a testimony
router.post('/submit-testimony', async (req, res) => {
    try {
        // Ensure session data exists
        if (!req.session || !req.session.client) {
            return res.status(401).json({ message: 'User not logged in or session expired.' });
        }

        // Get client full name from session
        const { firstName, middleName, lastName } = req.session.client;
        const fullName = `${firstName} ${middleName || ''} ${lastName}`.trim();

        // Extract description and message from the request body
        const { description, message } = req.body;

        // Create a new testimony with the full name
        const testimony = new Testimony({
            name: fullName,
            description,
            message
        });

        // Save testimony to the database
        await testimony.save();

        console.log({ message: 'Testimony submitted successfully.' });
    } catch (error) {
        console.error('Error submitting testimony:', error);
        res.status(500).json({ message: 'An error occurred while submitting the testimony.' });
    }
});


// Get all pending testimonies
router.get('/get-testimonies', async (req, res) => {
    try {
        const testimonies = await Testimony.find({ status: 'Pending' });
        res.status(200).json(testimonies);
    } catch (error) {
        console.error('Error fetching testimonies:', error);
        res.status(500).json({ message: 'An error occurred while fetching testimonies.' });
    }
});


// Accept testimony
router.patch('/accept-testimony/:id', async (req, res) => {
    try {
        await Testimony.findByIdAndUpdate(req.params.id, { status: 'Accepted' });
        res.status(200).json({ message: 'Testimony accepted.' });
    } catch (error) {
        console.error('Error accepting testimony:', error);
        res.status(500).json({ message: 'An error occurred while accepting testimony.' });
    }
});

// Decline testimony
router.delete('/decline-testimony/:id', async (req, res) => {
    try {
        await Testimony.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Testimony declined.' });
    } catch (error) {
        console.error('Error declining testimony:', error);
        res.status(500).json({ message: 'An error occurred while declining testimony.' });
    }
});

// Fetch all accepted testimonials
router.get('/accepted-testimonials', async (req, res) => {
    try {
        const testimonials = await Testimony.find({ status: 'Accepted' }).sort({ createdAt: -1 });
       console.log(testimonials)
        res.status(200).json(testimonials);
    } catch (error) {
        console.error('Error fetching accepted testimonials:', error);
        res.status(500).json({ message: 'Error fetching testimonials.' });
    }
});


/* ---------------------------------------------- Tour Visa Routes Display Table ----------------------------------------------- */
// Fetch all requirements (filtering Pending and Accepted by default)
router.get('/requirements', async (req, res) => {
    try {
        const { search } = req.query;
        const query = {
            status: { $in: ['Pending', 'Accepted'] }, // Filter Pending and Accepted
            ...(search ? { name: new RegExp(search, 'i') } : {}), // Add search filter if provided
        };

        const requirements = await Requirements.find(query);
        console.log('Fetching requirements for pending and accepted');
        res.json(requirements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Display Archived/Declined Requirements
router.get('/requirements/archive', async (req, res) => {
    try {
        const { search } = req.query;
        const query = {
            status: { $in: ['Archived', 'Declined'] },
            ...(search ? { name: new RegExp(search, 'i') } : {}),
        };

        const archivedRequirements = await Requirements.find(query);
        console.log('Fetching requirements for archived and declined');
        res.json(archivedRequirements);
    } catch (err) {
        console.error('Error fetching archived requirements:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update status (Accept/Decline with email sending)
router.post('/requirements/status', async (req, res) => {
    const { uniqueID, status } = req.body;

    try {
        // Find the requirement by uniqueID
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }

        requirement.status = status;
        await requirement.save();

        // Send email only for "Accepted" and "Declined"
        if (['Accepted', 'Declined'].includes(status)) {
            let subject, text;
            if (status === 'Accepted') {
                subject = 'Visa Requirements Accepted';
                text = `Dear ${requirement.name},\n\nYour visa requirements submission has been accepted. Please wait for further processing.\n\nBest regards,\nTravellers Hub Travel and Tours`;
            } else if (status === 'Declined') {
                subject = 'Visa Requirements Declined';
                text = `Dear ${requirement.name},\n\nWe regret to inform you that your visa requirements submission has been declined. Please review the submission requirements and try again.\n\nBest regards,\nTravellers Hub Travel and Tours`;
            }

            // Send email notification
            await transporter.sendMail({
                from: 'travellershubtravelandtours03@gmail.com',
                to: requirement.email,
                subject,
                text,
            });
        }

        res.json({ message: `Status updated to ${status}` });
    } catch (err) {
        console.error('Error updating status or sending email:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get requirement by uniqueID
router.get('/requirements/:uniqueID', async (req, res) => {
    const { uniqueID } = req.params;

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }

        // Adjust paths for serving files as static assets
        const adjustPath = (file) => {
            if (file && file.path) {
                // Normalize backslashes to forward slashes
                const normalizedPath = file.path.replace(/\\/g, '/');
                return { ...file, path: `uploads/${path.basename(normalizedPath)}` };
            }
            return null;
        };

        requirement.passportFile = adjustPath(requirement.passportFile);
        requirement.visaApplicationFile = adjustPath(requirement.visaApplicationFile);
        requirement.photoFile = adjustPath(requirement.photoFile);
        requirement.birthCertificateFile = adjustPath(requirement.birthCertificateFile);
        requirement.marriageCertificateFile = adjustPath(requirement.marriageCertificateFile);
        requirement.itineraryJapan = adjustPath(requirement.itineraryJapan);
        requirement.personalBankCertificateFile = adjustPath(requirement.personalBankCertificateFile);
        requirement.taxPaymentCertificateFile = adjustPath(requirement.taxPaymentCertificateFile);
        requirement.employmentCertificateFile = adjustPath(requirement.employmentCertificateFile);

        res.json(requirement);

        console.log('Fetching requirement:', requirement);
    } catch (err) {
        console.error('Error fetching requirement:', err);
        res.status(500).json({ error: err.message });
    }
});




// Archive a requirement
router.post('/requirements/archive', async (req, res) => {
    const { uniqueID } = req.body; // uniqueID as unique identifier

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }

        // Move to archive collection
        const archivedDoc = new RequirementsArchive(requirement.toObject());
        await archivedDoc.save();

        // Remove from active collection
        await requirement.remove();

        res.json({ message: 'Requirement archived successfully' });
    } catch (err) {
        console.error('Error archiving requirement:', err);
        res.status(500).json({ error: err.message });
    }
});

// Decline a requirement
router.post('/requirements/decline', async (req, res) => {
    const { uniqueID } = req.body;

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }

        requirement.status = 'Declined';

        // Move to archive collection
        const archivedDoc = new RequirementsArchive(requirement.toObject());
        await archivedDoc.save();

        // Remove from active collection
        await requirement.remove();

        res.json({ message: 'Requirement declined and archived successfully' });
    } catch (err) {
        console.error('Error declining requirement:', err);
        res.status(500).json({ error: err.message });
    }
});

//Sending Original Documents
router.post('/requirements/send-document', async (req, res) => {
    const { uniqueID } = req.body;

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

        // Update field
        requirement.sendOriginalDocuments = true;
        await requirement.save();

        // Send email
        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: requirement.email,
            subject: 'Send Original Documents',
            text: `Dear ${requirement.name},\n\nYou may now send your original documents to the Travellers Hub Travel and Tours Office.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Send Document email sent' });
        console.log('Send Document email sent to', requirement.email);

    } catch (err) {
        console.error('Error in sending document email:', err);
        res.status(500).json({ error: err.message });
    }
});


// Document Submitted
router.post('/requirements/document-submitted', async (req, res) => {
    const { uniqueID } = req.body;

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

        // Update field
        requirement.documentSubmitted = true;
        await requirement.save();

        // Send email
        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: requirement.email,
            subject: 'Document Submitted to Embassy',
            text: `Dear ${requirement.name},\n\nYour documents have been submitted to the embassy. Please wait for further updates via email.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Document Submitted email sent' });
        console.log('Document Submitted email sent to', requirement.email);

    } catch (err) {
        console.error('Error in submitting document email:', err);
        res.status(500).json({ error: err.message });
    }
});



// Passport Received
router.post('/requirements/passport-received', async (req, res) => {
    const { uniqueID } = req.body;

    try {
        const requirement = await Requirements.findOne({ uniqueID });
        if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

        // Update field
        requirement.passportRecieved = true;
        await requirement.save();

        // Send email
        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: requirement.email,
            subject: 'Passport Received',
            text: `Dear ${requirement.name},\n\nYour passport has been received and is ready for pickup at the Travellers Hub Travel and Tours office, or it can be delivered to your address.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Passport Received email sent'});
        console.log('Passport Received email sent to', requirement.email);
    } catch (err) {
        console.error('Error in receiving passport email:', err);
        res.status(500).json({ error: err.message });
    }
});




/* ---------------------------------------------- Package Routes for Homepage ----------------------------------------------- */
// Initialize packages in session (when the server starts or is called)
router.get('/packages/initialize', async (req, res) => {
    try {
        const packages = await PackageContent.find({}, 'packageId packageName description price coverImage');
        req.session.packages = packages; // Save to session
        console.log('Packages loaded into session:', packages);

        res.status(200).json({ message: 'Packages initialized in session', packages });
    } catch (error) {
        console.error('Error initializing packages:', error.message);
        res.status(500).json({ message: 'Error initializing packages' });
    }
});

// Fetch all packages from session
router.get('/packages', (req, res) => {
    if (req.session.packages) {
        res.status(200).json(req.session.packages);
    } else {
        res.status(404).json({ message: 'No packages available in session' });
    }
});


// Save clicked package name to session// Save clicked package ID to session
router.post('/packages/session', (req, res) => {
    const { packageId } = req.body;
    if (!packageId) {
        return res.status(400).json({ message: 'Package ID is required' });
    }

    req.session.selectedPackage = packageId;
    console.log(`Saved package ID to session: ${packageId}`);
    res.status(200).json({ message: 'Package ID saved to session' });
});


// Fetch a specific package by ID
router.get('/packages/:id', async (req, res) => {
    const packageId = req.params.id;
    try {
        const packageDetails = req.session.packages?.find(pkg => pkg.packageId === packageId);
        if (packageDetails) {
            res.status(200).json(packageDetails);

            console.log('Package Details Sent:', packageDetails);

        } else {
            const packageDetailsFromDb = await PackageContent.findOne(
                { packageId },
                'packageId packageName description price coverImage'
            );
            if (packageDetailsFromDb) {
                res.status(200).json(packageDetailsFromDb);
            } else {
                res.status(404).json({ message: `Package with ID ${packageId} not found.` });
            }
        }
    } catch (error) {
        console.error(`Error fetching package with ID ${packageId}:`, error.message);
        res.status(500).json({ message: 'Server error' });
    }
});


/*-------------------- Dashboard Stats ---------------------*/
router.get('/dashboard-stats', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const packageCount = await GroupTour.countDocuments();
        const visaCount = await Requirements.countDocuments(); // Count visas
        const testimonialCount = await Testimony.countDocuments({ status: 'Accepted' });

        res.status(200).json({
            users: userCount,
            packages: packageCount,
            visas: visaCount, // Include visa count
            testimonials: testimonialCount,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Chart data
router.get('/chart-data', async (req, res) => {
    try {
        const packageData = await getMonthlyData(GroupTour, 'submittedAt'); // GroupTour data by submittedAt
        const visaData = await getMonthlyData(Requirements, 'submittedAt'); // Requirements data by submittedAt

        res.status(200).json({
            packages: packageData, // Monthly package submissions
            visas: visaData, // Monthly visa submissions
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Helper function to calculate monthly data
async function getMonthlyData(model, dateField) {
    const monthlyData = await model.aggregate([
        {
            $group: {
                _id: { $month: `$${dateField}` },
                count: { $sum: 1 },
            },
        },
    ]);

    const result = Array(12).fill(0);
    monthlyData.forEach((data) => {
        result[data._id - 1] = data.count; // Map month to index (0-11)
    });

    return result;
}


/* ---------------------------------------   Package Content Routes (including CMS)  -----------------------------------  */
// POST route to store package content

//app.use(multer().fields([{ name: 'coverImage' }, { name: 'flyer' }]));
router.post(
    '/package-content-store',
    upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'flyer', maxCount: 1 }]),
    async (req, res) => {
      try {
        console.log('Files received:', req.files);
  
        // Validate files
        const coverImageFile = req.files?.coverImage?.[0];
        const flyerFile = req.files?.flyer?.[0];
  
        if (!coverImageFile || !flyerFile) {
          return res.status(400).json({ message: 'Cover image and flyer are required' });
        }
  
        // Log paths for debugging
        console.log(`Cover Image Path: ${coverImageFile.path}`);
        console.log(`Flyer Path: ${flyerFile.path}`);
  
        // Prepare the data for saving
        const packageData = {
          ...req.body,
          coverImage: {
            filename: coverImageFile.filename,
            path: coverImageFile.path,
            mimetype: coverImageFile.mimetype,
            size: coverImageFile.size,
          },
          flyer: {
            filename: flyerFile.filename,
            path: flyerFile.path,
            mimetype: flyerFile.mimetype,
            size: flyerFile.size,
          },
        };
  
        // Update existing document or create a new one
        const result = await PackageContent.findOneAndUpdate(
          { packageId: req.body.packageId }, // Query to find by packageId
          packageData, // New data to set
          { upsert: true, new: true } // Options: create if not exists, return updated document
        );
  
        res.status(200).json({ message: 'Package content saved successfully!', data: result });
      } catch (error) {
        console.error('Error saving package content:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
      }
    }
  );
  


//Fetching package content for display
router.get('/package-content', async (req, res) => {
    const { packageId } = req.query;

    if (!packageId) {
        return res.status(400).json({ message: 'Package ID is required' });
    }

    try {
        const packageContent = await PackageContent.findOne({ packageId });
        if (!packageContent) {
            return res.status(404).json({ message: 'Package not found' });
        }

        // Ensure paths use forward slashes
        if (packageContent.coverImage && packageContent.coverImage.path) {
            packageContent.coverImage.path = packageContent.coverImage.path.replace(/\\/g, '/');
        }
        if (packageContent.flyer && packageContent.flyer.path) {
            packageContent.flyer.path = packageContent.flyer.path.replace(/\\/g, '/');
        }

        console.log('Fetched package content for display:', packageContent);

        res.status(200).json(packageContent);
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



//Package Session save
router.post('/package-session-save', (req, res) => {
    const { packageName } = req.body;
    console.log('Session saved package name: ', packageName);

    if (!packageName) {
        return res.status(400).json({ message: 'Package name is required' });
    }

    req.session.packageName = packageName;
    console.log(`Package session saved: ${packageName}`);
    res.status(200).json({ message: 'Package name saved to session' });
});



//Fetch specific package contents based on fixed package IDs
router.get('/package-content-list', async (req, res) => {
    try {
        const packageIds = ['package_1', 'package_2', 'package_3', 'package_4'];

        // Fetch packages with the specified IDs and include all necessary fields
        const packages = await PackageContent.find(
            { packageId: { $in: packageIds } },
            { packageName: 1, description: 1, packageId: 1, coverImage: 1 } // Include coverImage field
        ).sort({ packageId: 1 }); // Sort in order of packageId

        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found.' });
        }

        // Ensure paths use forward slashes for coverImage
        packages.forEach(pkg => {
            if (pkg.coverImage?.path) {
                pkg.coverImage.path = pkg.coverImage.path.replace(/\\/g, '/');
            }
        });

        console.log('Fetched packages:', packages); // Debug log
        res.status(200).json(packages);
    } catch (error) {
        console.error('Error fetching package list:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});



/*-------------------------------------    Package Booking Routes Table Display    -------------------------------------*/
// Fetch tours with "Pending" or "Accepted" statuses
router.get('/groupTours', async (req, res) => {
    try {
        const tours = await GroupTour.find({ status: { $in: ['Pending', 'Accepted'] } });
        res.json(tours);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tours' });
    }
});

// Update status and send email notification using clientID
router.put('/groupTours/status', async (req, res) => {
    const { clientID, status } = req.body;

    try {
        const tour = await GroupTour.findOne({ clientID });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        if (['Accepted', 'Declined', 'Archived'].includes(status)) {
            tour.status = status;
            await tour.save();

            let subject, text;

            if (status === 'Accepted') {
                subject = 'Booking Request Accepted';
                text = `Dear ${tour.leadName},\n\nYour booking request has been accepted. Please wait for further processing.\n\nBest regards,\nTravellers Hub Travel and Tours`;
            } else if (status === 'Declined') {
                subject = 'Booking Request Declined';
                text = `Dear ${tour.leadName},\n\nWe regret to inform you that your booking request has been declined. Please review the submission requirements and try again.\n\nBest regards,\nTravellers Hub Travel and Tours`;
            }

            if (['Accepted', 'Declined'].includes(status)) {
                await transporter.sendMail({
                    from: 'travellershubtravelandtours03@gmail.com',
                    to: tour.email,
                    subject,
                    text,
                });
            }

            res.json({ message: `Status updated to ${status}` });
            console.log('Status updated to ', status, ' and email notification sent to ', tour.email);
        } else {
            res.status(400).json({ error: 'Invalid status' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});


// Fetch a single tour by clientID
router.get('/groupTours/details', async (req, res) => {
    const { clientID } = req.query;

    try {
        const tour = await GroupTour.findOne({ clientID }).populate('additionalTravellers');
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        // Normalize paths for the main traveler files
        const adjustPath = (file) => {
            if (file && file.path) {
                // Normalize backslashes to forward slashes
                const normalizedPath = file.path.replace(/\\/g, '/');
                return { ...file, path: `/uploads/${path.basename(normalizedPath)}` };
            }
            return null;
        };

        tour.paymentReceipt = adjustPath(tour.paymentReceipt);
        tour.passportID = adjustPath(tour.passportID);
        tour.visaID = adjustPath(tour.visaID);
        tour.validID = adjustPath(tour.validID);
        tour.birthCertificate = adjustPath(tour.birthCertificate);
        tour.picture = adjustPath(tour.picture);

        // Normalize paths for additional travelers
        if (tour.additionalTravellers?.length) {
            tour.additionalTravellers = tour.additionalTravellers.map((traveler) => {
                return {
                    ...traveler,
                    passportID: adjustPath(traveler.passportID),
                    visaID: adjustPath(traveler.visaID),
                    validID: adjustPath(traveler.validID),
                    birthCertificate: adjustPath(traveler.birthCertificate),
                    picture: adjustPath(traveler.picture),
                };
            });
        }

        res.json(tour);

        console.log('Fetched tour details:', tour);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tour' });
    }
});



// Fetch all data with statuses Declined and Archived
router.get('/groupTours/archive', async (req, res) => {
    try {
        const tours = await GroupTour.find({ status: { $in: ['Declined', 'Archived'] } });
        res.json(tours);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch archived tours' });
    }
});


// Send document notification
router.put('/groupTours/send-document', async (req, res) => {
    const { clientID } = req.body;

    try {
        const tour = await GroupTour.findOne({ clientID });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        tour.sendOriginalDocuments = true;
        await tour.save();

        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: tour.email,
            subject: 'Send Original Documents',
            text: `Dear ${tour.leadName},\n\nPlease send your original documents for further processing.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Document submission email sent' });
        console.log('Document submission email sent to ', tour.email);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email for sending original documents' });
    }
});

// Document submitted notification
router.put('/groupTours/document-submitted', async (req, res) => {
    const { clientID } = req.body;

    try {
        const tour = await GroupTour.findOne({ clientID });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        tour.documentSubmitted = true;
        await tour.save();

        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: tour.email,
            subject: 'Document Submitted to Embassy',
            text: `Dear ${tour.leadName},\n\nYour documents have been submitted to the embassy. Please wait for further updates.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Documment Submitted email sent' });
        console.log('Documment Submitted email sent to ', tour.email);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email for document submission' });
    }
});

// Passport received notification
router.put('/groupTours/passport-received', async (req, res) => {
    const { clientID } = req.body;

    try {
        const tour = await GroupTour.findOne({ clientID });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        tour.passportRecieved = true;
        await tour.save();

        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: tour.email,
            subject: 'Passport Ready for Pickup',
            text: `Dear ${tour.leadName},\n\nYour passport is ready for pickup. Please visit our office to collect it.\n\nBest regards,\nTravellers Hub Travel and Tours`,
        });

        res.json({ message: 'Passport Recieved email sent' });
        console.log('Passport Recieved email sent to', requirement.email);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email for passport readiness' });
    }
});

// Update paymentAcknowledged field and send email notification
router.put('/groupTours/payment-acknowledged', async (req, res) => {
    const { clientID } = req.body;

    try {
        const tour = await GroupTour.findOne({ clientID });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });

        tour.paymentAcknowledged = true;
        await tour.save();

        // Send email notification
        const subject = 'Payment Receipt Acknowledged';
        const text = `Dear ${tour.leadName},\n\nYour payment receipt has been fully acknowledged and your booking process is now complete.\n\nBest regards,\nTravellers Hub Travel and Tours`;

        await transporter.sendMail({
            from: 'travellershubtravelandtours03@gmail.com',
            to: tour.email,
            subject,
            text,
        });

        res.json({ message: 'Payment acknowledged email sent.' });
        console.log('Payment acknowledged email sent to', requirement.email);

    } catch (error) {
        res.status(500).json({ error: 'Failed to acknowledge payment' });
    }
});


module.exports = router;