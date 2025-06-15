// Wait for the entire page to load before running the code
document.addEventListener('DOMContentLoaded', function() {

    // ========================
    // FILE UPLOAD FUNCTIONALITY
    // ========================

    // Get the file input element
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            // When a file is selected, update the file name display
            const fileNameDisplay = document.getElementById('file-name');
            if (fileNameDisplay) {
                fileNameDisplay.textContent = this.files[0] ? this.files[0].name : 'No file selected';
                fileNameDisplay.style.fontWeight = '500';

                // If the file is a PDF, show a preview text
                if (this.files[0] && this.files[0].type === 'application/pdf') {
                    const previewText = document.getElementById('file-preview-text');
                    if (previewText) {
                        previewText.textContent = `Your file ${this.files[0].name} is ready for conversion`;
                    }
                }
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            // Prevent form submission if no file is selected
            const fileInput = this.querySelector('input[type="file"]');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                e.preventDefault();
                alert('Please select a PDF file to upload.');
                return;
            }

            // Show loading spinner and disable button to prevent multiple submissions
            const convertBtn = this.querySelector('.convert-btn');
            if (convertBtn) {
                convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
                convertBtn.disabled = true;
            }
        });
    }

    // =====================
    // AUDIO PLAYER CONTROLS
    // =====================

    // Try to autoplay audio if it exists
    const audioPreview = document.getElementById('audio-preview');
    if (audioPreview) {
        const playPromise = audioPreview.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                // If autoplay is blocked, show a play button
                console.log('Autoplay prevented:', e);
                const playBtn = document.querySelector('.play-btn');
                if (playBtn) {
                    playBtn.style.display = 'flex';
                }
            });
        }

        // Log when audio starts or ends
        audioPreview.addEventListener('play', () => console.log('Audio started playing'));
        audioPreview.addEventListener('ended', () => console.log('Audio finished playing'));
    }

    // ========================
    // AUTHENTICATION FEATURES
    // ========================

    // Toggle password visibility
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const inputId = this.getAttribute('data-target') || 
                          this.parentElement.querySelector('input').id;
            const input = document.getElementById(inputId);

            if (input) {
                if (input.type === "password") {
                    input.type = "text";
                    this.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = "password";
                    this.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    // Handle form submission for login/register forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('[type="submit"]');
            if (submitBtn) {
                // Show loading spinner when form is submitted
                const originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                submitBtn.disabled = true;

                // If form is invalid, reset button after 2 seconds
                setTimeout(() => {
                    if (!this.checkValidity()) {
                        submitBtn.innerHTML = originalHtml;
                        submitBtn.disabled = false;
                    }
                }, 2000);
            }

            // For register forms, check that passwords match
            if (this.id === 'register-form') {
                const password = this.querySelector('#password');
                const confirmPassword = this.querySelector('#confirm_password');

                if (password && confirmPassword && password.value !== confirmPassword.value) {
                    e.preventDefault();  // Stop form from submitting
                    showAlert('Passwords do not match', 'error');

                    // Highlight password fields in red
                    password.style.borderColor = 'var(--error-color)';
                    confirmPassword.style.borderColor = 'var(--error-color)';

                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
                        submitBtn.disabled = false;
                    }
                }
            }
        });
    });

    // ======================
    // DASHBOARD BUTTONS
    // ======================

    // Add loading effect to conversion buttons
    document.querySelectorAll('.conversion-actions .btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }

            const icon = this.querySelector('i');
            if (icon) {
                const originalIcon = icon.className;
                icon.className = 'fas fa-spinner fa-spin';
                this.classList.add('disabled');

                // Reset button icon after 3 seconds (or page navigation)
                setTimeout(() => {
                    if (this.classList.contains('disabled')) {
                        icon.className = originalIcon;
                        this.classList.remove('disabled');
                    }
                }, 3000);
            }
        });
    });

    // =====================
    // ALERT SYSTEM
    // =====================

    // Function to show alerts at the top of the page
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <span class="close-btn">&times;</span>
        `;

        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);

        const removeAlert = () => {
            alertDiv.style.opacity = '0';
            setTimeout(() => alertDiv.remove(), 300);
        };

        setTimeout(removeAlert, 5000);

        alertDiv.querySelector('.close-btn').addEventListener('click', removeAlert);
    }

    // Automatically remove any existing alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);

        alert.querySelector('.close-btn').addEventListener('click', function() {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        });
    });

    // =====================
    // RESPONSIVE NAVIGATION
    // =====================

    // Handle mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const navbarNav = document.getElementById('navbar-nav');

    if (navToggle && navbarNav) {
        navToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navbarNav.classList.toggle('show');
        });
    }
});

// ========================
// HELPER FUNCTION FOR AJAX
// ========================

// This function can be used to make API requests
function makeRequest(url, method = 'GET', data = null) {
    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : null
    })
    .then(response => response.json())
    .catch(error => {
        console.error('Request failed:', error);
        throw error;
    });
}
