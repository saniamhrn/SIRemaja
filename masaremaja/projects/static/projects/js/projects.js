let currentProjectId;
let currentTaskId;
let updatedProjectData = {};
let updatedTaskData = {};

let itemToDeleteId = null;
let itemTypeToDelete = null;
let itemRowElement = null;
const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));

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

function deleteProject(projectId, rowElement) {
    const csrftoken = getCookie('csrftoken');
    // if (confirm('Are you sure you want to delete this project?')) {
    fetch(`/project/delete/${projectId}`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => {
        if (response.ok) {
            console.log('Project deleted');
            rowElement.remove();
            deleteModal.hide();
            setTimeout(() => {
                showSuccessMessage("Project deleted successfully.");
            }, 300);
        } else {
            console.error("Failed to delete project");
        }
    })
    .catch(error => console.error('Error deleting project:', error));
    // }
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
            const nameElement = document.getElementById(`${projectDetailModalId}-name`);
            nameElement.innerHTML = `
                <span onclick="editField(this.parentElement, 'name', ${project.id})">${project.name}</span>
                <i class="fa fa-edit edit-icon" title="Edit" onclick="editField(this.parentElement, 'name', ${project.id})"></i>
            `;
            const descriptionElement = document.getElementById(`${projectDetailModalId}-description`);
            descriptionElement.innerHTML = `
                <span onclick="editField(this.parentElement, 'description', ${project.id})">${project.description}</span>
                <i class="fa fa-edit edit-icon" title="Edit" onclick="editField(this.parentElement, 'description', ${project.id})"></i>
            `;

            const fieldsToUpdate = [
                { field: 'status', value: project.status, defaultText: 'No Status' },
                { field: 'client', value: project.client_name, defaultText: 'N/A' },
                { field: 'project_manager', value: project.pm_name, defaultText: 'N/A' },
            ];

            fieldsToUpdate.forEach(({ field, value, defaultText }) => {
                const fieldElement = document.getElementById(`${projectDetailModalId}-${field}`);
                const dropdownButton = fieldElement ? fieldElement.querySelector('.dropdown-toggle span') : null;
                
                if (dropdownButton && value) {
                    dropdownButton.textContent = value;
                } else if (dropdownButton) {
                    dropdownButton.textContent = defaultText;
                }

                // Update text content for the field if it's not a dropdown
                if (fieldElement && !dropdownButton) {
                    fieldElement.textContent = value || defaultText;
                }
            });

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

            // Load files
            loadProjectFiles(projectId);

            // Show the modal
            const detailModal = new bootstrap.Modal(document.getElementById(projectDetailModalId));
            detailModal.show();
        })
        .catch(error => console.error('Error fetching project details:', error));
}

function loadProjectFiles(projectId) {
    const fileList = document.getElementById(`${projectDetailModalId}-file-list`);
    fileList.innerHTML = '';
    fetch(`/project/detail/${projectId}/`)
        .then(response => response.json())
        .then(project => {
            if (project.files.length === 0) {
                fileList.innerHTML = `
                <div>
                    <p class="text-muted" style="font-size: 0.9rem;">No files uploaded for this project.</p>
                </div>`
            } else {
                project.files.forEach(file => {
                    const uploadedAt = new Date(file.uploaded_at);
                    const formattedDate = uploadedAt.toLocaleString('default', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true  // AM/PM format
                    });
    
                    const fileName = file.file.split('/').pop();
                    const fileUrl = file.file;
    
                    const fileItem = document.createElement('div');
                    fileItem.classList.add('task-item', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'p-2');
                    fileItem.id = `file-item-${file.id}`;  // Set the ID to target the file for deletion
    
                    fileItem.innerHTML = `
                        <div>
                            <span class="file-name" style="font-weight: bold; cursor: pointer;" onclick="window.open('${fileUrl}', '_blank')">${fileName}</span> <!-- Directly open file URL in a new tab -->
                            <p class="text-muted" style="font-size: 0.7rem;"><strong>Uploaded On</strong> <span>${formattedDate}</span></p>
                        </div>
                        <div class="task-actions">
                            <a href="${file.file}" class="btn btn-sm btn-secondary" download>
                                <i class="fa fa-download"></i> 
                            </a>
                            <button class="btn btn-sm btn-danger" onclick="deleteFile(${file.id})">
                                <i class="fa fa-trash"></i> 
                            </button>
                        </div>
                    `;
                    fileList.appendChild(fileItem);
                });
            }
        })
        .catch(error => console.error('Error loading project files:', error));
}

// Function to trigger the file input click event
function triggerFileInput() {
    document.getElementById('fileInput').click();  // Open the file selection dialog
}

// Handle the file upload automatically after a file is selected
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];  // Get the selected file
    console.log(file);
    console.log(currentProjectId);
    
    if (file) {
        const formData = new FormData();
        formData.append('file', file);  // Append the selected file to the form data
        formData.append('project', currentProjectId);  // Append the project ID

        const csrftoken = getCookie('csrftoken');

        // Make the AJAX request to upload the file
        fetch(`/project/upload-file/${currentProjectId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,  // Add CSRF token to the request headers
            },
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadProjectFiles(currentProjectId);  // Reload the file list in the modal
                alert('File uploaded successfully!');
            } else {
                console.error('Error uploading file:', data.error);
                alert('Error uploading file!');
            }
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            alert('Error uploading file!');
        });
    }
}

function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        fetch(`/project/delete-file/${fileId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                // Remove the file from the UI
                const fileItem = document.getElementById(`file-item-${fileId}`);
                if (fileItem) {
                    fileItem.remove();
                }
                alert('File deleted successfully!');
            } else {
                alert('Error deleting file!');
            }
        })
        .catch(error => {
            console.error('Error deleting file:', error);
            alert('Error deleting file!');
        });
    }
}

