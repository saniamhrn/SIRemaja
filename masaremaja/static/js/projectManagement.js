let currentProjectId;
let currentTaskId;
let updatedProjectData = {};
let updatedTaskData = {};

$(document).ready(function() {
    $('.project-data-table').each(function() {
        const tableId = $(this).attr('id');
        
        if (tableId === 'projectTable') {
            // Destroy any previous initialization to prevent duplicates
            if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
                $(`#${tableId}`).DataTable().destroy();
            }
            
            // Initialize DataTable with proper settings
            $(`#${tableId}`).DataTable({
                "paging": true,
                "searching": true,
                "ordering": true,
                "info": true,
                "lengthChange": true,
                "pageLength": 10,
                "autoWidth": false
            });
        }
    });
});

// === Table View Filtering and Sorting Functions === //

// Search function for table view (via DataTables)
function searchTableView() {
    let searchInput = $('#searchProject').val().toLowerCase();
    table.search(searchInput).draw();  // Apply search in DataTable
}

// Role filtering function for table view
function filterTableByRole() {
    let selectedRole = $('#roleFilter').val();
    table.column(5).search(selectedRole).draw();  // Column 5 is the role column
}

// === Event Listeners for Search, Role Filtering, and Sorting === //

// Search input event listener
$('#searchProject').on('input', function() {
    searchCardView();  // Apply search to the card view
    searchTableView();  // Apply search to the table view
});

// Role filter change event listener
$('#sortbyNameProjects').on('change', function() {
    filterCardByRole();  // Apply role filter to the card view
    filterTableByRole();  // Apply role filter to the table view
});

// Sort by name change event listener
$('#sortByDueDate').on('change', function() {
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










// Define the Modal IDs dynamically based on the page
const projectDetailModalId = document.getElementById('projectDetailModalKanban') 
    ? 'projectDetailModalKanban' 
    : 'projectDetailModalList';

const taskDetailModalId = document.getElementById('taskDetailModalKanban') 
    ? 'taskDetailModalKanban' 
    : 'taskDetailModalList';    

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function submitProjectForm() {
    const name = document.getElementById('project-name').value;
    const description = document.getElementById('project-description').value;
    const status = document.getElementById('project-status').value;
    const client = document.getElementById('project-client-id').value;
    const project_manager = document.getElementById('project-manager-id').value;
    const dueDate = document.getElementById('project-due-date').value;

    const today = new Date().toISOString().split('T')[0];
    if (dueDate <= today) {
        alert('Due date must be greater than today\'s date');
        return;
    }

    if (!name || !description || !status || !client || !project_manager || !dueDate) {
        alert('All fields must be filled out');
        return;
    }

    const projectData = {
        name: name,
        description: description,
        status: status,
        client: client,
        project_manager: project_manager,
        due_date: dueDate
    };

    const csrftoken = getCookie('csrftoken');

    fetch('/project/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify(projectData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Project added:', data);

        const myModal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
        myModal.hide();

        window.location.reload();

    })
    .catch(error => console.error('Error adding project:', error));
}

