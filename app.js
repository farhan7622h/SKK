/* ==========================================================================
   ShiftTrack - Application Logic & State Management (Monthly Matrix)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const STORAGE_KEY = 'shift_track_roster_data';

    let state = {
        tokens: [],            // Array of { id, tokenNo, date, shift, markedAt, selected }
        selectedDate: getTodayDateString(),
        selectedMine: 'Balaria',
        activeFilter: 'ALL',   // 'ALL', 'A', 'B', 'C', 'OFF'
        searchQuery: ''
    };

    // --- DOM Elements ---
    const shiftDateInput = document.getElementById('shiftDate');
    const mineSelectEl = document.getElementById('mineSelect');
    const demoDataBtn = document.getElementById('demoDataBtn');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // Stats Elements
    const statTotalEl = document.getElementById('statTotal');
    const statShiftAEl = document.getElementById('statShiftA');
    const statShiftBEl = document.getElementById('statShiftB');
    const statShiftCEl = document.getElementById('statShiftC');
    const statShiftOffEl = document.getElementById('statShiftOff');

    // Input Form Elements
    const tabBulkBtn = document.getElementById('tabBulkBtn');
    const tabSingleBtn = document.getElementById('tabSingleBtn');
    const bulkAddPanel = document.getElementById('bulkAddPanel');
    const singleAddPanel = document.getElementById('singleAddPanel');

    const bulkTokensInput = document.getElementById('bulkTokensInput');
    const bulkDefaultShift = document.getElementById('bulkDefaultShift');
    const addBulkBtn = document.getElementById('addBulkBtn');

    const singleTokenInput = document.getElementById('singleTokenInput');
    const singleShiftSelect = document.getElementById('singleShiftSelect');
    const addSingleBtn = document.getElementById('addSingleBtn');

    // Toolbar & Table Elements
    const searchInput = document.getElementById('searchInput');
    const filterPills = document.getElementById('filterPills');
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCountText = document.getElementById('selectedCountText');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    const bulkShiftABtn = document.getElementById('bulkShiftABtn');
    const bulkShiftBBtn = document.getElementById('bulkShiftBBtn');
    const bulkShiftCBtn = document.getElementById('bulkShiftCBtn');
    const bulkShiftOffBtn = document.getElementById('bulkShiftOffBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    const rosterTbody = document.getElementById('rosterTbody');
    const emptyState = document.getElementById('emptyState');
    const showingRecordsText = document.getElementById('showingRecordsText');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // --- Initialization ---
    function init() {
        shiftDateInput.value = state.selectedDate;
        loadFromLocalStorage();

        // If no saved data, load initial multi-date demo dataset
        if (state.tokens.length === 0) {
            loadDemoData(false);
        } else {
            render();
        }

        attachEventListeners();
    }

    // --- Date Utility Functions ---
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatTime(dateObj = new Date()) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function getDaysInMonth(year, month) {
        // month is 1-indexed (1 = Jan, 12 = Dec)
        return new Date(year, month, 0).getDate();
    }

    // --- Local Storage Management ---
    function saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tokens));
        } catch (e) {
            console.error('Failed to save to local storage', e);
        }
    }

    function loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                state.tokens = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to parse local storage data', e);
            state.tokens = [];
        }
    }

    // --- Multi-Date Demo Dataset ---
    function loadDemoData(notify = true) {
        const [yearStr, monthStr] = state.selectedDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        // Demo tokens across 3 consecutive dates in the month
        const d1 = `${yearStr}-${monthStr}-26`;
        const d2 = `${yearStr}-${monthStr}-27`;
        const d3 = `${yearStr}-${monthStr}-28`;

        const demoRecords = [
            // Date 26
            { tokenNo: 'TOK-101', date: d1, shift: 'A' },
            { tokenNo: 'TOK-102', date: d1, shift: 'A' },
            { tokenNo: 'TOK-103', date: d1, shift: 'B' },
            { tokenNo: 'TOK-104', date: d1, shift: 'C' },
            { tokenNo: 'TOK-105', date: d1, shift: 'OFF' },

            // Date 27
            { tokenNo: 'TOK-101', date: d2, shift: 'B' },
            { tokenNo: 'TOK-102', date: d2, shift: 'A' },
            { tokenNo: 'TOK-103', date: d2, shift: 'C' },
            { tokenNo: 'TOK-104', date: d2, shift: 'A' },
            { tokenNo: 'TOK-105', date: d2, shift: 'OFF' },

            // Date 28 (Current selected date)
            { tokenNo: 'TOK-101', date: d3, shift: 'A' },
            { tokenNo: 'TOK-102', date: d3, shift: 'B' },
            { tokenNo: 'TOK-103', date: d3, shift: 'B' },
            { tokenNo: 'TOK-104', date: d3, shift: 'C' },
            { tokenNo: 'TOK-105', date: d3, shift: 'A' },
            { tokenNo: 'TOK-106', date: d3, shift: 'C' },
            { tokenNo: 'TOK-107', date: d3, shift: 'OFF' }
        ];

        state.tokens = demoRecords.map((t, idx) => ({
            id: 'tok_' + Date.now() + '_' + idx,
            tokenNo: t.tokenNo,
            date: t.date,
            shift: t.shift,
            markedAt: formatTime(),
            selected: false
        }));

        saveToLocalStorage();
        render();

        if (notify) {
            showToast('Loaded multi-date demo roster data', 'info');
        }
    }

    // --- Token Operations ---
    function addSingleToken() {
        const rawToken = singleTokenInput.value.trim().toUpperCase();
        const shift = singleShiftSelect.value;

        if (!rawToken) {
            showToast('Please enter a valid token number', 'warning');
            return;
        }

        // Check for duplicate for same date
        const existing = state.tokens.find(t => t.tokenNo === rawToken && t.date === state.selectedDate);
        if (existing) {
            showToast(`Token ${rawToken} already exists for ${state.selectedDate}`, 'warning');
            return;
        }

        const newToken = {
            id: 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            tokenNo: rawToken,
            date: state.selectedDate,
            shift: shift,
            markedAt: formatTime(),
            selected: false
        };

        state.tokens.unshift(newToken);
        singleTokenInput.value = '';
        saveToLocalStorage();
        render();

        showToast(`Token ${rawToken} added to ${state.selectedDate} with Shift ${shift}`, 'success');
    }

    function addBulkTokens() {
        const rawText = bulkTokensInput.value.trim();
        const defaultShift = bulkDefaultShift.value;

        if (!rawText) {
            showToast('Please enter token numbers to import', 'warning');
            return;
        }

        // Split by commas, spaces, or newlines
        const tokensArr = rawText.split(/[\s,\n]+/).map(t => t.trim().toUpperCase()).filter(t => t.length > 0);

        if (tokensArr.length === 0) {
            showToast('No valid tokens found in input', 'warning');
            return;
        }

        let addedCount = 0;
        let duplicateCount = 0;

        tokensArr.forEach((tNo, idx) => {
            const exists = state.tokens.some(t => t.tokenNo === tNo && t.date === state.selectedDate);
            if (exists) {
                duplicateCount++;
            } else {
                state.tokens.unshift({
                    id: 'tok_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
                    tokenNo: tNo,
                    date: state.selectedDate,
                    shift: defaultShift,
                    markedAt: formatTime(),
                    selected: false
                });
                addedCount++;
            }
        });

        bulkTokensInput.value = '';
        saveToLocalStorage();
        render();

        if (addedCount > 0) {
            showToast(`Successfully added ${addedCount} token(s) to ${state.selectedDate} (Shift ${defaultShift})`, 'success');
        }
        if (duplicateCount > 0) {
            showToast(`Skipped ${duplicateCount} duplicate token(s) for ${state.selectedDate}`, 'warning');
        }
    }

    function updateShift(id, newShift) {
        const token = state.tokens.find(t => t.id === id);
        if (token) {
            token.shift = newShift;
            token.markedAt = formatTime();
            saveToLocalStorage();
            render();
            showToast(`Token ${token.tokenNo} updated to Shift ${newShift}`, 'info');
        }
    }

    function deleteToken(id) {
        const tokenIndex = state.tokens.findIndex(t => t.id === id);
        if (tokenIndex !== -1) {
            const removedToken = state.tokens[tokenIndex].tokenNo;
            state.tokens.splice(tokenIndex, 1);
            saveToLocalStorage();
            render();
            showToast(`Token ${removedToken} removed`, 'info');
        }
    }

    function clearAllTokens() {
        if (state.tokens.length === 0) return;

        if (confirm('Are you sure you want to clear all token attendance records?')) {
            state.tokens = [];
            saveToLocalStorage();
            render();
            showToast('All roster records cleared', 'info');
        }
    }

    // --- Bulk Selection Operations ---
    function toggleSelectAll(checked) {
        const filtered = getFilteredTokens();
        filtered.forEach(t => t.selected = checked);
        render();
    }

    function toggleSelectToken(id, checked) {
        const token = state.tokens.find(t => t.id === id);
        if (token) {
            token.selected = checked;
            render();
        }
    }

    function applyBulkShift(shift) {
        const selectedTokens = state.tokens.filter(t => t.selected);
        if (selectedTokens.length === 0) return;

        selectedTokens.forEach(t => {
            t.shift = shift;
            t.markedAt = formatTime();
        });

        saveToLocalStorage();
        render();
        showToast(`Updated ${selectedTokens.length} token(s) to Shift ${shift}`, 'success');
    }

    function deleteSelectedTokens() {
        const selectedTokens = state.tokens.filter(t => t.selected);
        if (selectedTokens.length === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedTokens.length} selected token(s)?`)) {
            state.tokens = state.tokens.filter(t => !t.selected);
            saveToLocalStorage();
            render();
            showToast(`Deleted ${selectedTokens.length} token(s)`, 'info');
        }
    }

    // --- Filter & Search logic ---
    function getFilteredTokens() {
        return state.tokens.filter(t => {
            const matchDate = (t.date === state.selectedDate);
            const matchFilter = (state.activeFilter === 'ALL' || t.shift === state.activeFilter);
            const matchSearch = state.searchQuery === '' || t.tokenNo.toLowerCase().includes(state.searchQuery.toLowerCase());

            return matchDate && matchFilter && matchSearch;
        });
    }

    // --- Monthly Matrix Excel (.xlsx) Download Handler ---
    /**
     * Generates a SINGLE Excel Sheet for the selected Month.
     * Rows: Unique Tokens
     * Columns: Day 01, Day 02, Day 03 ... Day 31 (each date is a column), followed by monthly totals!
     */
    function downloadExcel() {
        if (state.tokens.length === 0) {
            showToast(`No attendance records available to export`, 'warning');
            return;
        }

        const [yearStr, monthStr] = state.selectedDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const totalDays = getDaysInMonth(year, month);
        const monthPrefix = `${yearStr}-${monthStr}`;

        // Get all tokens that have at least one record in this month (or in total state)
        const monthTokens = state.tokens.filter(t => t.date.startsWith(monthPrefix));

        if (monthTokens.length === 0) {
            showToast(`No attendance records found for month ${monthPrefix}`, 'warning');
            return;
        }

        // Get sorted list of unique Token IDs in this month
        const uniqueTokens = Array.from(new Set(monthTokens.map(t => t.tokenNo))).sort();

        // Month Names for pretty column headers
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = monthNames[month - 1];

        // Build the Monthly Matrix Table
        const matrixRows = [];

        uniqueTokens.forEach((tokenNo, index) => {
            const rowObj = {
                'Sl No': index + 1,
                'Token Number': tokenNo
            };

            let countA = 0;
            let countB = 0;
            let countC = 0;
            let countOff = 0;
            let totalWorked = 0;

            // Add a column for EACH day of the month (01 to totalDays)
            for (let d = 1; d <= totalDays; d++) {
                const dayString = String(d).padStart(2, '0');
                const dateKey = `${monthPrefix}-${dayString}`;
                const colHeader = `${dayString}-${monthLabel}`;

                // Find record for this token & date
                const record = monthTokens.find(t => t.tokenNo === tokenNo && t.date === dateKey);

                if (record) {
                    rowObj[colHeader] = record.shift;
                    if (record.shift === 'A') countA++;
                    else if (record.shift === 'B') countB++;
                    else if (record.shift === 'C') countC++;
                    else if (record.shift === 'OFF') countOff++;

                    if (record.shift !== 'OFF') totalWorked++;
                } else {
                    rowObj[colHeader] = '-'; // Not marked / Absent
                }
            }

            // Summary columns at the end of the row
            rowObj['Total Shift A'] = countA;
            rowObj['Total Shift B'] = countB;
            rowObj['Total Shift C'] = countC;
            rowObj['Total Off'] = countOff;
            rowObj['Total Worked Days'] = totalWorked;

            matrixRows.push(rowObj);
        });

        // Use SheetJS to construct Excel file
        try {
            const worksheet = XLSX.utils.json_to_sheet(matrixRows);

            // Dynamic column width formatting
            const colWidths = [
                { wch: 8 },  // Sl No
                { wch: 16 }  // Token Number
            ];

            // Add widths for each day column
            for (let d = 1; d <= totalDays; d++) {
                colWidths.push({ wch: 8 });
            }

            // Add widths for total columns
            colWidths.push({ wch: 14 }); // Total Shift A
            colWidths.push({ wch: 14 }); // Total Shift B
            colWidths.push({ wch: 14 }); // Total Shift C
            colWidths.push({ wch: 12 }); // Total Off
            colWidths.push({ wch: 18 }); // Total Worked Days

            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            const sheetName = `${state.selectedMine}_${monthLabel}_Attendence`;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            const fileName = `${state.selectedMine}_${monthLabel}_Attendence.xlsx`;
            XLSX.writeFile(workbook, fileName);

            showToast(`Exported monthly matrix to ${fileName}`, 'success');
        } catch (err) {
            console.error('Error generating Monthly Excel file', err);
            showToast('Failed to export Excel file. Check console for details.', 'warning');
        }
    }

    // --- Monthly CSV Export Handler ---
    function exportCsv() {
        const [yearStr, monthStr] = state.selectedDate.split('-');
        const monthPrefix = `${yearStr}-${monthStr}`;
        const monthTokens = state.tokens.filter(t => t.date.startsWith(monthPrefix));

        if (monthTokens.length === 0) {
            showToast(`No attendance tokens to export for ${monthPrefix}`, 'warning');
            return;
        }

        const totalDays = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = monthNames[parseInt(monthStr) - 1];

        const uniqueTokens = Array.from(new Set(monthTokens.map(t => t.tokenNo))).sort();

        // Build Headers
        const headers = ["Sl No", "Token Number"];
        for (let d = 1; d <= totalDays; d++) {
            headers.push(`"${String(d).padStart(2, '0')}-${monthLabel}"`);
        }
        headers.push('"Total Shift A"', '"Total Shift B"', '"Total Shift C"', '"Total Off"', '"Total Worked"');

        const csvRows = [headers.join(",")];

        uniqueTokens.forEach((tokenNo, index) => {
            const row = [index + 1, `"${tokenNo}"`];
            let countA = 0, countB = 0, countC = 0, countOff = 0, totalWorked = 0;

            for (let d = 1; d <= totalDays; d++) {
                const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
                const rec = monthTokens.find(t => t.tokenNo === tokenNo && t.date === dateKey);
                if (rec) {
                    row.push(`"${rec.shift}"`);
                    if (rec.shift === 'A') countA++;
                    else if (rec.shift === 'B') countB++;
                    else if (rec.shift === 'C') countC++;
                    else if (rec.shift === 'OFF') countOff++;
                    if (rec.shift !== 'OFF') totalWorked++;
                } else {
                    row.push('"-"');
                }
            }

            row.push(countA, countB, countC, countOff, totalWorked);
            csvRows.push(row.join(","));
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${state.selectedMine}_${monthLabel}_Attendence.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported monthly CSV for ${monthPrefix}`, 'success');
    }

    // --- Render Dashboard UI ---
    function render() {
        const dateTokens = state.tokens.filter(t => t.date === state.selectedDate);

        // Update Stats Counters
        const total = dateTokens.length;
        const countA = dateTokens.filter(t => t.shift === 'A').length;
        const countB = dateTokens.filter(t => t.shift === 'B').length;
        const countC = dateTokens.filter(t => t.shift === 'C').length;
        const countOff = dateTokens.filter(t => t.shift === 'OFF').length;

        statTotalEl.textContent = total;
        statShiftAEl.textContent = countA;
        statShiftBEl.textContent = countB;
        statShiftCEl.textContent = countC;
        statShiftOffEl.textContent = countOff;

        // Filtered Tokens for Table
        const filteredTokens = getFilteredTokens();

        // Update Bulk Action Bar visibility & text
        const selectedTokens = filteredTokens.filter(t => t.selected);
        if (selectedTokens.length > 0) {
            bulkActionsBar.classList.add('active');
            selectedCountText.textContent = `${selectedTokens.length} token(s) selected`;
        } else {
            bulkActionsBar.classList.remove('active');
        }

        // Update Select All Checkbox state
        selectAllCheckbox.checked = (filteredTokens.length > 0 && selectedTokens.length === filteredTokens.length);

        // Update Table Rows
        rosterTbody.innerHTML = '';
        if (filteredTokens.length === 0) {
            emptyState.classList.add('active');
        } else {
            emptyState.classList.remove('active');

            filteredTokens.forEach((t, idx) => {
                const tr = document.createElement('tr');
                if (t.selected) tr.classList.add('selected');

                let badgeClass = 'badge-off';
                let shiftText = 'General / Off';
                if (t.shift === 'A') { badgeClass = 'badge-a'; shiftText = 'Shift A (Morning)'; }
                else if (t.shift === 'B') { badgeClass = 'badge-b'; shiftText = 'Shift B (Evening)'; }
                else if (t.shift === 'C') { badgeClass = 'badge-c'; shiftText = 'Shift C (Night)'; }

                tr.innerHTML = `
                    <td class="th-checkbox">
                        <input type="checkbox" class="row-checkbox" data-id="${t.id}" ${t.selected ? 'checked' : ''} aria-label="Select token ${t.tokenNo}">
                    </td>
                    <td>${idx + 1}</td>
                    <td><span class="token-badge">${t.tokenNo}</span></td>
                    <td>${t.date}</td>
                    <td><span class="shift-indicator ${badgeClass}">${shiftText}</span></td>
                    <td>
                        <div class="shift-pills">
                            <button type="button" class="pill-btn pill-a ${t.shift === 'A' ? 'active' : ''}" data-id="${t.id}" data-shift="A" title="Set Shift A" aria-label="Set Shift A for ${t.tokenNo}">A</button>
                            <button type="button" class="pill-btn pill-b ${t.shift === 'B' ? 'active' : ''}" data-id="${t.id}" data-shift="B" title="Set Shift B" aria-label="Set Shift B for ${t.tokenNo}">B</button>
                            <button type="button" class="pill-btn pill-c ${t.shift === 'C' ? 'active' : ''}" data-id="${t.id}" data-shift="C" title="Set Shift C" aria-label="Set Shift C for ${t.tokenNo}">C</button>
                            <button type="button" class="pill-btn pill-off ${t.shift === 'OFF' ? 'active' : ''}" data-id="${t.id}" data-shift="OFF" title="Set Off" aria-label="Set Off for ${t.tokenNo}">Off</button>
                        </div>
                    </td>
                    <td class="text-right">
                        <button type="button" class="btn-icon-danger delete-row-btn" data-id="${t.id}" title="Remove Token" aria-label="Remove Token ${t.tokenNo}">
                            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                    </td>
                `;

                rosterTbody.appendChild(tr);
            });
        }

        // Update Footer Info
        showingRecordsText.textContent = `Showing ${filteredTokens.length} of ${dateTokens.length} records for ${state.selectedDate}`;
    }

    // --- Toast Notifications ---
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Event Listeners ---
    function attachEventListeners() {
        // Date Change
        shiftDateInput.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            render();
        });

        // Mine Selector Change
        mineSelectEl.addEventListener('change', (e) => {
            state.selectedMine = e.target.value;
            showToast(`Mine switched to ${state.selectedMine}`, 'info');
        });

        // Demo Data
        demoDataBtn.addEventListener('click', () => loadDemoData(true));

        // Excel & CSV Download
        downloadExcelBtn.addEventListener('click', downloadExcel);
        exportCsvBtn.addEventListener('click', exportCsv);
        clearAllBtn.addEventListener('click', clearAllTokens);

        // Input Tabs
        tabBulkBtn.addEventListener('click', () => {
            tabBulkBtn.classList.add('active');
            tabBulkBtn.setAttribute('aria-selected', 'true');
            tabSingleBtn.classList.remove('active');
            tabSingleBtn.setAttribute('aria-selected', 'false');
            bulkAddPanel.classList.add('active');
            singleAddPanel.classList.remove('active');
        });

        tabSingleBtn.addEventListener('click', () => {
            tabSingleBtn.classList.add('active');
            tabSingleBtn.setAttribute('aria-selected', 'true');
            tabBulkBtn.classList.remove('active');
            tabBulkBtn.setAttribute('aria-selected', 'false');
            singleAddPanel.classList.add('active');
            bulkAddPanel.classList.remove('active');
        });

        // Add Tokens
        addSingleBtn.addEventListener('click', addSingleToken);
        singleTokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSingleToken();
            }
        });

        addBulkBtn.addEventListener('click', addBulkTokens);

        // Form Submit Handlers
        const bulkAddForm = document.getElementById('bulkAddForm');
        if (bulkAddForm) {
            bulkAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addBulkTokens();
            });
        }

        const singleAddForm = document.getElementById('singleAddForm');
        if (singleAddForm) {
            singleAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addSingleToken();
            });
        }

        // Search Input
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim();
            render();
        });

        // Filter Pills
        filterPills.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                e.target.classList.add('active');
                e.target.setAttribute('aria-pressed', 'true');
                state.activeFilter = e.target.getAttribute('data-filter');
                render();
            }
        });

        // Select All Checkbox
        selectAllCheckbox.addEventListener('change', (e) => {
            toggleSelectAll(e.target.checked);
        });

        // Table Event Delegation (Checkboxes, Shift Pills, Delete Button)
        rosterTbody.addEventListener('click', (e) => {
            const target = e.target;

            // Checkbox
            if (target.classList.contains('row-checkbox')) {
                const id = target.getAttribute('data-id');
                toggleSelectToken(id, target.checked);
                return;
            }

            // Shift Pill
            const pill = target.closest('.pill-btn');
            if (pill) {
                const id = pill.getAttribute('data-id');
                const shift = pill.getAttribute('data-shift');
                updateShift(id, shift);
                return;
            }

            // Delete Button
            const deleteBtn = target.closest('.delete-row-btn');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                deleteToken(id);
                return;
            }
        });

        // Bulk Action Bar Buttons
        bulkShiftABtn.addEventListener('click', () => applyBulkShift('A'));
        bulkShiftBBtn.addEventListener('click', () => applyBulkShift('B'));
        bulkShiftCBtn.addEventListener('click', () => applyBulkShift('C'));
        bulkShiftOffBtn.addEventListener('click', () => applyBulkShift('OFF'));
        bulkDeleteBtn.addEventListener('click', deleteSelectedTokens);
    }

    // Launch App
    init();
});
