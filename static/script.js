document.addEventListener('DOMContentLoaded', function() {
    // ========================
    // File Upload Functionality
    // ========================
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileNameDisplay = document.getElementById('file-name');
            if (fileNameDisplay) {
                fileNameDisplay.textContent = this.files[0] ? this.files[0].name : 'No file selected';
                fileNameDisplay.style.fontWeight = '500';
                
                // Show preview for PDF files
                if (this.files[0] && this.files[0].type === 'application/pdf') {
                    const previewText = document.getElementById('file-preview-text');
                    if (previewText) {
                        previewText.textContent = `Ready to convert: ${this.files[0].name}`;
                    }
                }
            }
        });
    }

    // =====================
    // Audio Player Controls
    // =====================
    const audioPreview = document.getElementById('audio-preview');
    if (audioPreview) {
        // Try autoplay but catch errors (browser restrictions)
        const playPromise = audioPreview.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Autoplay prevented:', e);
                // Show play button if autoplay fails
                const playBtn = document.querySelector('.play-btn');
                if (playBtn) {
                    playBtn.style.display = 'flex';
                }
            });
        }
        
        // Add event listeners for custom controls if needed
        audioPreview.addEventListener('play', function() {
            console.log('Audio started playing');
        });
        
        audioPreview.addEventListener('ended', function() {
            console.log('Audio finished playing');
        });
    }

    // =========================
    // Form Submission Feedback
    // =========================
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            const convertBtn = this.querySelector('.convert-btn');
            if (convertBtn) {
                convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
                convertBtn.disabled = true;
            }
            
            // Disable file input during upload
            const fileInput = this.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.disabled = true;
            }
        });
    }

    // ========================
    // Authentication Features
    // ========================
    
    // Password toggle functionality
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

    // Form validation feedback
    document.querySelectorAll('.auth-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('[type="submit"]');
            if (submitBtn) {
                const originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                submitBtn.disabled = true;
                
                // Re-enable button if form submission fails
                setTimeout(() => {
                    if (!this.checkValidity()) {
                        submitBtn.innerHTML = originalHtml;
                        submitBtn.disabled = false;
                    }
                }, 2000);
            }
            
            // Password match validation for register form
            if (this.id === 'register-form') {
                const password = this.querySelector('#password');
                const confirmPassword = this.querySelector('#confirm_password');
                
                if (password && confirmPassword && password.value !== confirmPassword.value) {
                    e.preventDefault();
                    showAlert('Passwords do not match', 'error');
                    
                    // Highlight mismatched passwords
                    password.style.borderColor = 'var(--error-color)';
                    confirmPassword.style.borderColor = 'var(--error-color)';
                    
                    // Reset button state
                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
                        submitBtn.disabled = false;
                    }
                }
            }
        });
    });

    // ======================
    // Dashboard Interactions
    // ======================
    document.querySelectorAll('.conversion-actions .btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            
            // Add loading state
            const icon = this.querySelector('i');
            if (icon) {
                const originalIcon = icon.className;
                icon.className = 'fas fa-spinner fa-spin';
                this.classList.add('disabled');
                
                // Reset after navigation or 3 seconds
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
    // Alert System
    // =====================
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <span class="close-btn">&times;</span>
        `;
        
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-remove alert after 5 seconds
        const removeAlert = () => {
            alertDiv.style.opacity = '0';
            setTimeout(() => alertDiv.remove(), 300);
        };
        
        setTimeout(removeAlert, 5000);
        
        // Close button functionality
        alertDiv.querySelector('.close-btn').addEventListener('click', removeAlert);
    }

    // Initialize any flash messages
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
    // Responsive Navigation
    // =====================
    const navToggle = document.getElementById('nav-toggle');
    const navbarNav = document.getElementById('navbar-nav');
    
    if (navToggle && navbarNav) {
        navToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navbarNav.classList.toggle('show');
        });
    }

    // ========================
    // Additional PDF Preview (Future Enhancement)
    // ========================
    /*
    // This would require PDF.js or similar library
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0] && this.files[0].type === 'application/pdf') {
                const file = this.files[0];
                const previewContainer = document.getElementById('pdf-preview');
                
                if (previewContainer) {
                    // Here you would implement PDF preview using PDF.js
                    console.log('PDF selected for preview:', file.name);
                }
            }
        });
    }
    */
});

// Helper function for future AJAX requests
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