function loadProjectTasks(tasks) {
    const taskList = document.getElementById(`${projectDetailModalId}-task-list`);
    taskList.innerHTML = '';  // Clear previous tasks

    tasks.forEach(task => {
        // Create each task item as a list item
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2', 'p-2');

        taskItem.innerHTML = `
             <div>
                <span class="task-title" onclick="showTaskDetail(${task.id})" style="font-weight: bold;">${task.title}</span>
            </div>
            <div class="task-actions">
                <!-- Assignee Dropdown with unique ID for modal -->
                <div id="modal-task-assigned_to-${task.id}" class="dropdown-menu-container">
                    <button type="button" class="btn btn-light btn-sm dropdown-toggle" onclick="toggleDropdownMenu(this)">
                        <span>${task.creative_name || 'Unassigned'}</span>
                    </button>
                    <ul class="dropdown-menu assigned_to-dropdown-menu">
                        ${creativeList.map(creative => `
                            <li><a href="#" class="dropdown-item" onclick="selectOption('assigned_to', ${task.id}, '${creative.id}', '${creative.username}', true, 'modal'); event.preventDefault();">${creative.username}</a></li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Status Dropdown with unique ID for modal -->
                <div id="modal-task-status-${task.id}" class="dropdown-menu-container">
                    <button type="button" class="btn btn-light btn-sm dropdown-toggle" onclick="toggleDropdownMenu(this)">
                        <span>${task.status}</span>
                    </button>
                    <ul class="dropdown-menu status-dropdown-menu">
                        <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${task.id}, 'To Do', 'To Do', true, 'modal'); event.preventDefault();">To Do</a></li>
                        <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${task.id}, 'In Progress', 'In Progress', true, 'modal'); event.preventDefault();">In Progress</a></li>
                        <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${task.id}, 'Done', 'Done', true, 'modal'); event.preventDefault();">Done</a></li>
                    </ul>
                </div>
            </div>
        `;
        taskList.appendChild(taskItem);
    });

    updateProgressBar(taskList.querySelectorAll('.task-item'));
}

function updateProgressBar(taskItems) {
    const tasks = Array.from(taskItems); // Convert NodeList to array

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => {
        const statusElement = task.querySelector('.task-actions .dropdown-menu-container:nth-of-type(2) .dropdown-toggle span');
        return statusElement && statusElement.textContent.trim() === 'Done';
    }).length;

    const progressPercent = totalTasks ? (completedTasks / totalTasks) * 100 : 0;
    const progressBar = document.getElementById(`${projectDetailModalId}-progress-bar`);

    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
        progressBar.setAttribute('aria-valuenow', progressPercent);
        progressBar.textContent = `${Math.round(progressPercent)}% Done`;
    } else {
        console.error("Progress bar element not found!");
    }
}

function showCreateTaskModal(projectId, status = null, pageContext = 'list') {
    const statusText = document.getElementById('task-status-text');
    const statusSelect = document.getElementById('task-status-select');
    const projectSelect = document.getElementById('task-project-id');

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

    // Handle locking or unlocking the "Select Project" dropdown
    if (projectSelect) {
        if (projectId) {
            // Find the project name from the projectList
            const projectData = projectList.find(project => project.id === parseInt(projectId));
            const projectName = projectData ? projectData.name : 'Unknown Project';

            // Update dropdown to display the project name
            projectSelect.innerHTML = `
                <option value="${projectId}" selected>${projectName}</option>
            `;

            projectSelect.disabled = true; 
        } else {
            // projectSelect.value = ''; 
            projectSelect.innerHTML = `
                <option value="" disabled selected>Select Project</option>
                ${projectList.map(project => `
                    <option value="${project.id}">${project.name}</option>
                `).join('')}
            `;
            projectSelect.disabled = false; 
        }
    }

    const detailModalId = pageContext === 'kanban' ? 'projectDetailModalKanban' : 'projectDetailModalList';
    const detailModalInstance = bootstrap.Modal.getInstance(document.getElementById(detailModalId));
    if (detailModalInstance) {
        detailModalInstance.hide();
    }

    // document.getElementById('task-project-id').value = projectId || '';
    document.getElementById('addTaskModalLabel').textContent = 'Add New Task';
    document.getElementById('submit-task-btn').textContent = 'Add Task';
    document.getElementById('submit-task-btn').onclick = function () {
        submitTaskForm(
            projectId,
            null,
            status || statusSelect.value,
            pageContext
        );
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
            const taskTitleElement = document.getElementById(`${taskDetailModalId}-title`);
            taskTitleElement.innerHTML = `
                <a href="javascript:void(0);" onclick="showProjectDetail(${projectId})" class="project-name-link">${projectName}</a> / 
                <span ondblclick="editField(this.parentElement, 'title', ${taskId}, true)">${data.title}</span>
                <i class="fa fa-edit edit-icon" title="Edit" onclick="editField(this.parentElement, 'title', ${taskId}, true)"></i>
            `;

            document.getElementById(`${taskDetailModalId}-description`).innerHTML = `
                <span onclick="editField(this.parentElement, 'description', ${taskId}, true)">${data.description}</span>
                <i class="fa fa-edit edit-icon" title="Edit" onclick="editField(this.parentElement, 'description', ${taskId}, true)"></i>
            `;

            // Dynamically update fields like status, client, assignee (creative, pm), etc.
            const fieldsToUpdate = [
                { field: 'status', value: data.status, defaultText: 'No Status' },
                { field: 'assigned_to', value: data.creative_name, defaultText: 'Unassigned' }
            ];

            fieldsToUpdate.forEach(({ field, value, defaultText }) => {
                const fieldElement = document.getElementById(`${taskDetailModalId}-${field}`);
                const dropdownButton = fieldElement ? fieldElement.querySelector('.dropdown-toggle span') : null;
                
                if (dropdownButton && value) {
                    dropdownButton.textContent = value;
                } else if (dropdownButton) {
                    dropdownButton.textContent = defaultText;
                }

                // Update text content for the field if it's not a dropdown
                if (fieldElement && !dropdownButton) {
                    fieldElement.textContent = value || defaultText;
                }
            });

            // Format Due Date
            if (data.due_date) {
                const dueDate = new Date(data.due_date);
                const formattedDueDate = dueDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
                document.getElementById(`${taskDetailModalId}-due_date`).textContent = formattedDueDate;
            } else {
                document.getElementById(`${taskDetailModalId}-due_date`).textContent = 'No Due Date';
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

            // Format Start Date
            if (data.start_date) {
                const startDate = new Date(data.start_date);
                const formattedStartDate = startDate.toLocaleString('default', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
                document.getElementById(`${taskDetailModalId}-start_date`).textContent = formattedStartDate;
            } else {
                document.getElementById(`${taskDetailModalId}-start_date`).textContent = 'Not Started Yet';
            }

            // Format Completion Date
            if (data.completion_date) {
                const completionDate = new Date(data.completion_date);
                const formattedCompletionDate = completionDate.toLocaleString('default', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
                document.getElementById(`${taskDetailModalId}-completion_date`).textContent = formattedCompletionDate;
            } else {
                document.getElementById(`${taskDetailModalId}-completion_date`).textContent = 'Not Completed Yet';
            }

            // Show the modal
            const taskDetailModal = new bootstrap.Modal(document.getElementById(taskDetailModalId));
            taskDetailModal.show();
        })
        .catch(error => console.error('Error fetching task data:', error));
}

function submitTaskForm(projectId, taskId = null, status = null, pageContext = 'list') {
    // const projectId = document.getElementById('task-project-id').value;
    if (!projectId) {
        projectId = document.getElementById('task-project-id').value;
    }
    projectId = Number(projectId); // Convert to number for comparison

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const selectedStatus = status || document.getElementById('task-status-select').value;
    const creative = document.getElementById('task-creative-id').value;
    const dueDate = document.getElementById('task-due-date').value;

    const csrftoken = getCookie('csrftoken');

    const today = new Date().toISOString().split('T')[0];

    if (!projectId) {
        alert('Please select a project for the task.');
        return;
    }

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
        
        const projectData = projectList.find(project => project.id === projectId);
        const clientName = projectData ? projectData.client_username : 'Unknown Client';
        const projectName = projectData ? projectData.name : 'Unknown Project';

        // Format the due date to "Month Day, Year" format
        const formattedDueDate = new Date(data.due_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        if (pageContext === 'list') {
            const noTasksMessage = document.querySelector(`[data-project-id="${projectId}"].no-tasks-message`);
            if (noTasksMessage) {
                noTasksMessage.remove();
            }

            if (!taskRow) {
                taskRow = document.createElement('tr');
                taskRow.id = taskRowId;
                taskRow.classList.add('task-row');
                taskRow.dataset.projectId = projectId;

                const projectTaskRows = Array.from(document.querySelectorAll(`tr.task-row[data-project-id="${projectId}"]`));
                const lastTaskRow = projectTaskRows[projectTaskRows.length - 1];

                if (lastTaskRow) {
                    lastTaskRow.insertAdjacentElement('afterend', taskRow);
                } else {
                    const projectRow = document.getElementById(`project-${projectId}`);
                    projectRow.insertAdjacentElement('afterend', taskRow);
                }
            }

            taskRow.innerHTML = `
                <td style="padding-left: 50px;">
                    <span onclick="showEditTaskModal(${data.id});" style="cursor: pointer; color: black;">
                        ${data.title}
                    </span>
                </td>
                <td id="task-description-${data.id}" onclick="editField(this, 'description', ${data.id}, true)">
                    <span>${data.description}</span>
                </td>
                <td id="task-status-${data.id}">
                    <div class="dropdown-menu-container">
                        <button type="button" class="btn btn-light btn-sm dropdown-toggle" onclick="toggleDropdownMenu(this)">
                            <span>${data.status}</span>
                        </button>
                        <ul class="dropdown-menu status-dropdown-menu">
                            <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${data.id}, 'To Do', 'To Do', true); event.preventDefault();">To Do</a></li>
                            <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${data.id}, 'In Progress', 'In Progress', true); event.preventDefault();">In Progress</a></li>
                            <li><a href="#" class="dropdown-item" onclick="selectOption('status', ${data.id}, 'Done', 'Done', true); event.preventDefault();">Done</a></li>
                        </ul>
                    </div>
                </td>
                <td><span>${clientName}</span></td>
                <td id="task-assigned_to-${data.id}">
                    <div class="dropdown-menu-container">
                        <button type="button" class="btn btn-light btn-sm dropdown-toggle" onclick="toggleDropdownMenu(this)">
                            <span>${assigneeName}</span>
                        </button>
                        <ul class="dropdown-menu assigned_to-dropdown-menu">
                            ${creativeList.map(creative => `
                                <li><a href="#" class="dropdown-item" onclick="selectOption('assigned_to', ${data.id}, '${creative.id}', '${creative.username}', true); event.preventDefault();">${creative.username}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                </td>
                <td id="task-due_date-${data.id}">
                    <div class="editable-field">
                        <span>${formattedDueDate}</span>
                        <i class="fa fa-calendar edit-icon" title="Edit" onclick="editDate(this.parentElement, 'due_date', ${data.id}, true)"></i>
                    </div>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm delete-task-btn" data-task-id="${data.id}">Delete</button>
                </td>
            `;

            // const deleteButton = taskRow.querySelector('.delete-task-btn');
            // deleteButton.addEventListener('click', function() {
            //     showDeleteConfirmation(data.id, taskRow);
            // });

            const taskRows = document.querySelectorAll(`.task-row[data-project-id="${projectId}"]`);
            const anyTaskVisible = Array.from(taskRows).some(taskRow => taskRow.style.display === "table-row");
            if (!anyTaskVisible) {
                toggleTaskCollapse(projectId);
            }
        } else if (pageContext === 'kanban') {
            const kanbanColumn = document.querySelector(`[data-status="${selectedStatus}"] .task-list`);
            if (!kanbanColumn) {
                console.error(`Kanban column for status "${selectedStatus}" not found. Ensure the column's data-status matches.`);
                return;
            }

            const taskCard = document.createElement('div');
            taskCard.classList.add('task-card');
            taskCard.dataset.taskId = data.id;
            taskCard.setAttribute('onclick', `showTaskDetail(${data.id})`);
            taskCard.innerHTML = `
                <p><strong>${data.title}</strong></p>
                <p>${projectName}</p>
            `;
            kanbanColumn.appendChild(taskCard);

            moveTaskCard(data.id, selectedStatus);
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
    // document.getElementById('task-project-id').value = '';
    const projectSelect = document.getElementById('task-project-id');
    if (!projectSelect.disabled) {
        // Only reset if the project dropdown is not disabled
        projectSelect.value = '';
    }
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

const projectsToExpand = new Set(); // Tracks projects to expand based on search
const expandedProjects = new Set(); // Tracks projects expanded by search
const manuallyCollapsedProjects = new Set(); // To track manually collapsed projects

// Function to initialize project states when the page loads
function initializeProjectStates() {
    document.querySelectorAll('.project-row').forEach(projectRow => {
        const projectId = projectRow.id.replace('project-', '');
        const taskRows = document.querySelectorAll(`.task-row[data-project-id="${projectId}"]`);
        
        // Check if any task rows are visible (collapsed or expanded)
        const isCollapsed = Array.from(taskRows).every(taskRow => taskRow.style.display === "none");
        
        // If task rows are collapsed, mark project as collapsed, else mark as expanded
        if (isCollapsed) {
            expandedProjects.delete(projectId);
        } else {
            expandedProjects.add(projectId);
        }
    });
}

// Toggle task collapse (expand/collapse project rows)
function toggleTaskCollapse(projectId, forceExpand = false) {
    const projectRow = document.getElementById(`project-${projectId}`);
    const taskRows = document.querySelectorAll(`.task-row[data-project-id="${projectId}"]`);
    const toggleButton = projectRow.querySelector('.toggle-task-btn');
    
    const isCollapsed = Array.from(taskRows).every(
        taskRow => taskRow.style.display === "none" || taskRow.style.display === ""
    );

    if (forceExpand || isCollapsed) {
        // Expand the project
        taskRows.forEach(taskRow => {
            taskRow.style.display = "table-row";
        });
        toggleButton.textContent = "⌄"; 
        projectRow.classList.remove('collapsed');
        expandedProjects.add(projectId); 
        manuallyCollapsedProjects.delete(projectId);
    } else{
        // Collapse the project
        taskRows.forEach(taskRow => {
            taskRow.style.display = "none";
        });
        toggleButton.textContent = "›"; 
        projectRow.classList.add('collapsed');
        expandedProjects.delete(projectId);
        manuallyCollapsedProjects.add(projectId);
    }
}

// Function to highlight and expand projects based on search query
function highlightAndExpandProjects(query) {
    const taskRows = document.querySelectorAll('.task-row');
    const projectRows = document.querySelectorAll('.project-row');
    const taskCards = document.querySelectorAll('.task-card'); // For board view
    const projectCards = document.querySelectorAll('.card-title'); // For card view

    projectsToExpand.clear(); // Clear the set before populating it

    // Handle task rows matching the query
    taskRows.forEach(taskRow => {
        const taskTitle = taskRow.querySelector('.task-title');
        if (!taskTitle) return;

        const projectId = taskRow.dataset.projectId;
        const taskTitleText = taskTitle.textContent.toLowerCase();

        if (taskTitleText.includes(query.toLowerCase())) {
            highlightMatches(taskTitle, query);
            projectsToExpand.add(projectId); // Track projects to expand
        } else {
            taskTitle.innerHTML = taskTitle.textContent; // Reset highlights
        }
    });

    // Handle project rows matching the query (only highlight, not expand)
    projectRows.forEach(projectRow => {
        const projectId = projectRow.id.replace('project-', '');
        const projectTitle = projectRow.querySelector('.project-name');
        const projectTitleText = projectTitle.textContent.toLowerCase();

        if (projectTitleText.includes(query.toLowerCase()) && !projectsToExpand.has(projectId)) {
            highlightMatches(projectTitle, query);
        } else {
            projectTitle.innerHTML = projectTitle.textContent; // Reset highlights
        }
    });

     // Card View: Handle project cards matching the query (inside the card view)
     projectCards.forEach(cardTitle => {
        const projectTitleText = cardTitle.textContent.toLowerCase();

        if (projectTitleText.includes(query.toLowerCase())) {
            highlightMatches(cardTitle, query); // Highlight matching project name in card
        } else {
            cardTitle.innerHTML = cardTitle.textContent; // Reset highlights
        }
    });

    // Board View: Handle task cards and project names matching the query
    taskCards.forEach(taskCard => {
        const taskTitle = taskCard.querySelector('p strong');
        const projectName = taskCard.querySelector('p');
        if (taskTitle) {
            const taskTitleText = taskTitle.textContent.toLowerCase();
            if (taskTitleText.includes(query.toLowerCase())) {
                highlightMatches(taskTitle, query); // Highlight task titles
            } else {
                taskTitle.innerHTML = taskTitle.textContent; // Reset highlights
            }
        }

        if (projectName) {
            const projectNameText = projectName.textContent.toLowerCase();
            if (projectNameText.includes(query.toLowerCase())) {
                highlightMatches(projectName, query); // Highlight project name 
            } else {
                projectName.innerHTML = projectName.textContent; // Reset highlights
            }
        }
    });

    // Expand projects if a task matches or if the project is manually collapsed
    projectsToExpand.forEach(projectId => {
        if (!manuallyCollapsedProjects.has(projectId)) {
            toggleTaskCollapse(projectId, true); // Force-expand if not manually expanded
        }
    });
}

// Function to reset highlights and collapse projects that were expanded by search
function resetHighlightsAndCollapse() {
    // Reset all highlights
    document.querySelectorAll('.highlight').forEach(span => {
        span.replaceWith(span.innerHTML); // Replace <span> with its inner text
    });

    document.querySelectorAll('.project-row').forEach(projectRow => {
        const projectId = projectRow.id.replace('project-', '');
        
        // Collapse project if it's not in the expandedProjects or manuallyCollapsedProjects
        if (!projectsToExpand && !expandedProjects.has(projectId) && !manuallyCollapsedProjects.has(projectId)) {
            toggleTaskCollapse(projectId, false); // Collapse project
        }
    });
}


// Function to highlight matched text in search
function highlightMatches(element, query) {
    const regex = new RegExp(`(${query})`, 'gi'); // Create a case-insensitive regex to match the query
    const text = element.textContent;
    const replacedText = text.replace(regex, '<span class="highlight">$1</span>'); // Highlight the matched text
    element.innerHTML = replacedText; 
}

async function editDate(element, field, id, isTask = false) {
    // Prevent creating another input if it already exists
    if (element.querySelector('input')) return;

    // Locate the span and icon
    const span = element.querySelector('span');
    const icon = element.querySelector('i');

    // Ensure the label is not included in the date value
    const currentText = span ? span.innerText.trim() : '';
    const dateValue = currentText && !currentText.includes('No Due Date')
        ? (() => {
              const parsedDate = new Date(currentText);
              if (!isNaN(parsedDate)) {
                const adjustedDate = new Date(
                    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000
                );
                return adjustedDate.toISOString().split('T')[0];
            }
            return '';
          })()
        : '';

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create the date input
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = dateValue;
    dateInput.classList.add('inline-date-input');
    dateInput.min = today; // Set the minimum date to today

    // Add blur event to save the date
    dateInput.addEventListener('blur', async function () {
        const selectedDate = dateInput.value ? new Date(dateInput.value) : null;

        // Format the selected date
        const formattedDate = selectedDate
            ? selectedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
              })
            : 'No Due Date';

        // Update the span's text and restore the icon
        if (span) {
            span.textContent = formattedDate;
            span.style.display = ''; // Ensure span is visible again
        }
        if (icon) {
            icon.style.display = ''; // Ensure icon is visible again
        }

        // Remove the date input
        dateInput.remove();

        // Save the date via saveField
        try {
            await saveField(dateInput, field, id, isTask, 'date');
            // Refresh the calendar after saving
            await initCalendar();
        } catch (error) {
            console.error('Error saving date:', error);
        }
    });

    // Replace content: hide span and icon while showing input
    if (span) span.style.display = 'none';
    if (icon) icon.style.display = 'none';

    element.appendChild(dateInput);
    dateInput.focus();

}


