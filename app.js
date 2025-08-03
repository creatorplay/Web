// Camva Pro CRM Dashboard JavaScript

// Supabase Configuration
const SUPABASE_URL = 'https://wpwdzccyvfupcjrwtaqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd2R6Y2N5dmZ1cGNqcnd0YXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNDE1MjUsImV4cCI6MjA2OTYxNzUyNX0.N8n1p9IrvLFODHs_pSCROSB3yzKHtqWSGL9SZkrs6v8';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Plan Configuration
const PLANS = {
    monthly: { name: 'Monthly', price: 49, duration: 30 },
    quarterly: { name: 'Quarterly', price: 99, duration: 90 },
    annual: { name: 'Annual', price: 299, duration: 365 }
};

// Message Templates
const MESSAGE_TEMPLATES = {
    welcome: "🎉 Welcome to Camva Pro, {name}! Your {plan} subscription is now active. ✅ Plan: {plan} 📅 Valid Until: {expiry} 💰 Full access to premium features. Contact: +91 6387617678",
    renewal: "✅ Subscription Renewed! Hi {name}, your Camva Pro subscription has been renewed. 🔄 New Plan: {plan} 📅 Valid Until: {expiry} Thank you for staying with Camva Pro! Contact: +91 6387617678",
    reminder: "⏰ Subscription Reminder - {name}. Your Canva Pro {plan} subscription expires in {days} days. 📅 Expiry: {expiry} Renew now to avoid interruption! Contact: +91 6387617678"
};

// Global State
let customers = [];
let filteredCustomers = [];

// DOM Elements
const customersGrid = document.getElementById('customersGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const teamFilter = document.getElementById('teamFilter');
const planFilter = document.getElementById('planFilter');
const statusFilter = document.getElementById('statusFilter');

// Statistics Elements
const totalCustomersEl = document.getElementById('totalCustomers');
const activeSubscriptionsEl = document.getElementById('activeSubscriptions');
const expiringThisWeekEl = document.getElementById('expiringThisWeek');
const totalRevenueEl = document.getElementById('totalRevenue');

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    await loadCustomers();
    setupEventListeners();
    setupFormHandlers();
});

// Setup Event Listeners
function setupEventListeners() {
    // Header buttons
    document.getElementById('addCustomerBtn').addEventListener('click', () => openModal('addCustomerModal'));
    document.getElementById('importCustomerBtn').addEventListener('click', () => openModal('importCustomerModal'));
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('viewExpiringBtn').addEventListener('click', showExpiringCustomers);

    // Search and filters
    searchInput.addEventListener('input', debounce(filterCustomers, 300));
    teamFilter.addEventListener('change', filterCustomers);
    planFilter.addEventListener('change', filterCustomers);
    statusFilter.addEventListener('change', filterCustomers);

    // Plan selection auto-fill payment
    const planSelect = document.getElementById('planSelect');
    if (planSelect) {
        planSelect.addEventListener('change', (e) => {
            const plan = e.target.value;
            const paymentInput = document.getElementById('paymentAmount');
            if (plan && PLANS[plan] && paymentInput) {
                paymentInput.value = PLANS[plan].price;
            }
        });
    }

    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

// Setup Form Handlers
function setupFormHandlers() {
    // Add Customer Form
    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const customerData = Object.fromEntries(formData.entries());
            
            // Calculate dates
            const joinedDate = new Date();
            const plan = PLANS[customerData.plan];
            const expiryDate = new Date(joinedDate);
            expiryDate.setDate(expiryDate.getDate() + plan.duration);
            const reminderDate = new Date(expiryDate);
            reminderDate.setDate(reminderDate.getDate() - 3);

            customerData.joined = joinedDate.toISOString().split('T')[0];
            customerData.reminder = reminderDate.toISOString().split('T')[0];
            customerData.expired = expiryDate.toISOString().split('T')[0];
            customerData.total_payment = parseFloat(customerData.payment);

            await addCustomer(customerData);
        });
    }

    // Import Customer Form
    const importCustomerForm = document.getElementById('importCustomerForm');
    if (importCustomerForm) {
        importCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const customerData = Object.fromEntries(formData.entries());
            customerData.total_payment = parseFloat(customerData.payment);
            await addCustomer(customerData);
        });
    }

    // Edit Customer Form
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const customerData = Object.fromEntries(formData.entries());
            const customerId = customerData.id;
            delete customerData.id;
            
            customerData.total_payment = parseFloat(customerData.payment);
            await updateCustomer(customerId, customerData);
        });
    }
}

