let currentProjectId;
let currentTaskId;
let updatedProjectData = {};
let updatedTaskData = {};

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
    console.log('showProjectDetail triggered for project:', projectId);
    currentProjectId = projectId;
    fetch(`/project/detail/${projectId}/`)
        .then(response => response.json())
        .then(project => {
            console.log('Project data received:', project); // Log the response
            console.log('Project ID:', projectId);

            // Close the project detail modal if it's open
            const taskDetailModalInstance = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
            if (taskDetailModalInstance) {
                taskDetailModalInstance.hide();
            }

            document.getElementById('project-detail-name').innerHTML = project.name;
            document.getElementById('project-detail-description').innerHTML = `<span>${project.description}</span>`;
            document.getElementById('project-detail-status').textContent = project.status || 'No Status';
            document.getElementById('project-detail-client').textContent = project.client_name || 'N/A';
            document.getElementById('project-detail-manager').textContent = project.pm_name || 'N/A';

            // Format Due Date
            if (project.due_date) {
                const dueDate = new Date(project.due_date);
                const formattedDate = dueDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('project-detail-due-date').textContent = formattedDate;
            } else {
                document.getElementById('project-detail-due-date').textContent = 'No Due Date';
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
                document.getElementById('project-detail-created-at').textContent = formattedCreatedAt;
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
                document.getElementById('project-detail-updated-at').textContent = formattedUpdatedAt;
            }

            // Load tasks and calculate progress
            loadProjectTasks(project.tasks);

            // Show the modal
            const detailModal = new bootstrap.Modal(document.getElementById('projectDetailModal'));
            detailModal.show();
        })
        .catch(error => console.error('Error fetching project details:', error));
}

