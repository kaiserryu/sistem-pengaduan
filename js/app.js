// Configuration
const CONFIG = {
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbwJUBtbpucSJs7WS-66oQgbkeqhnfwg1SfzTQizt-Xkx5qh-Sn8u0zRVSSl6plAQtIW/exec',
    // Jika menggunakan web app URL yang berbeda, ganti di atas
};

// Global variables
let uploadedFiles = [];

// Utility Functions
function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('result') || document.getElementById('errorMessage');
    if (alertDiv) {
        alertDiv.className = `alert alert-${type} mt-4`;
        alertDiv.innerHTML = message;
        alertDiv.classList.remove('d-none');
        
        // Auto hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertDiv.classList.add('d-none');
            }, 5000);
        }
    }
}

function showLoading(show = true) {
    const loading = document.getElementById('loading');
    const submitBtn = document.getElementById('submitBtn');
    
    if (loading) {
        loading.classList.toggle('d-none', !show);
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
        submitBtn.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin"></i> Memproses...' : 
            '<i class="fas fa-paper-plane"></i> Kirim Pengaduan';
    }
}

// File Upload Functions
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');

    if (!fileInput || !fileUploadArea) return;

    fileUploadArea.addEventListener('click', () => fileInput.click());
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!fileUploadArea.contains(e.relatedTarget)) {
            fileUploadArea.classList.remove('dragover');
        }
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });
}