// Load All Customers
async function loadCustomers() {
    try {
        showLoading(true);
        
        // Try to load customers from Supabase
        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            // Initialize with sample data if Supabase fails
            initializeSampleData();
        } else {
            customers = data || [];
        }

        filteredCustomers = [...customers];
        renderCustomers();
        updateStatistics();
        showLoading(false);
    } catch (error) {
        console.error('Error loading customers:', error);
        // Initialize with sample data as fallback
        initializeSampleData();
        showLoading(false);
    }
}

// Initialize with sample data for demo purposes
function initializeSampleData() {
    const today = new Date();
    const sampleCustomers = [
        {
            id: 'sample-1',
            name: 'Rajesh Kumar',
            email: 'rajesh@example.com',
            phone: '+919876543210',
            team: 'Team 1',
            plan: 'monthly',
            payment: 49,
            joined: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminder: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expired: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_payment: 49,
            additional_notes: 'Good customer'
        },
        {
            id: 'sample-2',
            name: 'Priya Sharma',
            email: 'priya@example.com',
            phone: '+919876543211',
            team: 'Team 2',
            plan: 'quarterly',
            payment: 99,
            joined: new Date(today.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminder: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expired: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_payment: 99,
            additional_notes: 'Expiring soon'
        },
        {
            id: 'sample-3',
            name: 'Amit Patel',
            email: 'amit@example.com',
            phone: '+919876543212',
            team: 'Team 3',
            plan: 'annual',
            payment: 299,
            joined: new Date(today.getTime() - 350 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminder: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expired: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_payment: 299,
            additional_notes: 'Expired customer'
        }
    ];
    
    customers = sampleCustomers;
    filteredCustomers = [...customers];
    renderCustomers();
    updateStatistics();
    showToast('Demo data loaded. Add real customers to get started!', 'info');
}

// Add New Customer
async function addCustomer(customerData) {
    try {
        // Try Supabase first
        const { data, error } = await supabaseClient
            .from('customers')
            .insert([customerData])
            .select();

        if (error) {
            // Fallback to local storage
            const newCustomer = {
                ...customerData,
                id: 'local-' + Date.now(),
                timestamp: new Date().toISOString()
            };
            customers.unshift(newCustomer);
        } else {
            customers.unshift(data[0]);
        }

        filterCustomers();
        updateStatistics();
        closeModal('addCustomerModal');
        closeModal('importCustomerModal');
        showToast('Customer added successfully!', 'success');
        
        // Clear forms
        document.getElementById('addCustomerForm').reset();
        document.getElementById('importCustomerForm').reset();
    } catch (error) {
        console.error('Error adding customer:', error);
        
        // Fallback: add to local array
        const newCustomer = {
            ...customerData,
            id: 'local-' + Date.now(),
            timestamp: new Date().toISOString()
        };
        customers.unshift(newCustomer);
        filterCustomers();
        updateStatistics();
        closeModal('addCustomerModal');
        closeModal('importCustomerModal');
        showToast('Customer added locally (Supabase unavailable)', 'warning');
        
        // Clear forms
        const addForm = document.getElementById('addCustomerForm');
        const importForm = document.getElementById('importCustomerForm');
        if (addForm) addForm.reset();
        if (importForm) importForm.reset();
    }
}

// Update Customer
async function updateCustomer(customerId, customerData) {
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .update(customerData)
            .eq('id', customerId)
            .select();

        if (error) throw error;

        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex] = { ...customers[customerIndex], ...data[0] };
        }

        filterCustomers();
        updateStatistics();
        closeModal('editCustomerModal');
        showToast('Customer updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating customer:', error);
        
        // Fallback: update in local array
        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex] = { ...customers[customerIndex], ...customerData };
            filterCustomers();
            updateStatistics();
            closeModal('editCustomerModal');
            showToast('Customer updated locally (Supabase unavailable)', 'warning');
        } else {
            showToast('Error updating customer', 'error');
        }
    }
}