// Function to edit text fields (name, description)
async function editField(element, field, id, isTask = false) {
    // Prevent re-creating the input if it already exists
    if (element.querySelector('input')) return;

    const span = element.querySelector('span');
    const icon = element.querySelector('i');
    const currentText = span ? span.innerText : element.innerText;

    // Hide the icon during editing
    if (icon) icon.style.display = 'none';

    // For modal title with project link (specific case for task title)
    if (isTask && field === 'title') {
        const projectLinkElement = element.querySelector('a');
        const projectLinkHTML = projectLinkElement ? projectLinkElement.outerHTML : '';

        // Create input for editing
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('inline-input');

        // Prevent blur issues inside modal
        input.addEventListener('click', (e) => e.stopPropagation());

        // Update the element to preserve the project link and add input
        element.innerHTML = `${projectLinkHTML} / `;
        element.appendChild(input);

        input.focus();
        input.setSelectionRange(currentText.length, currentText.length);

        // Handle blur event for saving data
        input.addEventListener('blur', async () => {
            const updatedText = input.value.trim() || currentText; // Prevent empty values

            try {
                await saveField(input, field, id, isTask); // Save the field
                span.innerText = updatedText; // Update UI with new value
            } catch (error) {
                console.error('Error saving field:', error);
                span.innerText = currentText; // Revert to original value on error
            } finally {
                span.style.display = ''; // Restore span visibility
                if (icon) icon.style.display = ''; // Restore icon visibility
                input.remove(); // Remove input element
            }
        });
    } else {
        // For other fields
        span.style.display = 'none';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('inline-input');

        // Prevent blur issues inside modal
        input.addEventListener('click', (e) => e.stopPropagation());

        // Insert input and keep the icon hidden during editing
        element.insertBefore(input, span.nextSibling);

        input.focus();
        input.setSelectionRange(currentText.length, currentText.length);

        // Handle blur event for saving data
        input.addEventListener('blur', async () => {
            const updatedText = input.value.trim() || currentText; // Prevent empty values

            try {
                await saveField(input, field, id, isTask); // Save the field
                span.innerText = updatedText; // Update UI with new value
            } catch (error) {
                console.error('Error saving field:', error);
                span.innerText = currentText; // Revert to original value on error
            } finally {
                span.style.display = ''; // Restore span visibility
                if (icon) icon.style.display = ''; // Restore icon visibility
                input.remove(); // Remove input element
            }
        });
    }
}

