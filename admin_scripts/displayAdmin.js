$(document).ready(function () {
    // Fetch session data to display name and role
    $.ajax({
        url: '/api/auth/session-data-admin', // Update with your server's route
        type: 'GET',
        success: function (data) {
            // Populate the spans with name and role from session data
            $('#adminDisplay').text(data.name);
            $('#roleDisplay').text(data.role);
        },
        error: function () {
            // Redirect to login if session is invalid
            window.location.href = 'AdminLogin.html';
        }
    });

    // Logout functionality
    $('#Logout').click(function (e) {
        e.preventDefault(); // Prevent default link behavior (scroll to top)
        $.ajax({
            url: '/api/auth/logout-admin', // Server-side logout route
            type: 'POST',
            success: function () {

                console.log('Successfully logged out');

                // Redirect to login page after successful logout
                window.location.href = '/Adminlogin';             
            },
            error: function () {
                alert('Logout failed. Please try again.');
            }
        });
    });
});