// Delete Customer
async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        const { error } = await supabaseClient
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) throw error;

        customers = customers.filter(c => c.id !== customerId);
        filterCustomers();
        updateStatistics();
        showToast('Customer deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting customer:', error);
        
        // Fallback: remove from local array
        customers = customers.filter(c => c.id !== customerId);
        filterCustomers();
        updateStatistics();
        showToast('Customer deleted locally (Supabase unavailable)', 'warning');
    }
}

// Filter Customers
function filterCustomers() {
    const searchTerm = searchInput.value.toLowerCase();
    const teamValue = teamFilter.value;
    const planValue = planFilter.value;
    const statusValue = statusFilter.value;

    filteredCustomers = customers.filter(customer => {
        const matchesSearch = !searchTerm || 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            customer.phone.includes(searchTerm);

        const matchesTeam = !teamValue || customer.team === teamValue;
        const matchesPlan = !planValue || customer.plan === planValue;
        
        let matchesStatus = true;
        if (statusValue) {
            const status = getCustomerStatus(customer);
            matchesStatus = status.toLowerCase() === statusValue;
        }

        return matchesSearch && matchesTeam && matchesPlan && matchesStatus;
    });

    renderCustomers();
}

// Render Customers
function renderCustomers() {
    if (filteredCustomers.length === 0) {
        customersGrid.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }

    customersGrid.style.display = 'grid';
    emptyState.classList.add('hidden');

    customersGrid.innerHTML = filteredCustomers.map(customer => createCustomerCard(customer)).join('');
}

