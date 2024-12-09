
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

// Toggle dropdown menu visibility
function toggleDropdownMenu(button) {
    const dropdownMenu = button.nextElementSibling;
    dropdownMenu.classList.toggle('show');
}

// Select an option from the dropdown
async function selectOption(field, id, newValue, displayText, isTask) {
    // Locate the specific row and field to update
    const taskRowElement = document.querySelector(`#task-${id}`);
    const dropdownContainer = taskRowElement.querySelector(`#task-${field}-${id}`);
    
    if (dropdownContainer) {
        // Update the visible text in the dropdown toggle button
        const spanElement = dropdownContainer.querySelector('.dropdown-toggle span');
        if (spanElement) {
            spanElement.textContent = displayText;
        }

        // Close the dropdown menu
        const dropdownMenu = dropdownContainer.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            closeDropdown(dropdownMenu);
        }
    }

    try {
        // Save the updated status to the backend
        const tempElement = { value: newValue, displayText: displayText };
        await saveField(tempElement, field, id, isTask);

        console.log(`Field "${field}" for Task ID ${id} updated to "${newValue}" successfully.`);
    } catch (error) {
        console.error('Error updating field:', error);
    }
}

// Close the dropdown menu
function closeDropdown(dropdownMenu) {
    if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
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