function deleteProject(projectId, row) {
    const csrftoken = getCookie('csrftoken');
    if (confirm('Are you sure you want to delete this project?')) {
        fetch(`/project/delete/${projectId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrftoken
            }
        })
        .then(response => {
            if (response.ok) {
                console.log('Project deleted');
                row.remove();
            } else {
                console.error('Error deleting project');
            }
        })
        .catch(error => console.error('Error deleting project:', error));
    }
}

function showProjectDetail(projectId) {
    currentProjectId = projectId;
    fetch(`/project/detail/${projectId}/`)
        .then(response => response.json())
        .then(project => {
            // Close the task detail modal if it's open
            const taskDetailModalInstance = bootstrap.Modal.getInstance(document.getElementById(taskDetailModalId));
            if (taskDetailModalInstance) {
                taskDetailModalInstance.hide();
            }

            // Update fields in the project detail modal with dynamic IDs
            document.getElementById(`${projectDetailModalId}-name`).innerHTML = project.name;
            document.getElementById(`${projectDetailModalId}-description`).innerHTML = `<span>${project.description}</span>`;
            document.getElementById(`${projectDetailModalId}-status`).textContent = project.status || 'No Status';
            document.getElementById(`${projectDetailModalId}-client`).textContent = project.client_name || 'N/A';
            document.getElementById(`${projectDetailModalId}-project_manager`).textContent = project.pm_name || 'N/A';

            // Format Due Date
            if (project.due_date) {
                const dueDate = new Date(project.due_date);
                const formattedDate = dueDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById(`${projectDetailModalId}-due_date`).textContent = formattedDate;
            } else {
                document.getElementById(`${projectDetailModalId}-due_date`).textContent = 'No Due Date';
            }

            // Format Created At
            if (project.created_at) {
                const createdAt = new Date(project.created_at);
                const formattedCreatedAt = createdAt.toLocaleString('default', {
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true  // AM/PM format
                });
                document.getElementById(`${projectDetailModalId}-created_at`).textContent = formattedCreatedAt;
            }

            // Format Updated At
            if (project.updated_at) {
                const updatedAt = new Date(project.updated_at);
                const formattedUpdatedAt = updatedAt.toLocaleString('default', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true  // AM/PM format
                });
                document.getElementById(`${projectDetailModalId}-updated_at`).textContent = formattedUpdatedAt;
            }

            // Load tasks and calculate progress
            loadProjectTasks(project.tasks);

            // Show the modal
            const detailModal = new bootstrap.Modal(document.getElementById(projectDetailModalId));
            detailModal.show();
        })
        .catch(error => console.error('Error fetching project details:', error));
}

function loadProjectTasks(tasks) {
    const taskList = document.getElementById(`${projectDetailModalId}-task-list`);
    taskList.innerHTML = '';  // Clear previous tasks

    let completedTasks = 0;

    tasks.forEach(task => {
        // Count completed tasks for progress calculation
        if (task.status === 'Done') completedTasks++;

        // Create each task item as a list item
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'p-2');

        taskItem.innerHTML = `
            <div>
                <span class="task-title" onclick="showTaskDetail(${task.id})" style="font-weight: bold;">${task.title}</span>
            </div>
            <div class="task-actions">
                <span id="${projectDetailModalId}-task-assigned_to-${task.id}" class="task-assigned_to" onclick="editDropdown(this, 'assigned_to', ${task.id}, creativeList, true)">
                    ${task.creative_name || 'Unassigned'}
                </span>
                <span id="${projectDetailModalId}-task-status-${task.id}" class="task-status" onclick="editStatus(this, 'status', ${task.id}, true)" style="font-size: 0.8rem;">
                    ${task.status}
                </span>
            </div>
        `;
        taskList.appendChild(taskItem);
    });

    // Calculate and update progress bar
    const progressPercent = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
    const progressBar = document.getElementById(`${projectDetailModalId}-progress-bar`);
    progressBar.style.width = `${progressPercent}%`;
    progressBar.setAttribute('aria-valuenow', progressPercent);
    progressBar.textContent = `${Math.round(progressPercent)}% Done`;
}

function showCreateTaskModal(projectId = null, status = null) {
    const statusText = document.getElementById('task-status-text');
    const statusSelect = document.getElementById('task-status-select');

    if (status) {
        // Display status as text and hide dropdown for Kanban board
        statusText.textContent = status;
        statusText.style.display = 'block';
        statusSelect.style.display = 'none';
    } else {
        // Show dropdown for project list page and hide text
        statusText.style.display = 'none';
        statusSelect.style.display = 'block';
    }

    // Close projectDetailModal if it is open
    const detailModalInstance = bootstrap.Modal.getInstance(document.getElementById(projectDetailModalId));
    if (detailModalInstance) {
        detailModalInstance.hide();
    }

    document.getElementById('task-project-id').value = projectId || '';
    document.getElementById('addTaskModalLabel').textContent = 'Add New Task';
    document.getElementById('submit-task-btn').textContent = 'Add Task';
    document.getElementById('submit-task-btn').onclick = function() {
        submitTaskForm(projectId, null, status || statusSelect.value); // Pass projectId to submitTaskForm
    };

    clearTaskForm();  // Clear form before opening for a new task
    const taskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));
    taskModal.show();
}

// Function to show the Edit Task modal with pre-filled data
function showEditTaskModal(taskId) {
    fetch(`/project/task/${taskId}/`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('task-id').value = taskId;
            document.getElementById('task-project-id').value = data.project;
            document.getElementById('task-title').value = data.title;
            document.getElementById('task-description').value = data.description;
            document.getElementById('task-status').value = data.status;
            document.getElementById('task-creative-id').value = data.assigned_to;

            // Convert due_date to YYYY-MM-DD format
            const isoDate = new Date(data.due_date);
            const formattedDate = isoDate.toISOString().split('T')[0];  // Extract YYYY-MM-DD
            document.getElementById('task-due-date').value = formattedDate;

            document.getElementById('addTaskModalLabel').textContent = 'Edit Task';
            document.getElementById('submit-task-btn').textContent = 'Update Task';
            document.getElementById('submit-task-btn').onclick = function() {
                submitTaskForm(data.project, taskId);
            };

            var taskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));
            taskModal.show();
        })
        .catch(error => console.error('Error fetching task data:', error));
}

function showTaskDetail(taskId) {
    currentTaskId = taskId;

    // Close the project detail modal if it's open
    const projectDetailModalInstance = bootstrap.Modal.getInstance(document.getElementById(projectDetailModalId));
    if (projectDetailModalInstance) {
        projectDetailModalInstance.hide();
    }

    fetch(`/project/task/${taskId}/`)
        .then(response => response.json())
        .then(data => {
            const projectName = data.project_name || 'Unknown Project';
            const projectId = data.project;

            // Populate modal fields with task data
            document.getElementById(`${taskDetailModalId}-title`).innerHTML = `
                <a href="javascript:void(0);" onclick="showProjectDetail(${projectId})" class="project-name-link">${projectName}</a> / 
                <span ondblclick="editField(this, 'title', ${taskId}, true)">${data.title}</span>
            `;
            document.getElementById(`${taskDetailModalId}-description`).innerHTML = `<span>${data.description}</span>`;
            document.getElementById(`${taskDetailModalId}-status`).textContent = data.status || 'No Status';
            document.getElementById(`${taskDetailModalId}-assigned_to`).textContent = data.creative_name || 'Unassigned';

            // Format Due Date
            if (data.due_date) {
                const dueDate = new Date(data.due_date);
                const formattedDueDate = dueDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById(`${taskDetailModalId}-due_date`).textContent = formattedDueDate;
            } else {
                document.getElementById(`${taskDetailModalId}-due_date`).textContent = 'No Due Date';
            }

            // Display Start Date if available
            if (data.start_date) {
                const startDate = new Date(data.start_date);
                const formattedStartDate = startDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById(`${taskDetailModalId}-start_date`).textContent = formattedStartDate;
            } else {
                document.getElementById(`${taskDetailModalId}-start_date`).textContent = 'Not Started';
            }

            // Display Completion Date if available
            if (data.completion_date) {
                const completionDate = new Date(data.completion_date);
                const formattedCompletionDate = completionDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById(`${taskDetailModalId}-completion_date`).textContent = formattedCompletionDate;
            } else {
                document.getElementById(`${taskDetailModalId}-completion_date`).textContent = 'Not Completed';
            }

            // Format Created At
            if (data.created_at) {
                const createdAt = new Date(data.created_at);
                const formattedCreatedAt = createdAt.toLocaleString('default', {
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true  // AM/PM format
                });
                document.getElementById(`${taskDetailModalId}-created_at`).textContent = formattedCreatedAt;
            }

            // Format Updated At
            if (data.updated_at) {
                const updatedAt = new Date(data.updated_at);
                const formattedUpdatedAt = updatedAt.toLocaleString('default', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true  // AM/PM format
                });
                document.getElementById(`${taskDetailModalId}-updated_at`).textContent = formattedUpdatedAt;
            }

            // Show the modal
            const taskDetailModal = new bootstrap.Modal(document.getElementById(taskDetailModalId));
            taskDetailModal.show();
        })
        .catch(error => console.error('Error fetching task data:', error));
}

function submitTaskForm(projectId, taskId = null, status = null) {
    // const projectId = document.getElementById('task-project-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const selectedStatus = status || document.getElementById('task-status-select').value;
    const creative = document.getElementById('task-creative-id').value;
    const dueDate = document.getElementById('task-due-date').value;

    const csrftoken = getCookie('csrftoken');

    const today = new Date().toISOString().split('T')[0];

    if (!title || !description || !selectedStatus || !creative || !dueDate) {
        alert('All fields must be filled out');
        return;
    }

    if (dueDate <= today) {
        alert('Due date must be greater than today\'s date');
        return;
    }
    
    const url = taskId ? `/project/task/update/${taskId}/` : '/project/task/create/';
    const method = taskId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({
            title: title,
            description: description,
            status: selectedStatus,
            assigned_to: creative,
            due_date: dueDate,
            project: projectId
        })
    })
    .then(response => response.json())
    .then(data => {
        // Update or create the task row in the DOM
        const taskRowId = `task-${data.id}`;
        let taskRow = document.getElementById(taskRowId);

        // Retrieve the assignee's username from the creative_list using the ID
        const assigneeName = document.querySelector(`#task-creative-id option[value="${creative}"]`).textContent;
        
        // Look up the client name using projectList
        const projectData = projectList.find(project => project.id === projectId);
        const clientName = projectData ? projectData.client_username : 'Unknown Client';

        // Format the due date to "Month Day, Year" format
        const formattedDueDate = new Date(data.due_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        // const taskListContainer = document.querySelector(`[data-project-id="${projectId}"]`);
        const projectRow = document.getElementById(`project-${projectId}`);

        // Remove the "No tasks available" message if it exists
        const noTasksMessage = document.querySelector(`[data-project-id="${projectId}"].no-tasks-message`);
        if (noTasksMessage) {
            noTasksMessage.remove();
        }

        // If the task row doesn't exist (new task), create a new row and add it to the DOM
        if (!taskRow) {
            taskRow = document.createElement('tr');
            taskRow.id = taskRowId;
            taskRow.classList.add('task-row');
            taskRow.dataset.projectId = projectId;
            // projectRow.insertAdjacentElement('afterend', taskRow);  // Insert the new row after the project row
            // Find the last task row related to this project
            const projectTaskRows = Array.from(document.querySelectorAll(`tr.task-row[data-project-id="${projectId}"]`));
            const lastTaskRow = projectTaskRows[projectTaskRows.length - 1];

            if (lastTaskRow) {
                // Insert after the last task row of the project
                lastTaskRow.insertAdjacentElement('afterend', taskRow);
            } else {
                // If there are no task rows yet, insert it directly after the project row
                const projectRow = document.getElementById(`project-${projectId}`);
                projectRow.insertAdjacentElement('afterend', taskRow);
            }
        }

        // Populate the task row with updated task data
        taskRow.innerHTML = `
            <td style="padding-left: 50px;">
                <span onclick="showEditTaskModal(${data.id});" style="cursor: pointer; color: black;">
                    ${data.title}
                </span>
            </td>
            <td id="task-description-${data.id}" onclick="editField(this, 'description', ${data.id}, true)">
                <span>${data.description}</span>
            </td>
            <td id="task-status-${data.id}" ondblclick="editStatus(this, 'status', ${data.id}, true)">
                <span>${data.status}</span>
            </td>
            <td><span>${clientName}</span></td>
            <td id="task-assigned_to-${data.id}"><span>${assigneeName}</span></td>
            <td id="task-due_date-${data.id}" onclick="editDate(this, 'due_date', ${data.id}, true)">
                <span>${formattedDueDate}</span>
            </td>
            <td>
                <button class="btn btn-danger btn-sm delete-task-btn" data-task-id="{{ task.id }}">Delete</button>
            </td>
        `;

        const deleteButton = taskRow.querySelector('.delete-task-btn');
        deleteButton.addEventListener('click', function() {
            showDeleteConfirmation(data.id, taskRow);
        });

        if (status) {
            moveTaskCard(data.id, status);
        }

        // Automatically expand task rows if they are hidden
        const taskRows = document.querySelectorAll(`.task-row[data-project-id="${projectId}"]`);
        const anyTaskVisible = Array.from(taskRows).some(taskRow => taskRow.style.display === "table-row");
        if (!anyTaskVisible) {
            toggleTaskCollapse(projectId);
        }

        // Close the modal after updating
        const taskModal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        if (taskModal) {
            taskModal.hide();
        }

        // Show success message
        const successMessage = taskId ? 'Task updated successfully.' : 'Task created successfully.';
        showSuccessMessage(successMessage);
    })
    .catch(error => console.error(taskId ? 'Error updating task:' : 'Error creating task:', error));
}

// Function to clear the form fields
function clearTaskForm() {
    document.getElementById('task-id').value = '';
    document.getElementById('task-project-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-status-select').value = 'To Do';
    document.getElementById('task-creative-id').value = '';
    document.getElementById('task-due-date').value = '';
}

// Clear the modal fields when the modal is closed
const addTaskModal = document.getElementById('addTaskModal');
if (addTaskModal) {
    addTaskModal.addEventListener('hidden.bs.modal', clearTaskForm);
}

function toggleTaskCollapse(projectId) {
    const taskRows = document.querySelectorAll(`.task-row[data-project-id="${projectId}"]`);
    const toggleButton = document.querySelector(`button.toggle-task-btn[onclick="toggleTaskCollapse(${projectId})"]`);
    
    // Toggle visibility of task rows
    taskRows.forEach(taskRow => {
        taskRow.style.display = (taskRow.style.display === "none" || taskRow.style.display === "") ? "table-row" : "none";
    });

    // Update the toggle button icon
    const anyTaskVisible = Array.from(taskRows).some(taskRow => taskRow.style.display === "table-row");
    toggleButton.textContent = anyTaskVisible ? "⌄" : "›";
}

function editDate(element, field, id, isTask = false) {
    const currentText = element.querySelector('span') ? element.querySelector('span').innerText : element.innerText;
    const dateValue = new Date(currentText).toISOString().split('T')[0];
    element.innerHTML = `<input type="date" value="${dateValue}" 
                            onblur="saveField(this, '${field}', ${id}, ${isTask}, '${field}')">`;

    const dateInput = element.querySelector('input');
    dateInput.focus();

    // Save when the date input loses focus
    dateInput.addEventListener('blur', function() {
        saveField(this, field, id, isTask);
    });
}

// Function to edit text fields (name, description)
function editField(element, field, id, isTask = false) {
    const currentText = element.querySelector('span') ? element.querySelector('span').innerText : element.innerText;
    element.innerHTML = `<input type="text" value="${currentText}" onblur="saveField(this, '${field}', ${id}, ${isTask})">`;
    const input = element.querySelector('input');
    input.focus();
    input.setSelectionRange(currentText.length, currentText.length);
}

function editStatus(element, field, id, isTask = false) {
    const currentStatus = element.innerText.trim();

    element.innerHTML = `
        <div class="dropdown-menu-container">
            <button type="button" class="btn btn-light btn-sm dropdown-toggle">${currentStatus}</button>
            <ul class="dropdown-menu show">
                <li><a href="#" class="dropdown-item ${currentStatus === 'To Do' ? 'active' : ''}" onclick="selectOption('${field}', ${id}, 'To Do', 'To Do', ${isTask}); event.preventDefault();">To Do</a></li>
                <li><a href="#" class="dropdown-item ${currentStatus === 'In Progress' ? 'active' : ''}" onclick="selectOption('${field}', ${id}, 'In Progress', 'In Progress', ${isTask}); event.preventDefault();">In Progress</a></li>
                <li><a href="#" class="dropdown-item ${currentStatus === 'Done' ? 'active' : ''}" onclick="selectOption('${field}', ${id}, 'Done', 'Done', ${isTask}); event.preventDefault();">Done</a></li>
            </ul>
        </div>
    `;

    document.addEventListener('click', function closeDropdown(event) {
        if (!element.contains(event.target)) {
            element.innerHTML = `<span>${currentStatus}</span>`;  // Reset to initial view
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function editDropdown(element, field, id, list, isTask = false) {
    const currentText = element.querySelector('span') ? element.querySelector('span').innerText : element.innerText;

    const label = field === 'client' ? 'Client' :
                  field === 'project_manager' ? 'Project Manager' :
                  field === 'assigned_to' ? 'Creative' : 'Option';

    let options = '';
    list.forEach(item => {
        const isActive = currentText === item.username ? 'active' : '';
        options += `<li><a href="#" class="dropdown-item ${isActive}" onclick="selectOption('${field}', ${id}, '${item.id}', '${item.username}', ${isTask}); event.preventDefault();">${item.username}</a></li>`;
    });

    element.innerHTML = `
        <div class="dropdown-menu-container">
            <button type="button" class="btn btn-light btn-sm dropdown-toggle">${currentText || `Select ${label}`}</button>
            <ul class="dropdown-menu show">${options}</ul>
        </div>
    `;

    // Close the dropdown when clicking outside of it
    document.addEventListener('click', function closeDropdown(event) {
        if (!element.contains(event.target)) {
            element.innerHTML = `<span>${currentText}</span>`;  // Reset to initial view
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function selectOption(field, id, newValue, displayText, isTask) {
    const element = document.querySelector(`#${isTask ? 'task-' : ''}${field}-${id}`);
    const modalElement = document.querySelector(`#${isTask ? 'task' : 'project'}-detail-${field}`);
    const modalProjectDetailTask = document.querySelector(`#modal-task-${field}-${id}`);


    if (element) {
        element.innerHTML = `<span>${displayText}</span>`;
    }

    if (modalElement) {
        modalElement.innerHTML = `<span>${displayText}</span>`;
    }

    if (modalProjectDetailTask) {
        modalProjectDetailTask.innerHTML = `<span>${displayText}</span>`;
    }

    const tempElement = { value: newValue, displayText: displayText };
    saveField(tempElement, field, id, isTask);
}

function saveField(element, field, id, isTask = false) {
    const value = element.value || element.getAttribute('value');
    const displayText = element.displayText || value || element.textContent; 
    const endpoint = isTask ? `/project/task/update/${id}/` : `/project/update/${id}/`;
    const csrftoken = getCookie('csrftoken');

    fetch(endpoint, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ [field]: value })
    })
    .then(response => response.json())
    .then((updatedData) => {
        const projectId = isTask ? (updatedData.project || document.querySelector(`[data-task-id="${id}"]`)?.dataset.projectId) : id;

        // Determine the modal context (list or kanban) for both project and task modals
        const projectModalContext = document.getElementById('projectDetailModalKanban') ? 'projectDetailModalKanban' : 'projectDetailModalList';
        const taskModalContext = document.getElementById('taskDetailModalKanban') ? 'taskDetailModalKanban' : 'taskDetailModalList';
        const modalContext = isTask ? taskModalContext : projectModalContext;
        
        // Dynamic modal element selection based on context
        const modalElementId = `${modalContext}-${field}`;
        const modalElement = document.getElementById(modalElementId);

        const updateContent = (target) => {
            if (field === 'due_date') {
                const dateObj = new Date(value);
                const formattedDate = dateObj.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                target.innerHTML = `<span>${formattedDate}</span>`;
            } else {
                target.innerHTML = `<span>${displayText}</span>`;
            }
        };

        // Check if we're in the Project Detail modal (task rows in a table) or Kanban board (task cards)
        const taskRowElement = document.querySelector(`#task-${field}-${id}`); // Project Detail modal format
        const kanbanTaskCard = document.querySelector(`.task-card[data-task-id="${id}"]`); // Kanban board format

        if (taskRowElement) {
            // Update in Project Detail modal
            updateContent(taskRowElement);
        } else if (kanbanTaskCard) {
            // Update in Kanban board format
            if (field === 'title') {
                kanbanTaskCard.querySelector('p').textContent = displayText;
            } else if (field === 'status') {
                moveTaskCard(id, displayText);
            }
        }

        // Update content in the modal itself
        if (modalElement) {
            updateContent(modalElement);
        } else {
            console.error(`Modal element with ID ${modalElementId} not found`);
        }

        // Update the project or task row if needed
        if (isTask) {
            const projectTaskFieldId = `${projectModalContext}-task-${field}-${id}`;
            const projectTaskFieldElement = document.getElementById(projectTaskFieldId);

            if (projectTaskFieldElement) {
                projectTaskFieldElement.textContent = displayText;
            }

            // Update task display in Kanban board if applicable
            const kanbanTaskCard = document.querySelector(`.task-card[data-task-id="${id}"]`);
            if (kanbanTaskCard) {
                if (field === 'title') {
                    kanbanTaskCard.querySelector('p').textContent = displayText;
                } else if (field === 'status') {
                    moveTaskCard(id, displayText);  // Move card if status changes in Kanban view
                }
            }
        } else {
            // For project fields, update the project data in the table if needed
            const updatedProjectData = { [field]: displayText };
            updateProjectTableRow(id, updatedProjectData);
        }
    })
    .catch(error => {
        console.error('Error updating field:', error);
        const targetElement = element.parentElement || element;
        if (targetElement) {
            targetElement.innerHTML = `<span>${element.value}</span>`;
        }
    });
}

// Function to update client fields in all task rows associated with a project
function updateTaskClientFields(projectId, newClient) {
    const taskRows = document.querySelectorAll(`[data-project-id="${projectId}"]`);
    taskRows.forEach(row => {
        const clientCell = row.querySelector('td:nth-child(4)'); // Assuming client is in the 4th cell
        if (clientCell) {
            clientCell.innerHTML = `<span>${newClient}</span>`;
        }
    });

    // Update client field in the task detail modal if open
    const taskModalClientElement = document.querySelector('#task-detail-client');
    if (taskModalClientElement) {
        taskModalClientElement.innerHTML = `<span>${newClient}</span>`;
    }
}

function updateProjectTableRow(projectId, updatedData) {
    const row = document.getElementById(`project-${projectId}`);
    if (row) {
        if (updatedData.name) row.querySelector('.project-name').textContent = updatedData.name;
        if (updatedData.description) row.querySelector(`#description-${projectId} span`).textContent = updatedData.description;
        if (updatedData.status) row.querySelector(`#status-${projectId} span`).textContent = updatedData.status;
        if (updatedData.client) {
            row.querySelector(`#client-${projectId} span`).textContent = updatedData.client;
            updateTaskClientFields(projectId, updatedData.client);  // Update tasks with new client name
        }
        if (updatedData.project_manager) row.querySelector(`#project_manager-${projectId} span`).textContent = updatedData.project_manager;
        if (updatedData.due_date) {
            const formattedDate = new Date(updatedData.due_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            row.querySelector(`#due_date-${projectId} span`).textContent = formattedDate;
        }
    }
}

function updateTaskTableRow(taskId, updatedData, field) {
    const row = document.getElementById(`task-${taskId}`);
    if (row) {
        if (updatedData.title) row.querySelector('.task-title').textContent = updatedData.title;
        if (updatedData.description) row.querySelector(`#task-description-${taskId} span`).textContent = updatedData.description;
        if (updatedData.status) row.querySelector(`#task-status-${taskId} span`).textContent = updatedData.status;
        if (updatedData.assigned_to) row.querySelector(`#task-assigned_to-${taskId} span`).textContent = updatedData.assigned_to;
        if (updatedData.due_date) {
            const formattedDate = new Date(updatedData.due_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            row.querySelector(`#task-due_date-${taskId} span`).textContent = formattedDate;
        }
    }

    const taskDetailField = document.querySelector(`#task-detail-${field}`);
    if (taskDetailField && updatedData[field]) {
        if (field === 'due_date') {
            const formattedDate = new Date(updatedData[field]).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            taskDetailField.innerHTML = `<span>${formattedDate}</span>`;
        } else {
            taskDetailField.innerHTML = `<span>${updatedData[field]}</span>`;
        }
    }
}

let taskToDeleteId = null;
let taskRowElement = null;
const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));

// Function to show the delete confirmation modal
function showDeleteConfirmation(taskId, rowElement) {
    if (taskId && rowElement) {
        taskToDeleteId = taskId;
        taskRowElement = rowElement;
        deleteModal.show(); // Show the confirmation modal
    } else {
        console.error("Invalid taskId or rowElement passed to showDeleteConfirmation");
    }
}

// Function to delete a task
function deleteTask(taskId, rowElement) {
    const csrftoken = getCookie('csrftoken');

    fetch(`/project/task/delete/${taskId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': csrftoken,
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            console.log("Task deleted successfully");
            rowElement.remove();  // Remove the task row from the DOM
            
            // Check if there are any remaining tasks in this project
            const projectId = rowElement.getAttribute('data-project-id');
            const taskRows = document.querySelectorAll(`[data-project-id="${projectId}"].task-row`);

            if (taskRows.length === 0) {
                // Add "No tasks available" message if no tasks are left
                const noTasksRow = document.createElement('tr');
                noTasksRow.classList.add('task-row', 'no-tasks-message');
                noTasksRow.dataset.projectId = projectId;
                noTasksRow.innerHTML = `<td colspan="7" class="text-muted" style="padding-left: 50px;">
                    <span>No tasks available for this project.</span>
                </td>`;
                document.querySelector(`#project-${projectId}`).after(noTasksRow);
            }
            deleteModal.hide();  // Close the delete confirmation modal

            setTimeout(() => {
                showSuccessMessage("Task deleted successfully.");
            }, 300);
        } else {
            console.error("Failed to delete task");
            alert("Could not delete task. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error deleting task:", error);
        alert("An error occurred while trying to delete the task.");
    });
}

// Function to display success message
function showSuccessMessage(message) {
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

function moveTaskCard(taskId, newStatus) {
    const taskCard = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    const statusColumn = {
        'To Do': 'to-do',
        'In Progress': 'in-progress',
        'Done': 'done'
    };

    if (taskCard) {
        taskCard.parentElement.removeChild(taskCard);
        const targetColumn = document.querySelector(`#${statusColumn[newStatus]} .task-list`);
        if (targetColumn) {
            targetColumn.appendChild(taskCard); // Move to the new column
        }
    }
}


document.addEventListener('DOMContentLoaded', function() {

    // Add event listener to delete buttons
    document.querySelectorAll('.delete-task-btn').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = this.getAttribute('data-task-id');
            const rowElement = this.closest('tr');
            showDeleteConfirmation(taskId, rowElement);
        });
    });

    // Event listener for confirm delete button in the delete confirmation modal
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (taskToDeleteId && taskRowElement) {
            deleteTask(taskToDeleteId, taskRowElement);  // Call deleteTask if confirmation is accepted
        } else {
            console.error("No task ID or row element found for deletion");
        }
    });

    const projectDetailModal = document.getElementById(projectDetailModalId);
    if (projectDetailModal) {
        projectDetailModal.addEventListener('hidden.bs.modal', function () {
            if (Object.keys(updatedProjectData).length > 0) {  
                updateProjectTableRow(currentProjectId, updatedProjectData);
                updatedProjectData = {};  
            }
        });
    } else {
        console.error('Modal with ID projectDetailModal not found');
    }

    const taskDetailModal = document.getElementById(taskDetailModalId);
    if (taskDetailModal) {
        taskDetailModal.addEventListener('hidden.bs.modal', function () {
            if (Object.keys(updatedTaskData).length > 0) {  
                updateTaskTableRow(currentTaskId, updatedTaskData);
                updatedTaskData = {};  
            }
        });
    } else {
        console.error('Modal with ID taskDetailModal not found');
    }
});