// Create Customer Card HTML
function createCustomerCard(customer) {
    const status = getCustomerStatus(customer);
    const statusClass = `customer-status--${status.toLowerCase()}`;
    const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const expiryDate = new Date(customer.expired);
    const formattedExpiry = expiryDate.toLocaleDateString('en-IN');
    const planInfo = PLANS[customer.plan];

    return `
        <div class="customer-card">
            <div class="customer-header">
                <div class="customer-avatar">${initials}</div>
                <div class="customer-info">
                    <h3>${customer.name}</h3>
                    <p>${customer.email}</p>
                </div>
            </div>
            <div class="customer-body">
                <div class="customer-details">
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${customer.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Team:</span>
                        <span class="detail-value">${customer.team}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Plan:</span>
                        <span class="detail-value">${planInfo?.name || customer.plan} - ₹${customer.payment}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Expiry:</span>
                        <span class="detail-value">${formattedExpiry}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="customer-status ${statusClass}">
                            <i class="fas fa-circle"></i>
                            ${status}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total Paid:</span>
                        <span class="detail-value">₹${customer.total_payment || customer.payment}</span>
                    </div>
                </div>
                <div class="customer-actions">
                    <button class="btn btn--outline" onclick="editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn--outline" onclick="sendWhatsApp('${customer.id}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="btn btn--outline" onclick="sendEmail('${customer.id}')">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                    <button class="btn btn--primary" onclick="renewCustomer('${customer.id}')">
                        <i class="fas fa-sync-alt"></i> Renew
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get Customer Status
function getCustomerStatus(customer) {
    const today = new Date();
    const expiryDate = new Date(customer.expired);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 7) return 'Expiring';
    return 'Active';
}

// Update Statistics
function updateStatistics() {
    const total = customers.length;
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let active = 0;
    let expiring = 0;
    let totalRevenue = 0;

    customers.forEach(customer => {
        const expiryDate = new Date(customer.expired);
        totalRevenue += parseFloat(customer.total_payment || customer.payment || 0);
        
        if (expiryDate >= today) {
            active++;
            if (expiryDate <= weekFromNow) {
                expiring++;
            }
        }
    });

    totalCustomersEl.textContent = total;
    activeSubscriptionsEl.textContent = active;
    expiringThisWeekEl.textContent = expiring;
    totalRevenueEl.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
}

// Edit Customer
function editCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const form = document.getElementById('editCustomerForm');
    
    // Fill form with customer data
    form.querySelector('input[name="id"]').value = customer.id;
    form.querySelector('input[name="name"]').value = customer.name;
    form.querySelector('input[name="email"]').value = customer.email;
    form.querySelector('input[name="phone"]').value = customer.phone;
    form.querySelector('select[name="team"]').value = customer.team;
    form.querySelector('select[name="plan"]').value = customer.plan;
    form.querySelector('input[name="payment"]').value = customer.payment;
    form.querySelector('textarea[name="additional_notes"]').value = customer.additional_notes || '';

    openModal('editCustomerModal');
}

// Renew Customer
function renewCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Pre-fill add customer form with existing data for renewal
    const form = document.getElementById('addCustomerForm');
    form.querySelector('input[name="name"]').value = customer.name;
    form.querySelector('input[name="email"]').value = customer.email;
    form.querySelector('input[name="phone"]').value = customer.phone;
    form.querySelector('select[name="team"]').value = customer.team;
    form.querySelector('select[name="plan"]').value = customer.plan;
    form.querySelector('input[name="payment"]').value = customer.payment;

    openModal('addCustomerModal');
}

// Send WhatsApp Message
function sendWhatsApp(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const status = getCustomerStatus(customer);
    let template = MESSAGE_TEMPLATES.welcome;
    
    if (status === 'Expiring') {
        template = MESSAGE_TEMPLATES.reminder;
    }

    const expiryDate = new Date(customer.expired);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    const message = template
        .replace(/{name}/g, customer.name)
        .replace(/{plan}/g, PLANS[customer.plan]?.name || customer.plan)
        .replace(/{expiry}/g, expiryDate.toLocaleDateString('en-IN'))
        .replace(/{days}/g, diffDays);

    const phoneNumber = customer.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
}

// Send Email
function sendEmail(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const status = getCustomerStatus(customer);
    let subject = 'Welcome to Camva Pro!';
    let template = MESSAGE_TEMPLATES.welcome;
    
    if (status === 'Expiring') {
        subject = 'Subscription Reminder - Camva Pro';
        template = MESSAGE_TEMPLATES.reminder;
    }

    const expiryDate = new Date(customer.expired);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 1000));
    
    const body = template
        .replace(/{name}/g, customer.name)
        .replace(/{plan}/g, PLANS[customer.plan]?.name || customer.plan)
        .replace(/{expiry}/g, expiryDate.toLocaleDateString('en-IN'))
        .replace(/{days}/g, diffDays);

    const mailtoUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

// Show Expiring Customers
function showExpiringCustomers() {
    statusFilter.value = 'expiring';
    filterCustomers();
    showToast('Showing customers expiring within 7 days', 'info');
}

// Export to CSV
function exportToCSV() {
    if (customers.length === 0) {
        showToast('No customers to export', 'warning');
        return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Team', 'Plan', 'Payment', 'Joined', 'Expiry', 'Status', 'Total Payment'];
    const csvContent = [
        headers.join(','),
        ...customers.map(customer => {
            const status = getCustomerStatus(customer);
            return [
                `"${customer.name}"`,
                `"${customer.email}"`,
                `"${customer.phone}"`,
                `"${customer.team}"`,
                `"${PLANS[customer.plan]?.name || customer.plan}"`,
                customer.payment,
                customer.joined,
                customer.expired,
                status,
                customer.total_payment || customer.payment
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `camva-pro-customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Customer data exported successfully!', 'success');
}

// Refresh Data
async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('spinning');
    await loadCustomers();
    
    setTimeout(() => {
        icon.classList.remove('spinning');
    }, 1000);
    
    showToast('Data refreshed successfully!', 'success');
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Clear forms
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

// Show/Hide Loading State
function showLoading(show) {
    if (show) {
        loadingState.style.display = 'flex';
        customersGrid.style.display = 'none';
        emptyState.classList.add('hidden');
    } else {
        loadingState.style.display = 'none';
    }
}

// Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.id = toastId;
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="removeToast('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        removeToast(toastId);
    }, duration);
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for HTML onclick events
window.openModal = openModal;
window.closeModal = closeModal;
window.editCustomer = editCustomer;
window.renewCustomer = renewCustomer;
window.sendWhatsApp = sendWhatsApp;
window.sendEmail = sendEmail;
window.removeToast = removeToast;
window.openAddCustomerModal = () => openModal('addCustomerModal');
window.deleteCustomer = deleteCustomer;