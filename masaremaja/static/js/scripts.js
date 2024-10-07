$(document).ready(function() {
    // Functionality for handling the delete modal
    $('#deleteModal').on('show.bs.modal', function(event) {
        var button = event.relatedTarget;  // Button that triggered the modal
        var userId = button.getAttribute('data-userid');  // Extract user ID
        var username = button.getAttribute('data-username');  // Extract username

        var userToDelete = document.getElementById('userToDelete');  
        userToDelete.textContent = username;  

        var form = document.getElementById('deleteForm');
        form.action = "/users/" + userId + "/delete/";
    });

    // Automatically close alert messages after 3 seconds
    const alertElement = $('.alert');
    if (alertElement.length) {
        setTimeout(() => {
            alertElement.alert('close'); // Bootstrap method to close alert
        }, 3000); // The alert will fade away after 3 seconds
    }

    // Initialize DataTables
    var table = $('#userTable').DataTable({
        "paging": true,
        "searching": true,
        "ordering": true,
        "info": true,
        "lengthChange": true,
        "pageLength": 10
    });

    // === Card View Filtering, Searching, and Sorting Functions === //

    // Search function for card view
    function searchCardView() {
        let searchInput = $('#searchUser').val().toLowerCase().trim();
        let users = $('.user-card');

        users.each(function() {
            let username = $(this).data('username').toLowerCase();
            let name = $(this).data('name').toLowerCase();

            let matchesSearch = searchInput === '' || username.includes(searchInput) || name.includes(searchInput);
            $(this).toggle(matchesSearch);  // Show or hide the card based on search
        });
    }

    // Role filtering function for card view
    function filterCardByRole() {
        let selectedRole = $('#roleFilter').val();
        let users = $('.user-card');

        users.each(function() {
            let role = $(this).data('role');
            let matchesRole = selectedRole === '' || role === selectedRole;
            $(this).toggle(matchesRole);  // Show or hide the card based on role
        });
    }

    // Sorting function for card view
    function sortCardView() {
        let sortOrder = $('#sortByName').val();
        let users = $('.user-card:visible').sort(function(a, b) {
            let nameA = $(a).data('name').toLowerCase();
            let nameB = $(b).data('name').toLowerCase();

            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        $('#cardView').html(users);  // Update the card view with sorted users
    }

    // === Table View Filtering and Sorting Functions === //

    // Search function for table view (via DataTables)
    function searchTableView() {
        let searchInput = $('#searchUser').val().toLowerCase();
        table.search(searchInput).draw();  // Apply search in DataTable
    }

    // Role filtering function for table view
    function filterTableByRole() {
        let selectedRole = $('#roleFilter').val();
        table.column(5).search(selectedRole).draw();  // Column 5 is the role column
    }

    // === Event Listeners for Search, Role Filtering, and Sorting === //

    // Search input event listener
    $('#searchUser').on('input', function() {
        searchCardView();  // Apply search to the card view
        searchTableView();  // Apply search to the table view
    });

    // Role filter change event listener
    $('#roleFilter').on('change', function() {
        filterCardByRole();  // Apply role filter to the card view
        filterTableByRole();  // Apply role filter to the table view
    });

    // Sort by name change event listener
    $('#sortByName').on('change', function() {
        sortCardView();  // Apply sorting to the card view only
    });

    // Save the user's view preference to local storage
    function saveViewPreference(view) {
        localStorage.setItem('viewPreference', view);
    }

    // Load the user's view preference from local storage
    function loadViewPreference() {
        return localStorage.getItem('viewPreference') || 'card'; // Default to 'card' view if none is set
    }

    // Apply the saved view preference on page load
    let savedView = loadViewPreference();

    if (savedView === 'table') {
        $('#tableView').removeClass('d-none');
        $('#cardView').addClass('d-none');
    } else {
        $('#cardView').removeClass('d-none');
        $('#tableView').addClass('d-none');
    }

    // Toggle between card view and table view
    $('#cardViewButton').on('click', function() {
        $('#cardView').removeClass('d-none');
        $('#tableView').addClass('d-none');
        saveViewPreference('card');
    });

    $('#tableViewButton').on('click', function() {
        $('#tableView').removeClass('d-none');
        $('#cardView').addClass('d-none');
        saveViewPreference('table');
    });

    // Password visibility toggle
    function togglePasswordVisibility(passwordFieldId, toggleButtonId) {
        $(toggleButtonId).on('click', function() {
            let passwordField = $(passwordFieldId);
            let type = passwordField.attr('type') === 'password' ? 'text' : 'password';
            passwordField.attr('type', type);
            $(this).toggleClass('fa-eye fa-eye-slash');
        });
    }

    // Call the function for password fields
    togglePasswordVisibility('#id_old_password', '#toggleOldPassword');
    togglePasswordVisibility('#id_password1', '#togglePassword1');
    togglePasswordVisibility('#id_password2', '#togglePassword2');

    
    // Password validation
    $('#passwordForm').on('submit', function(e) {
        let password1 = $('#id_password1').val();
        let password2 = $('#id_password2').val();
        let isValid = true;

        // Reset previous errors
        $('#id_password1').removeClass('is-invalid');
        $('#id_password2').removeClass('is-invalid');
        $('#password2Error').hide();

        // Validate password length (Client-side)
        if (password1.length < 8) {
            $('#id_password1').addClass('is-invalid');
            $('#password1Error').show();
            isValid = false;
        }

        // Validate that passwords match (Client-side)
        if (password1 !== password2) {
            $('#id_password2').addClass('is-invalid');
            $('#password2Error').show();
            isValid = false;
        }

        // Validate that password is not entirely numeric (Client-side)
        if (/^\d+$/.test(password1)) {
            $('#id_password1').addClass('is-invalid');
            $('#passwordNumericError').show();
            isValid = false;
        }

        // Prevent form submission if client-side validation fails
        if (!isValid) {
            e.preventDefault();
        }
    });

    // Automatically hide invalid feedback when typing
    $('#id_password1, #id_password2').on('input', function() {
        $(this).removeClass('is-invalid');
        $('#password2Error').hide();
    });

    // Logout confirmation logic
    $('#logoutLink').on('click', function(event) {
        var confirmation = confirm("Are you sure you want to log out?");
        if (!confirmation) {
            event.preventDefault();  // Stop the logout request
        }
    });

});
