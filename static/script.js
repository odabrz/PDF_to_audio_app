document.addEventListener('DOMContentLoaded', function() {
    // Update file name display when file is selected
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'Choose a PDF file';
            document.getElementById('file-name').textContent = fileName;
        });
    }

    // Audio player controls
    const audioPreview = document.getElementById('audio-preview');
    if (audioPreview) {
        // Autoplay the audio when the page loads (if conversion was successful)
        audioPreview.play().catch(e => console.log('Autoplay prevented:', e));
    }

    // Form submission feedback
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            const convertBtn = this.querySelector('.convert-btn');
            if (convertBtn) {
                convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
                convertBtn.disabled = true;
            }
        });
    }
});