// Toggle dropdown menu visibility
function toggleDropdownMenu(button) {
    const dropdownMenu = button.nextElementSibling;
    dropdownMenu.classList.toggle('show');
}

async function selectOption(field, id, newValue, displayText, isTask) {
    const element = document.querySelector(`#${isTask ? 'task-' : ''}${field}-${id}`);

    // Determine the project modal context (Kanban or List view)
    const projectModalContext = document.getElementById('projectDetailModalKanban') ? 'projectDetailModalKanban' : 'projectDetailModalList';
    const projectmodalElement = document.querySelector(`#${projectModalContext}-${field}`);
    const projectTaskList = document.querySelector(`#${projectModalContext}-task-list`);

    // Determine the task modal context (Kanban or List view)
    const taskModalContext = document.getElementById('taskDetailModalKanban') ? 'taskDetailModalKanban' : 'taskDetailModalList';
    const taskmodalElement = document.querySelector(`#${taskModalContext}-${field}`);

    // Update the display text in the table row
    if (element) {
        const spanElement = element.querySelector('.dropdown-toggle span');
        if (spanElement) {
            spanElement.textContent = displayText;
        }

        // Close dropdown in task context
        const dropdownMenu = element.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            closeDropdown(dropdownMenu);
        }
    }

    // Update the display text in the project modal
    if (!isTask && projectmodalElement) {
        const spanElement = projectmodalElement.closest('.dropdown-menu-container').querySelector('.dropdown-toggle span');

        if (spanElement) {
            spanElement.textContent = displayText;
        }

        // Close dropdown in project modal context
        const dropdownMenu = projectmodalElement.closest('.dropdown-menu-container').querySelector(`.${field}-dropdown-menu`);
        if (dropdownMenu) {
            closeDropdown(dropdownMenu);
        }
    }

    // Update the display text in the project task list
    if (isTask && projectTaskList) {
        // Locate the specific task row in the project task list
        const taskRow = projectTaskList.querySelector(`#modal-task-${field}-${id}`);
        if (taskRow) {
            const spanElement = taskRow.querySelector('.dropdown-toggle span');
            if (spanElement) {
                spanElement.textContent = displayText;
            }

            // Close the dropdown menu within the specific task row
            const dropdownMenu = taskRow.querySelector(`.${field}-dropdown-menu`);
            if (dropdownMenu) {
                closeDropdown(dropdownMenu);
            }
        }
    }

    if (isTask && taskmodalElement) {
        const spanElement = taskmodalElement.closest('.dropdown-menu-container').querySelector('.dropdown-toggle span');
        if (spanElement) {
            spanElement.textContent = displayText;
        }

        // Close dropdown in task modal context
        const dropdownMenu = taskmodalElement.closest('.dropdown-menu-container').querySelector(`.${field}-dropdown-menu`);
        if (dropdownMenu) {
            closeDropdown(dropdownMenu);
        }
    }

    // Save field value after selection
    const tempElement = { value: newValue, displayText: displayText };
    try {
        await saveField(tempElement, field, id, isTask);
        await initCalendar();

        // Update progress bar if the field is "status"
        if (field === 'status' && isTask) {
            const taskList = document.querySelectorAll(`#${projectDetailModalId}-task-list .task-item`);
            updateProgressBar(taskList);
        }
    } catch (error) {
        console.error('Error updating field:', error);
    }
}