// Function to load tasks and update progress bar
function loadProjectTasks(tasks) {
    const taskList = document.getElementById('project-task-list');
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
                <span class="task-assignee" ondblclick="editDropdown(this, 'assigned_to', ${task.id}, creativeList, true)">
                    ${task.creative_name || 'Unassigned'}
                </span>
                <span class="task-status" ondblclick="editStatus(this, 'status', ${task.id}, true)">
                    ${task.status}
                </span>
            </div>
        `;
        taskList.appendChild(taskItem);
    });

    // Calculate and update progress bar
    const progressPercent = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
    const progressBar = document.getElementById('task-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.setAttribute('aria-valuenow', progressPercent);
    progressBar.textContent = `${Math.round(progressPercent)}% Done`;
}

function showCreateTaskModal(projectId = null, status = null) {
    console.log('showCreateTaskModal triggered for project:', projectId, 'status:', status);

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
    const detailModalInstance = bootstrap.Modal.getInstance(document.getElementById('projectDetailModal'));
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
    console.log("showEditTaskModal triggered for task:", taskId);
    fetch(`/project/task/${taskId}/`)
        .then(response => response.json())
        .then(data => {
            console.log('Task data received:', data);
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
    console.log("showTaskDetail triggered for task:", taskId);
    currentTaskId = taskId;

    // Close the project detail modal if it's open
    const projectDetailModalInstance = bootstrap.Modal.getInstance(document.getElementById('projectDetailModal'));
    if (projectDetailModalInstance) {
        projectDetailModalInstance.hide();
    }

    fetch(`/project/task/${taskId}/`)
        .then(response => response.json())
        .then(data => {
            console.log('Task data received:', data);

            const projectName = data.project_name || 'Unknown Project';
            const projectId = data.project;

            // Populate modal fields with task data
            document.getElementById('task-detail-title').innerHTML = `
                <a href="javascript:void(0);" onclick="showProjectDetail(${projectId})" class="project-name-link">${projectName}</a> / 
                <span ondblclick="editField(this, 'title', ${taskId}, true)">${data.title}</span>
            `;
            document.getElementById('task-detail-description').innerHTML = `<span>${data.description}</span>`;
            document.getElementById('task-detail-status').textContent = data.status || 'No Status';
            document.getElementById('task-detail-assignee').textContent = data.creative_name || 'Unassigned';
            
            // Format Due Date
            if (data.due_date) {
                const dueDate = new Date(data.due_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('task-detail-due-date').textContent = dueDate;
            } else {
                document.getElementById('task-detail-due-date').textContent = 'No Due Date';
            }

            // Display Start Date if available
            if (data.start_date) {
                const startDate = new Date(data.start_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('task-detail-start-date').textContent = startDate;
            } else {
                document.getElementById('task-detail-start-date').textContent = 'Not Started';
            }

            // Display Completion Date if available
            if (data.completion_date) {
                const completionDate = new Date(data.completion_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('task-detail-completion-date').textContent = completionDate;
            } else {
                document.getElementById('task-detail-completion-date').textContent = 'Not Completed';
            }

            // Display Created At date
            if(data.created_at) {
                const createdAt = new Date(data.created_at).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('task-detail-created-at').textContent = createdAt;
            } else {
                document.getElementById('task-detail-created-at').textContent = 'Unknown';
            }

            // Display Updated At date
            if(data.updated_at) {
                const updatedAt = new Date(data.updated_at).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById('task-detail-updated-at').textContent = updatedAt;
            } else {
                document.getElementById('task-detail-updated-at').textContent = 'Unknown';
            }

            // Show the modal
            const taskDetailModal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
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
        console.log(taskId ? 'Task updated:' : 'Task created:', data);
        console.log('projectlist', projectList)

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
            projectRow.insertAdjacentElement('afterend', taskRow);  // Insert the new row after the project row
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
            <td id="task-assignee-${data.id}"><span>${assigneeName}</span></td>
            <td id="task-due-date-${data.id}" onclick="editDate(this, 'due_date', ${data.id}, true)">
                <span>${formattedDueDate}</span>
            </td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="showEditTaskModal(${data.id})">Update</button>
                <button class="btn btn-danger btn-sm delete-task-btn" data-task-id="{{ task.id }}">Delete</button>
            </td>
        `;

        const deleteButton = taskRow.querySelector('.delete-task-btn');
        deleteButton.addEventListener('click', function() {
            showDeleteConfirmation(data.id, taskRow);
        });

        // if (!taskId && typeof moveTaskCard === "function") {
        //     moveTaskCard(data.id, status);
        // }
        if (status) {
            moveTaskCard(data.id, status);
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
    // debug
    console.log('editField triggered:', element, field, id, isTask);
    const currentText = element.querySelector('span') ? element.querySelector('span').innerText : element.innerText;
    element.innerHTML = `<input type="text" value="${currentText}" onblur="saveField(this, '${field}', ${id}, ${isTask})">`;
    const input = element.querySelector('input');
    input.focus();
    input.setSelectionRange(currentText.length, currentText.length);
}

function editStatus(element, field, id, isTask = false) {
    const currentStatus = element.innerText.trim();
    element.innerHTML = `
        <select>
            <option value="To Do" ${currentStatus === 'To Do' ? 'selected' : ''}>To Do</option>
            <option value="In Progress" ${currentStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Done" ${currentStatus === 'Done' ? 'selected' : ''}>Done</option>
        </select>`;

    const status = element.querySelector('select');
    status.focus();

    // Save when the selection changes
    status.addEventListener('change', function() {
        saveField(this, field, id, isTask);
    });

    // Save when the dropdown loses focus (even if the value hasn't changed)
    status.addEventListener('blur', function() {
        setTimeout(() => saveField(this, field, id, isTask), 100); // Small delay to avoid conflicts with 'change'
    });
}

function editDropdown(element, field, id, list, isTask = false) {
    const currentText = element.querySelector('span') ? element.querySelector('span').innerText : element.innerText;
    let label;
    if (field === 'client') {
        label = 'Client';
    } else if (field === 'project_manager') {
        label = 'Project Manager';
    } else if (field === 'assigned_to') {
        label = 'Creative';
    } else {
        label = 'Option';
    }
    let options = `<option value="" disabled>Select ${label}</option>`;
    
    list.forEach(item => {
        options += `<option value="${item.id}" ${currentText.trim() === item.username.trim() ? 'selected' : ''}>${item.username}</option>`;
    });

    element.innerHTML = `<select>${options}</select>`;
    const dropdown = element.querySelector('select');
    dropdown.focus();

    // Save on change
    dropdown.addEventListener('change', function() {
        saveField(this, field, id, isTask);
    });

    // Save on blur (to capture if the user clicks outside without making a selection)
    dropdown.addEventListener('blur', function() {
        setTimeout(() => saveField(this, field, id, isTask), 100); // Small delay to handle modal quirks
    });
}

function saveField(element, field, id, isTask = false) {
    const value = element.value || element.getAttribute('value'); 
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
    .then(data => {
        if (isTask) {
            updatedTaskData[field] = value;  // Store updated field and value
            console.log('Updated task data:', updatedTaskData);  // Debugging line
            // If status is updated, move the task card
            if (field === 'status') {
                moveTaskCard(id, value); // Move task card immediately
            }

            if (data.creative_name) {
                updatedTaskData.assigned_to = data.creative_name;
            }
        } else {
            updatedProjectData[field] = value;  // Store updated field and value
            console.log('Updated project data:', updatedProjectData);  // Debugging line

            // Update the pm and client name
            if (data.pm_name) {
                updatedProjectData.project_manager = data.pm_name;  // Use the name, not the ID
            }
            if (data.client_name) {
                updatedProjectData.client = data.client_name;
                updatedTaskData.client = data.client_name;
            }
        }

        const parentElement = element.parentElement;
        if (field === 'due_date') {
            const dateObj = new Date(value);
            const formattedDate = dateObj.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            if (parentElement) parentElement.innerHTML = `<span>${formattedDate}</span>`;
        } else if (element.tagName === 'SELECT') {
            const selectedOption = element.querySelector(`option[value="${value}"]`);
            const displayText = selectedOption ? selectedOption.textContent : value;
            if (parentElement) parentElement.innerHTML = `<span>${displayText}</span>`;
        } else {
            if (parentElement) parentElement.innerHTML = `<span>${value}</span>`;
        }

    })
    .catch(error => {
        console.error('Error updating field:', error);
        if (element.parentElement) {
            element.parentElement.innerHTML = `<span>${element.value}</span>`;
        }
    });

}

function updateProjectTableRow(projectId, updatedData) {
    console.log("Updating table row for project:", projectId, updatedData);  // Add this for debugging
    const row = document.getElementById(`project-${projectId}`);  // Target the project row
    
    if (row) {
        if (updatedData.name) {
            row.querySelector('.project-name').textContent = updatedData.name;
        }
        if (updatedData.description) {
            row.querySelector(`#description-${projectId} span`).textContent = updatedData.description;
        }
        if (updatedData.status) {
            row.querySelector(`#status-${projectId} span`).textContent = updatedData.status;
        }
        if (updatedData.client) {
            row.querySelector(`#client-${projectId} span`).textContent =  updatedData.client;
        }
        if (updatedData.project_manager) {
            row.querySelector(`#assignee-${projectId} span`).textContent = updatedData.project_manager;
        }
        if (updatedData.due_date) {
            const formattedDate = new Date(updatedData.due_date).toLocaleString('default', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            row.querySelector(`#due-date-${projectId} span`).textContent = formattedDate;
        }
    }
}

function updateTaskTableRow(taskId, updatedData) {
    console.log("Updating table row for task:", taskId, updatedData);  // Add this for debugging
    const row = document.getElementById(`task-${taskId}`);  // Target the task row
    
    if (row) {
        if (updatedData.title) {
            row.querySelector('.task-title').textContent = updatedData.title;
        }
        if (updatedData.description) {
            row.querySelector(`#task-description-${taskId} span`).textContent = updatedData.description;
        }
        if (updatedData.status) {
            row.querySelector(`#task-status-${taskId} span`).textContent = updatedData.status;
        }
        if (updatedData.assigned_to) {
            row.querySelector(`#task-assignee-${taskId} span`).textContent = updatedData.assigned_to;
        }
        if (updatedData.due_date) {
            const formattedDate = new Date(updatedData.due_date).toLocaleString('default', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            row.querySelector(`#task-due-date-${taskId} span`).textContent = formattedDate;
        }
    }
}

let taskToDeleteId = null;
let taskRowElement = null;
const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));

// Function to show the delete confirmation modal
function showDeleteConfirmation(taskId, rowElement) {
    console.log("showDeleteConfirmation called with taskId:", taskId, "and rowElement:", rowElement);
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
    console.log("Attempting to delete task with ID:", taskId);

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
            console.log("Project ID:", projectId);
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
        console.log("Delete confirmation button clicked");
        if (taskToDeleteId && taskRowElement) {
            deleteTask(taskToDeleteId, taskRowElement);  // Call deleteTask if confirmation is accepted
        } else {
            console.error("No task ID or row element found for deletion");
        }
    });

    const projectDetailModal = document.getElementById('projectDetailModal');
    if (projectDetailModal) {
        projectDetailModal.addEventListener('hidden.bs.modal', function () {
            console.log('Modal closed');
            if (Object.keys(updatedProjectData).length > 0) {  
                updateProjectTableRow(currentProjectId, updatedProjectData);
                updatedProjectData = {};  
            }
        });
    } else {
        console.error('Modal with ID projectDetailModal not found');
    }

    const taskDetailModal = document.getElementById('taskDetailModal');
    if (taskDetailModal) {
        taskDetailModal.addEventListener('hidden.bs.modal', function () {
            console.log('Task Detail Modal closed');
            if (Object.keys(updatedTaskData).length > 0) {  
                updateTaskTableRow(currentTaskId, updatedTaskData);
                updatedTaskData = {};  
            }
        });
    } else {
        console.error('Modal with ID taskDetailModal not found');
    }
});