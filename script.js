// Merged and updated interactive morphology box code
const tableBody = document.querySelector('#papers-table tbody');
const filtersDiv = document.querySelector('#filters');
let originalData = [];

// Load data
async function loadData() {
    try {
        const [jsonData, orderingData] = await Promise.all([
            fetch('data.json').then(res => res.json()),
            loadOrderingData()
        ]);

        originalData = jsonData;
        const sortedData = sortData(jsonData, 'document_label');
        createFilters(jsonData, orderingData);
        renderTable(sortedData);
        updateDisabledButtons();
    } catch (err) {
        console.error('Failed to load JSON:', err);
    }
}

// Load ordering.json
async function loadOrderingData() {
    try {
        const response = await fetch('ordering.json');
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

// Render table
function renderTable(data) {
    const noDataMessage = document.getElementById('no-data-message');
    noDataMessage.style.display = data.length === 0 ? 'block' : 'none';

    tableBody.innerHTML = data.map(paper => {
        const displayURL = paper.url?.length > 60 ? paper.url.slice(0, 60) + '…' : paper.url || '';
        return `
            <tr>
                <td>${paper.document_label}</td>
                <td>${paper.year}</td>
                <td>${paper.title}</td>
                <td>${paper.institution}</td>
                <td><a href="${paper.url}" target="_blank">${displayURL}</a></td>
            </tr>`;
    }).join('');

    tableBody.querySelectorAll('tr').forEach((row, i) => {
        row.addEventListener('mouseover', () => highlightFilters(data[i]));
    });
}

// Create filters
function createFilters(jsonData, orderingData) {
    let filterKeys, groups;

    if (orderingData) {
        filterKeys = orderingData.keysOrder;
        groups = orderingData.groups;
    } else {
        filterKeys = Object.keys(jsonData[0]).filter(k =>
            !['id', 'document_label', 'title', 'year', 'url', 'institution'].includes(k));
        groups = [{ name: '', keys: filterKeys }];
    }

    const filtersContainer = document.getElementById('filters');
    filtersContainer.innerHTML = '';

    groups.forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.classList.add('filter-group-container');

        const groupTitle = document.createElement('h3');
        groupTitle.classList.add('filter-group-name');
        groupTitle.textContent = group.name;
        groupContainer.appendChild(groupTitle);

        group.keys.forEach(key => {
            const filterGroup = document.createElement('div');
            filterGroup.classList.add('filter-group');

            const filterKey = document.createElement('span');
            filterKey.textContent = key;
            filterKey.classList.add('filter-key');
            filterGroup.appendChild(filterKey);

            let uniqueValues;
            if (orderingData && orderingData.buttonsOrder[key]) {
                uniqueValues = orderingData.buttonsOrder[key];
            } else {
                uniqueValues = [...new Set(jsonData.flatMap(p => {
                    const val = p[key];
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string' && val.includes(',')) return val.split(',').map(v => v.trim());
                    return [val];
                }))].sort();
            }

            uniqueValues.forEach(value => {
                const btn = document.createElement('button');
                btn.textContent = value;
                btn.classList.add('filter-btn');
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                    applyFilters();
                });
                filterGroup.appendChild(btn);
            });

            filterKey.addEventListener('click', () => {
                filterGroup.querySelectorAll('.filter-btn.active').forEach(b => b.classList.remove('active'));
                applyFilters();
            });

            groupContainer.appendChild(filterGroup);
        });

        filtersContainer.appendChild(groupContainer);
    });
}

// Apply filter logic
function applyFilters() {
    const activeFilters = Array.from(document.querySelectorAll('.filter-group')).reduce((acc, fg) => {
        const key = fg.querySelector('.filter-key').textContent;
        const active = Array.from(fg.querySelectorAll('.filter-btn.active')).map(b => b.textContent);
        if (active.length > 0) acc[key] = active;
        return acc;
    }, {});

    const filteredData = originalData.filter(paper => {
        return Object.entries(activeFilters).every(([key, vals]) => {
            const val = paper[key];
            if (Array.isArray(val)) return val.some(v => vals.includes(v));
            if (typeof val === 'string' && val.includes(',')) {
                return val.split(',').map(v => v.trim()).some(v => vals.includes(v));
            }
            return vals.includes(val);
        });
    });

    renderTable(sortData(filteredData, 'document_label'));
    updateDisabledButtons();
}

// Sort data by column
function sortData(data, column, ascending = true) {
    return data.slice().sort((a, b) => {
        const aVal = a[column]?.toString().toLowerCase() || '';
        const bVal = b[column]?.toString().toLowerCase() || '';
        return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * (ascending ? 1 : -1);
    });
}

// Highlight filters
function highlightFilters(rowData) {
    const allFilterBtns = document.querySelectorAll('.filter-btn');
    allFilterBtns.forEach((btn) => btn.classList.remove('hover-highlight'));

    Object.entries(rowData).forEach(([key, value]) => {
        if (!value) return;

        const values = Array.isArray(value)
            ? value
            : typeof value === "string" && value.includes(",")
                ? value.split(",").map(v => v.trim())
                : [value];

        document.querySelectorAll('.filter-group').forEach(group => {
            const groupKey = group.querySelector('.filter-key')?.textContent;
            if (groupKey !== key) return;

            group.querySelectorAll('.filter-btn').forEach(btn => {
                const btnText = btn.textContent.trim().toLowerCase();
                if (values.some(v => v.toLowerCase() === btnText)) {
                    btn.classList.add('hover-highlight');
                }
            });
        });
    });
}

// Disable filter buttons that would lead to no data
function updateDisabledButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach((button) => {
        const filterGroup = button.closest('.filter-group');
        const key = filterGroup.querySelector('.filter-key').textContent;
        const value = button.textContent;

        const isActive = button.classList.contains('active');
        button.classList.toggle('active');

        const appliedFilters = Array.from(document.querySelectorAll('.filter-group')).reduce((acc, fg) => {
            const key = fg.querySelector('.filter-key').textContent;
            const active = Array.from(fg.querySelectorAll('.filter-btn.active')).map(b => b.textContent);
            if (active.length > 0) acc[key] = active;
            return acc;
        }, {});

        const filteredData = originalData.filter(paper => {
            return Object.entries(appliedFilters).every(([key, vals]) => {
                const val = paper[key];
                if (Array.isArray(val)) return val.some(v => vals.includes(v));
                if (typeof val === 'string' && val.includes(',')) {
                    return val.split(',').map(v => v.trim()).some(v => vals.includes(v));
                }
                return vals.includes(val);
            });
        });

        button.classList.toggle('active');

        if (filteredData.length === 0 && !isActive) {
            button.classList.add("button-disabled");
        } else {
            button.classList.remove("button-disabled");
        }
    });
}

// Scroll behavior
const titleBar = document.getElementById("title-bar");
window.addEventListener("scroll", () => {
    if (window.scrollY > 35) {
        titleBar.style.transform = "translateY(-100%)";
    } else {
        titleBar.style.transform = "";
    }
});

// Init
window.onload = () => {
    loadData();
};