// Close the dropdown menu
function closeDropdown(dropdownMenu) {
    if (dropdownMenu) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownMenu.closest('.dropdown-menu-container .dropdown-toggle'));
        if (dropdownInstance) {
            dropdownInstance.hide(); 
        } else {
            dropdownMenu.classList.remove('show'); 
        }
    }
}

async function saveField(element, field, id, isTask = false) {
    const value = element.value || element.getAttribute('value') || element.textContent;  // Handle both input and text content
    const displayText = element.displayText || value || element.textContent;  // Text to display in the UI
    
    const endpoint = isTask ? `/project/task/update/${id}/` : `/project/update/${id}/`;
    const csrftoken = getCookie('csrftoken');

    try {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ [field]: value })
        });
        const updatedData = await response.json();
        // Dynamic modal context based on whether it's a task or project
        const projectModalContext = document.getElementById('projectDetailModalKanban') ? 'projectDetailModalKanban' : 'projectDetailModalList';
        const taskModalContext = document.getElementById('taskDetailModalKanban') ? 'taskDetailModalKanban' : 'taskDetailModalList';
        const modalContext = isTask ? taskModalContext : projectModalContext;

        // Dynamic modal element selection based on context
        const modalElementId = `${modalContext}-${field}`;
        const modalElement = document.getElementById(modalElementId);

        const updateContent = (target_1) => {
            if (field === 'due_date') {
                const dateObj = value ? new Date(value) : null;
                const formattedDate = dateObj
                    ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'No Due Date';

                const span = target_1.querySelector('span');
                const icon = target_1.querySelector('i');

                if (span) {
                    span.textContent = formattedDate;
                }
                if (icon) {
                    icon.style.display = ''; // Ensure the icon remains visible
                }
            } else {
                const span_1 = target_1.querySelector('span');
                const icon_1 = target_1.querySelector('i');

                if (span_1) {
                    span_1.textContent = displayText;
                }
                if (icon_1) {
                    icon_1.style.display = ''; // Ensure the icon remains visible
                }
            }
        };

        // Update content in the modal itself
        if (modalElement) {
            updateContent(modalElement);
        } else {
            console.error(`Modal element with ID ${modalElementId} not found`);
        }

        // If it's a dropdown field (e.g., status, client, assignee), update the dropdown text
        const dropdownButton = document.querySelector(`#${projectModalContext}-${field}-${id} .dropdown-toggle span`);
        if (dropdownButton) {
            dropdownButton.textContent = displayText;
        }

        // Update content in the project row or task card if needed
        if (isTask) {
            const taskRowElement = document.querySelector(`#task-${field}-${id}`);
            const taskCard = document.querySelector(`.task-card[data-task-id="${id}"]`);

            if (taskRowElement) {
                const spanElement = taskRowElement.querySelector('span');
                if (spanElement) spanElement.textContent = displayText;

                const statusSpan = taskRowElement.querySelector('.dropdown-toggle span');
                if (statusSpan) statusSpan.textContent = displayText;
            }

            if (taskCard) {
                if (field === 'title') {
                    // Update title in the Kanban task card
                    taskCard.querySelector('p strong').textContent = displayText;
                } else if (field === 'status') {
                    moveTaskCard(id, displayText); // Move card if status changes in Kanban view
                }
            }

            if (field === 'title') {
                const titleElement = document.getElementById(`${taskModalContext}-title`);
                if (titleElement) {
                    // Retrieve the existing project link from the modal
                    const projectLinkElement = titleElement.querySelector('a');
                    const projectLinkHTML = projectLinkElement
                        ? projectLinkElement.outerHTML // Preserve the current project link
                        : `<a href="javascript:void(0);" onclick="showProjectDetail(${updatedData.project})" class="project-name-link">${updatedData.project_name || 'Unknown Project'}</a>`;

                    // Update the title while ensuring the project link is not duplicated
                    titleElement.innerHTML = `
                        ${projectLinkHTML} / 
                        <span ondblclick="editField(this, '${field}', ${id}, true)">${displayText}</span>
                        <i class="fa fa-edit edit-icon" title="Edit" onclick="editField(this.parentElement, 'description', ${id}, true)" title="Edit"></i>
                    `;
                }
            }
            updateTaskTableRow(id, updatedData, field);
            
        } else {
            // For project fields, update the project data in the table if needed
            const updatedProjectData = { [field]: displayText };
            updateProjectTableRow(id, updatedProjectData);
        }
    } catch (error) {
        console.error('Error updating field:', error);
        const targetElement = element.parentElement || element;
        if (targetElement) {
            targetElement.innerHTML = `<span>${element.value}</span>`;
        }
    }
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
        if (updatedData.description && row.querySelector(`#description-${projectId} span`)) {
            row.querySelector(`#description-${projectId} span`).textContent = updatedData.description;
        }
        if (updatedData.status && row.querySelector(`#status-${projectId} span`)) {
            row.querySelector(`#status-${projectId} span`).textContent = updatedData.status;
        }
        if (updatedData.client) {
            row.querySelector(`#client-${projectId} span`).textContent = updatedData.client;
            updateTaskClientFields(projectId, updatedData.client);  // Update tasks with new client name
        }
        if (updatedData.project_manager) row.querySelector(`#project_manager-${projectId} span`).textContent = updatedData.project_manager;
        if (updatedData.due_date && row.querySelector(`#due_date-${projectId} span`)) {
            const formattedDate = new Date(updatedData.due_date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            row.querySelector(`#due_date-${projectId} span`).textContent = formattedDate;
        }
    }
}

