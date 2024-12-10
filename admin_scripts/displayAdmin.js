$(document).ready(function() {
    // Fetch session data to display name and role
    $.ajax({
        url: '/api/auth/session-data-admin', // Update with your server's route
        type: 'GET',
        success: function(data) {
            // Populate the spans with name and role from session data
            $('#adminDisplay').text(data.name);
            $('#roleDisplay').text(data.role);
        },
    });
});