function handleFiles(files) {
    const fileArray = Array.from(files);
    let hasNewFiles = false;
    
    fileArray.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            showAlert('File ' + file.name + ' terlalu besar! Maksimal 5MB.', 'danger');
            return;
        }
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'zip', 'rar'];
        
        if (!allowedExtensions.includes(fileExtension)) {
            showAlert('File ' + file.name + ' tidak didukung!', 'danger');
            return;
        }
        
        const isDuplicate = uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (!isDuplicate) {
            uploadedFiles.push(file);
            hasNewFiles = true;
        }
    });
    
    if (hasNewFiles) {
        updateFileList();
    }
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
        fileList.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-folder-open"></i><br>
                Belum ada file yang diupload
            </div>
        `;
        return;
    }
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${file.name}</strong><br>
                    <small class="text-muted">${formatFileSize(file.size)}</small>
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Form Functions
function clearForm() {
    const form = document.getElementById('complaintForm');
    if (form) {
        form.reset();
        uploadedFiles = [];
        updateFileList();
        
        // Set default waktu kejadian ke sekarang
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const waktuKejadian = document.getElementById('waktu_kejadian');
        if (waktuKejadian) {
            waktuKejadian.value = now.toISOString().slice(0, 16);
        }
        
        showAlert('Form telah direset.', 'info');
    }
}

async function submitComplaint() {
    const form = document.getElementById('complaintForm');
    if (!form) return;
    
    // Validasi form
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        showAlert('Harap isi semua field yang wajib!', 'danger');
        return;
    }
    
    // Collect form data
    const formData = new FormData();
    const formElements = form.elements;
    
    for (let element of formElements) {
        if (element.name && element.value) {
            formData.append(element.name, element.value);
        }
    }
    
    // Add file info
    formData.append('file_count', uploadedFiles.length.toString());
    formData.append('file_names', uploadedFiles.map(file => file.name).join(', '));
    
    showLoading(true);
    
    try {
        // Kirim data ke Google Apps Script
        const response = await fetch(CONFIG.API_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`
                <h4><i class="fas fa-check-circle"></i> Pengaduan Berhasil Dikirim!</h4>
                <p><strong>Nomor Tiket:</strong> ${result.ticketId}</p>
                <p>${result.message}</p>
                <p>Simpan nomor tiket ini untuk melacak status pengaduan Anda.</p>
            `, 'success');
            
            // Clear form on success
            clearForm();
        } else {
            showAlert(`
                <h4><i class="fas fa-exclamation-triangle"></i> Gagal Mengirim Pengaduan</h4>
                <p>${result.error || 'Terjadi kesalahan tidak diketahui'}</p>
            `, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(`
            <h4><i class="fas fa-exclamation-triangle"></i> Error Sistem</h4>
            <p>Terjadi kesalahan saat mengirim pengaduan. Silakan coba lagi.</p>
            <small>${error.message}</small>
        `, 'danger');
    } finally {
        showLoading(false);
    }
}

// Status Check Functions
async function checkStatus() {
    const ticketId = document.getElementById('ticketId').value.trim();
    
    if (!ticketId) {
        showAlert('Harap masukkan nomor tiket!', 'danger');
        return;
    }
    
    const loading = document.getElementById('loading');
    const statusResult = document.getElementById('statusResult');
    const errorMessage = document.getElementById('errorMessage');
    
    // Show loading
    loading.classList.remove('d-none');
    statusResult.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    try {
        // Simulasi request - ganti dengan API call sebenarnya
        const response = await fetch(`${CONFIG.API_BASE_URL}?action=status&ticketId=${ticketId}`);
        const result = await response.json();
        
        if (result.success) {
            displayStatusResult(result.data);
            statusResult.classList.remove('d-none');
        } else {
            throw new Error(result.error || 'Tiket tidak ditemukan');
        }
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('d-none');
    } finally {
        loading.classList.add('d-none');
    }
}

function displayStatusResult(data) {
    // Update basic info
    document.getElementById('resultTicketId').textContent = data.ticketId;
    document.getElementById('resultStatus').textContent = data.status;
    document.getElementById('resultDate').textContent = formatDate(data.timestamp);
    document.getElementById('resultReporter').textContent = data.nama;
    document.getElementById('resultIncident').textContent = data.kejadian;
    document.getElementById('resultLocation').textContent = data.tempat_kejadian;
    
    // Update timeline
    const timeline = document.getElementById('statusTimeline');
    timeline.innerHTML = createTimeline(data);
    
    // Update officer info if available
    if (data.petugas) {
        document.getElementById('officerSection').classList.remove('d-none');
        document.getElementById('officerName').textContent = data.petugas;
        document.getElementById('lastResponse').textContent = formatDate(data.tanggalRespon);
        document.getElementById('officerNotes').textContent = data.keterangan || '-';
    }
}

function createTimeline(data) {
    const statuses = [
        { status: 'Baru', icon: 'fa-file', description: 'Pengaduan diterima' },
        { status: 'Dalam Proses', icon: 'fa-cog', description: 'Sedang diproses' },
        { status: 'Selesai', icon: 'fa-check', description: 'Pengaduan selesai' },
        { status: 'Ditolak', icon: 'fa-times', description: 'Pengaduan ditolak' }
    ];
    
    let currentStatusIndex = statuses.findIndex(s => s.status === data.status);
    if (currentStatusIndex === -1) currentStatusIndex = 0;
    
    return statuses.map((step, index) => `
        <div class="status-step ${index <= currentStatusIndex ? 'step-completed' : ''}">
            <div class="step-icon">
                <i class="fas ${step.icon}"></i>
            </div>
            <div class="ms-3">
                <h6 class="mb-1">${step.status}</h6>
                <p class="mb-0 text-muted">${step.description}</p>
                ${index === currentStatusIndex && data.tanggalUpdate ? `
                    <small class="text-muted">${formatDate(data.tanggalUpdate)}</small>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}?action=stats`);
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
            updateCharts(result.data);
            updateRecentComplaints(result.recentComplaints);
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('id-ID');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(stats) {
    const elements = {
        'statTotal': stats.total,
        'statToday': stats.today,
        'statProgress': stats.inProgress,
        'statCompleted': stats.completed
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

function updateCharts(data) {
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Baru', 'Dalam Proses', 'Selesai', 'Ditolak'],
                datasets: [{
                    data: [data.statusNew || 0, data.inProgress, data.completed, data.rejected || 0],
                    backgroundColor: ['#17a2b8', '#ffc107', '#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Incident Type Chart
    const incidentCtx = document.getElementById('incidentChart');
    if (incidentCtx) {
        new Chart(incidentCtx, {
            type: 'bar',
            data: {
                labels: data.incidentTypes?.labels || ['Lingkungan', 'Infrastruktur', 'Keamanan'],
                datasets: [{
                    label: 'Jumlah Pengaduan',
                    data: data.incidentTypes?.data || [10, 15, 8],
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function updateRecentComplaints(complaints) {
    const container = document.getElementById('recentComplaintsList');
    if (!container) return;
    
    if (!complaints || complaints.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Tidak ada data pengaduan</p>';
        return;
    }
    
    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-item">
            <div class="row align-items-center">
                <div class="col-md-3">
                    <strong>${complaint.ticketId}</strong>
                    <div class="text-muted small">${complaint.nama}</div>
                </div>
                <div class="col-md-4">
                    ${complaint.kejadian}
                </div>
                <div class="col-md-2">
                    <span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '')}">
                        ${complaint.status}
                    </span>
                </div>
                <div class="col-md-3 text-end text-muted small">
                    ${formatDate(complaint.timestamp)}
                </div>
            </div>
        </div>
    `).join('');
}

// Homepage Functions
async function loadStatistics() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}?action=stats`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalComplaints').textContent = result.data.total;
            document.getElementById('completedComplaints').textContent = result.data.completed;
            document.getElementById('progressComplaints').textContent = result.data.inProgress;
            document.getElementById('todayComplaints').textContent = result.data.today;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadRecentComplaints() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}?action=recent`);
        const result = await response.json();
        
        const container = document.getElementById('recentComplaints');
        if (!container) return;
        
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(complaint => `
                <div class="list-group-item">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <strong class="text-primary">${complaint.ticketId}</strong>
                            <div class="small">${complaint.nama}</div>
                        </div>
                        <div class="col-md-5">
                            ${complaint.kejadian}
                        </div>
                        <div class="col-md-2">
                            <span class="badge ${getStatusBadgeClass(complaint.status)}">
                                ${complaint.status}
                            </span>
                        </div>
                        <div class="col-md-2 text-muted small">
                            ${complaint.timestamp}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-center text-muted py-4">Belum ada pengaduan terbaru</p>';
        }
    } catch (error) {
        console.error('Error loading recent complaints:', error);
        container.innerHTML = '<p class="text-center text-danger py-4">Gagal memuat data</p>';
    }
}

function getStatusBadgeClass(status) {
    const classes = {
        'Baru': 'bg-info',
        'Dalam Proses': 'bg-warning',
        'Selesai': 'bg-success',
        'Ditolak': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Auto-initialize file upload if on complaint page
    if (document.getElementById('fileUploadArea')) {
        setupFileUpload();
    }
});