function updateTaskTableRow(taskId, updatedData, field) {
    const row = document.getElementById(`task-${taskId}`);

    // Helper function for date formatting
    const formatDate = (date) =>
        new Date(date).toLocaleString('default', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

    // Update the row in the table if it exists
    if (row) {
        const elementsToUpdate = {
            title: row.querySelector('.task-title'),
            description: row.querySelector(`#task-description-${taskId} span`),
            status: row.querySelector(`#task-status-${taskId} span`),
            assigned_to: row.querySelector(`#task-assigned_to-${taskId} span`),
            due_date: row.querySelector(`#task-due_date-${taskId} span`),
        };

        Object.keys(elementsToUpdate).forEach((key) => {
            if (field === key && updatedData[key] && elementsToUpdate[key]) {
                elementsToUpdate[key].textContent =
                    key === 'due_date' ? formatDate(updatedData[key]) : updatedData[key];
            }
        });

        // Handle creative_name specifically if available
        if (field === 'assigned_to' && updatedData.creative_name && elementsToUpdate.assigned_to) {
            elementsToUpdate.assigned_to.textContent = updatedData.creative_name;
        }
    }

    // Update the field in the task modal if it exists
    const taskDetailField = document.querySelector(`#${field}-detail`);
    if (taskDetailField) {
        taskDetailField.innerHTML =
            field === 'due_date'
                ? `<span>${formatDate(updatedData[field])}</span>`
                : `<span>${updatedData[field]}</span>`;
    }
}

// Function to show the delete confirmation modal
function showDeleteConfirmation(itemId, itemType, rowElement) {
    if (itemId && itemType && rowElement) {
        itemToDeleteId = itemId;
        itemTypeToDelete = itemType;
        itemRowElement = rowElement;

        // Dynamic message based on type
        const message =
            itemType === 'task'
                ? 'Are you sure you want to delete this task? This action cannot be undone.'
                : 'Are you sure you want to delete this project? This action cannot be undone.';

        document.getElementById('deleteConfirmationMessage').textContent = message;
        deleteModal.show(); // Show the modal
    } else {
        console.error("Invalid itemId, itemType, or rowElement passed to showDeleteConfirmation");
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
        }
    })
    .catch(error => {
        console.error("Error deleting task:", error);
    });
}

