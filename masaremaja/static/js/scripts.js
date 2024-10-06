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

    // Role filter for DataTable
    $('#roleFilter').on('change', function() {
        var selectedRole = $(this).val();
        table.column(4).search(selectedRole).draw(); // Column index starts from 0
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

    
    // Client-side password validation
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

    // Toggle between card view and table view
    $('#cardViewButton').on('click', function() {
        $('#cardView').removeClass('d-none');
        $('#tableView').addClass('d-none');
    });

    $('#tableViewButton').on('click', function() {
        $('#tableView').removeClass('d-none');
        $('#cardView').addClass('d-none');
    });

    // Filter and search function
    function filterUsers() {
        let searchInput = $('#searchUser').val().toLowerCase();
        let selectedRole = $('#roleFilter').val();
        let sortOrder = $('#sortByName').val();

        let users = $('.user-card');

        // Filter by role and search query
        users.each(function() {
            let username = $(this).data('username').toLowerCase();
            let name = $(this).data('name').toLowerCase();
            let role = $(this).data('role');

            let matchesSearch = username.includes(searchInput) || name.includes(searchInput);
            let matchesRole = selectedRole === '' || role === selectedRole;

            if (matchesSearch && matchesRole) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        // Sort the visible users
        let sortedUsers = users.filter(':visible').sort(function(a, b) {
            let nameA = $(a).data('name').toLowerCase();
            let nameB = $(b).data('name').toLowerCase();

            if (sortOrder === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });

        $('#userCards').html(sortedUsers);
    }

    // Event listeners for search, filter, and sort
    $('#searchUser, #roleFilter, #sortByName').on('input change', filterUsers);

});