document.addEventListener('click', function (event) {
    if (event.target.classList.contains('delete-task-btn') || event.target.classList.contains('delete-project-btn')) {
        const itemId = event.target.getAttribute('data-id');
        const itemType = event.target.getAttribute('data-type');
        const rowElement = event.target.closest('tr') || event.target.closest('.col');
        if (rowElement) {
            // Show delete confirmation modal with the item information
            showDeleteConfirmation(itemId, itemType, rowElement);
        }
    }
});

document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (itemToDeleteId && itemTypeToDelete && itemRowElement) {
        if (itemTypeToDelete === 'task') {
            deleteTask(itemToDeleteId, itemRowElement);
        } else if (itemTypeToDelete === 'project') {
            deleteProject(itemToDeleteId, itemRowElement);
        } else {
            console.error("Unknown item type for deletion:", itemTypeToDelete);
        }
    } else {
        console.error("No item ID, type, or row element found for deletion");
    }
});

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

// View Toggle Functions
function saveViewPreference(view) {
    localStorage.setItem('projectsViewPreference', view);
}

// Load the user's view preference from local storage
function loadViewPreference() {
    return localStorage.getItem('projectsViewPreference') || 'table'; // Default to 'table'
}

// Apply the saved view preference
function applyViewPreference(view) {
    if (view === 'table') {
        // Only apply to pages that have table view
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        if (tableView && cardView) {
            tableView.classList.remove('d-none');
            cardView.classList.add('d-none');
        }
    } else if (view === 'card') {
        // Only apply to pages that have card view
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        if (tableView && cardView) {
            cardView.classList.remove('d-none');
            tableView.classList.add('d-none');
        }
    }

    // Highlight the active button only if the elements exist
    const cardViewButton = document.getElementById('cardViewButton');
    const tableViewButton = document.getElementById('tableViewButton');
    const kanbanViewButton = document.getElementById('kanbanViewButton');
    
    if (cardViewButton) {
        cardViewButton.classList.toggle('active', view === 'card');
    }
    if (tableViewButton) {
        tableViewButton.classList.toggle('active', view === 'table');
    }
    if (kanbanViewButton) {
        kanbanViewButton.classList.toggle('active', view === 'kanban');
    }
}

// Initialize view switching
function initializeViewSwitcher() {
    const savedView = loadViewPreference();
    applyViewPreference(savedView);

    // Event listeners for buttons
    document.getElementById('cardViewButton')?.addEventListener('click', function () {
        saveViewPreference('card');
        applyViewPreference('card');
    });

    document.getElementById('tableViewButton')?.addEventListener('click', function () {
        saveViewPreference('table');
        applyViewPreference('table');
    });

    document.getElementById('kanbanViewButton')?.addEventListener('click', function () {
        saveViewPreference('kanban');
        window.location.href = '/project/board/'; // Redirect to Kanban page
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeProjectStates(); 

    initializeViewSwitcher();

    const searchInput = document.getElementById('searchProject');

    // Trigger search on input change
    let debounceTimeout; 

    searchInput.addEventListener('input', function (e) {
        clearTimeout(debounceTimeout);
    
        // Prevent form submission on input
        e.preventDefault();
    
        debounceTimeout = setTimeout(function () {
            const query = searchInput.value.trim();
    
            if (query) {
                highlightAndExpandProjects(query); // Highlight and expand matches
            } else {
                resetHighlightsAndCollapse(); // Reset everything if query is cleared
            }
        }, 300); // Debounce duration
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

// Load projects and extract tasks from the API
const loadProjects = async () => {
    try {
        const response = await fetch('/project/all'); // Fetch projects from API
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const projects = await response.json(); // Parse JSON response

        // Extract tasks from each project
        const tasks = projects.flatMap(project =>
            project.tasks.map(task => ({
                id : task.id,
                name: task.title,
                description : task.description,
                status : task.status,
                project : task.project_name,
                assignee: task.creative_name,
                due_date: task.due_date,
            }))
        );

        return tasks;
    } catch (error) {
        console.error("Failed to load projects:", error);
        return [];
    }
};

let tasks = [];

// Helper function to calculate days in a month
const daysInMonth = (year, month) => {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
};

// Function to render the calendar
const renderCalendar = (month, year) => {
    const calendarGrid = document.querySelector('.calendar-grid');
    const calendarMonthYear = document.querySelector('#calendar-month-year');
    const totalDays = daysInMonth(year, month);

    // Clear previous grid
    calendarGrid.innerHTML = '';

    // Set the month and year display
    calendarMonthYear.innerText = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;

    // Create the grid with days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');
        dayCell.innerHTML = `<span>${day}</span>`;

        // Filter tasks for the current day
        const dayTasks = tasks.filter(task => {
            const taskDate = new Date(task.due_date);
            return (
                taskDate.getDate() === day &&
                taskDate.getMonth() === month &&
                taskDate.getFullYear() === year
            );
        });

        // Add task details to the calendar day
        if (dayTasks.length > 0) {
            const taskList = document.createElement('ul');
            dayTasks.forEach(task => {
                const taskItem = document.createElement('li');
                
                // Determine background color based on task.status
                let statusStyle = '';
                if (task.status === 'To Do') {
                    statusStyle = 'background: linear-gradient(90deg, #FF8C00, #FF6600); color: white; border-radius: 5px; padding: 4px 10px; font-weight: bold; font-size: 0.9rem;';
                } else if (task.status === 'In Progress') {
                    statusStyle = 'background: linear-gradient(90deg, #4682B4, #1E90FF); color: white; border-radius: 5px; padding: 4px 10px; font-weight: bold; font-size: 0.9rem;';
                } else if (task.status === 'Done') {
                    statusStyle = 'background: linear-gradient(90deg, #32CD32, #7CFC00); color: white; border-radius: 5px; padding: 4px 10px; font-weight: bold; font-size: 0.9rem;';
                }
                
                // Dynamically add task details with styled status
                taskItem.innerHTML = `
                    <span class="task-status" style="${statusStyle}">
                        ${task.status}
                    </span>
                    <br>
                    <span 
                        class="task-title" style="cursor: pointer; color: black;" 
                        onclick="showTaskDetail(${task.id});">
                        <strong>${task.name}</strong>
                    </span>
                    <br>${task.project}
                    <br>Assignee: ${task.assignee}`;
                
                taskList.appendChild(taskItem);
            });
            dayCell.appendChild(taskList);
        }
        

        calendarGrid.appendChild(dayCell);
    }
};

// Initialize calendar to the current month
const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Event listeners for navigation buttons
document.querySelector('.prev-month').addEventListener('click', () => {
    currentMonth -= 1;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
    }
    renderCalendar(currentMonth, currentYear);
});

document.querySelector('.next-month').addEventListener('click', () => {
    currentMonth += 1;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
    }
    renderCalendar(currentMonth, currentYear);
});

// Function to initialize and render the calendar
const initCalendar = async () => {
    tasks = await loadProjects(); // Load tasks
    renderCalendar(currentMonth, currentYear); // Render the calendar
};

// Render the calendar initially
initCalendar();


