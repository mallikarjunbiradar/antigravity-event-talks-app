/* ==========================================================================
   BigQuery Release Notes - App Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let releases = [];
    let filteredReleases = [];
    let currentFilter = 'all';
    let currentSearchQuery = '';
    let selectedRelease = null;
    let activePreset = 'direct';
    let sortOrder = 'desc'; // 'desc' = Newest first, 'asc' = Oldest first

    // --- DOM Elements ---
    const cardsGrid = document.getElementById('cardsGrid');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    
    const refreshBtn = document.getElementById('refreshBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sortToggleBtn = document.getElementById('sortToggleBtn');
    const sortText = document.getElementById('sortText');
    const retryBtn = document.getElementById('retryBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    const lastFetchedText = document.getElementById('lastFetchedText');
    const filtersContainer = document.getElementById('filtersContainer');
    
    // Counter elements
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countAnnouncement = document.getElementById('count-announcement');
    const countIssue = document.getElementById('count-issue');
    const countChange = document.getElementById('count-change');

    // Dialog Elements
    const tweetModal = document.getElementById('tweetModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const previewDate = document.getElementById('previewDate');
    const previewBadge = document.getElementById('previewBadge');
    const previewBodyText = document.getElementById('previewBodyText');
    const tweetText = document.getElementById('tweetText');
    const charCount = document.getElementById('charCount');
    const copyTweetBtn = document.getElementById('copyTweetBtn');
    const submitTweetBtn = document.getElementById('submitTweetBtn');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // --- Helpers ---
    
    // Strip HTML to get plain text
    function stripHtml(html) {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || "";
    }

    // Format ISO timestamp to relative or local date
    function formatDate(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return isoString;
        }
    }

    // Format last fetched timestamp
    function formatLastFetched(isoString) {
        if (!isoString) return 'Never fetched';
        try {
            const date = new Date(isoString);
            return `Last updated: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
            return 'Just updated';
        }
    }

    // --- API Calls ---
    
    async function loadReleases(forceRefresh = false) {
        // Toggle Loading UI
        showLoadingState();
        if (forceRefresh) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        }

        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error fetching release notes');
            }
            
            const data = await response.json();
            releases = data.releases || [];
            
            // Update last fetched text
            lastFetchedText.textContent = formatLastFetched(data.last_fetched);
            
            // Calculate and display category counts
            updateCategoryCounts();
            
            // Apply current filters
            applyFiltersAndSearch();
            
            if (forceRefresh) {
                showToast("Feed successfully refreshed!");
            }
            
            // Display warn message if any
            if (data.error) {
                console.warn(data.error);
                showToast(`Warning: ${data.error}`);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            showErrorState(error.message);
        } finally {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    // --- UI State Management ---
    
    function showLoadingState() {
        loadingState.style.display = 'flex';
        cardsGrid.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function showCardsState() {
        loadingState.style.display = 'none';
        cardsGrid.style.display = 'grid';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function showErrorState(msg) {
        loadingState.style.display = 'none';
        cardsGrid.style.display = 'none';
        errorState.style.display = 'flex';
        emptyState.style.display = 'none';
        errorMessage.textContent = msg || 'Please try again later.';
    }

    function showEmptyState() {
        loadingState.style.display = 'none';
        cardsGrid.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'flex';
    }

    // --- Counter Calculations ---
    function updateCategoryCounts() {
        const counts = {
            all: releases.length,
            Feature: 0,
            Announcement: 0,
            Issue: 0,
            Change: 0
        };

        releases.forEach(rel => {
            if (counts[rel.type] !== undefined) {
                counts[rel.type]++;
            }
        });

        countAll.textContent = counts.all;
        countFeature.textContent = counts.Feature;
        countAnnouncement.textContent = counts.Announcement;
        countIssue.textContent = counts.Issue;
        countChange.textContent = counts.Change;
    }

    // --- Filters & Searching ---
    
    function applyFiltersAndSearch() {
        filteredReleases = releases.filter(rel => {
            // Type Match
            const matchesType = (currentFilter === 'all' || rel.type.toLowerCase() === currentFilter.toLowerCase());
            
            // Search Query Match (Checks Date, Type, and Text content)
            const plainText = stripHtml(rel.body).toLowerCase();
            const searchLower = currentSearchQuery.toLowerCase();
            const matchesSearch = !currentSearchQuery || 
                                  rel.date.toLowerCase().includes(searchLower) ||
                                  rel.type.toLowerCase().includes(searchLower) ||
                                  plainText.includes(searchLower);

            return matchesType && matchesSearch;
        });

        // Sort by date/timestamp
        filteredReleases.sort((a, b) => {
            const dateA = new Date(a.updated || a.date);
            const dateB = new Date(b.updated || b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        if (filteredReleases.length === 0) {
            showEmptyState();
            const emptyP = emptyState.querySelector('p');
            if (emptyP) {
                if (currentSearchQuery) {
                    emptyP.innerHTML = `No results found for search query <strong>"${currentSearchQuery}"</strong> under ${currentFilter === 'all' ? 'any category' : `the <strong>${currentFilter}</strong> category`}.`;
                } else {
                    emptyP.innerHTML = `No release notes found under the <strong>${currentFilter}</strong> category filter.`;
                }
            }
        } else {
            showCardsState();
            renderCards();
        }
    }

    // --- Render Cards Grid ---
    
    function renderCards() {
        cardsGrid.innerHTML = '';
        
        filteredReleases.forEach((rel, index) => {
            const card = document.createElement('article');
            card.className = 'release-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            const badgeClass = rel.type.toLowerCase();
            const dateStr = rel.date;

            // Short summary of plain text for title tag / accessibility
            const textContent = stripHtml(rel.body);

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-date">${dateStr}</span>
                    <span class="type-badge ${badgeClass}">${rel.type}</span>
                </div>
                <div class="card-body">
                    ${rel.body}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-copy" data-id="${rel.id}" aria-label="Copy release note text">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="btn btn-tweet btn-card-tweet" data-id="${rel.id}" aria-label="Tweet this release note">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            `;
            
            // Clipboard Copy Event Listener
            card.querySelector('.btn-copy').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const releaseText = `BigQuery Release Notes (${dateStr}) - [${rel.type}]:\n\n${textContent}`;
                
                navigator.clipboard.writeText(releaseText).then(() => {
                    showToast("Release note copied to clipboard!");
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="#10b981" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                        </svg>
                        <span style="color: #10b981">Copied!</span>
                    `;
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                    }, 2000);
                });
            });

            // Tweet Trigger Listener
            card.querySelector('.btn-card-tweet').addEventListener('click', () => {
                openTweetModal(rel);
            });

            cardsGrid.appendChild(card);
        });
    }

    // --- Tweet Text Generators (Dynamic Presets) ---
    
    function generateTweetDraft(release, style) {
        const cleanBody = stripHtml(release.body).replace(/\s+/g, ' ').trim();
        const date = release.date;
        const type = release.type;
        
        let text = "";
        if (style === 'direct') {
            const prefix = `📢 BigQuery Update (${date}) | [${type}]\n\n`;
            const suffix = `\n\n#GoogleCloud`;
            const allowedLength = 280 - prefix.length - suffix.length;
            
            let bodyTrunc = cleanBody;
            if (cleanBody.length > allowedLength) {
                bodyTrunc = cleanBody.substring(0, allowedLength - 3) + "...";
            }
            text = prefix + bodyTrunc + suffix;
        } else if (style === 'promo') {
            const prefix = `🚀 New in #BigQuery (${date})!\n\n`;
            const suffix = `\n\n#GoogleCloud #DataEngineering`;
            const allowedLength = 280 - prefix.length - suffix.length;
            
            let bodyTrunc = cleanBody;
            if (cleanBody.length > allowedLength) {
                bodyTrunc = cleanBody.substring(0, allowedLength - 3) + "...";
            }
            text = prefix + bodyTrunc + suffix;
        } else if (style === 'technical') {
            const prefix = `🛠️ BigQuery Dev Update [${type}] (${date}):\n`;
            const suffix = `\n\n#BigQuery #GCP`;
            const allowedLength = 280 - prefix.length - suffix.length;
            
            let bodyTrunc = cleanBody;
            if (cleanBody.length > allowedLength) {
                bodyTrunc = cleanBody.substring(0, allowedLength - 3) + "...";
            }
            text = prefix + bodyTrunc + suffix;
        }
        return text;
    }

    // --- Tweet Modal Logic ---
    
    function openTweetModal(release) {
        selectedRelease = release;
        activePreset = 'direct';
        
        // Reset active style preset indicator
        presetButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === activePreset);
        });

        // Set Preview Box Content
        previewDate.textContent = release.date;
        previewBadge.textContent = release.type;
        previewBadge.className = `type-badge ${release.type.toLowerCase()}`;
        previewBodyText.innerHTML = release.body;
        
        // Generate and Set Initial Draft Text
        const draftText = generateTweetDraft(release, activePreset);
        tweetText.value = draftText;
        
        updateCharCount();
        
        // Open the dialog natively
        tweetModal.showModal();
    }

    function updateCharCount() {
        const textLen = tweetText.value.length;
        charCount.textContent = textLen;

        // Visual warning near limit
        charCount.classList.toggle('warning', textLen >= 250 && textLen <= 279);
        
        const isError = textLen >= 280;
        const wasError = charCount.classList.contains('error');
        charCount.classList.toggle('error', isError);

        // Shake animation if just exceeded limit
        if (isError && !wasError) {
            charCount.classList.add('shake');
            setTimeout(() => {
                charCount.classList.remove('shake');
            }, 300);
        }

        // Disable submit button if over limit or empty
        submitTweetBtn.disabled = (textLen > 280 || textLen === 0);
    }

    // --- Interactive Listeners ---

    // Search filter input listener
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim();
        clearSearchBtn.style.display = currentSearchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });

    // Clear search trigger
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });

    // Category Filter Badges Listeners
    filtersContainer.addEventListener('click', (e) => {
        const badge = e.target.closest('.filter-badge');
        if (!badge) return;

        // Update active class
        filtersContainer.querySelectorAll('.filter-badge').forEach(el => el.classList.remove('active'));
        badge.classList.add('active');

        // Update state and re-filter
        currentFilter = badge.dataset.type;
        applyFiltersAndSearch();
    });

    // Export to CSV function
    function exportToCSV() {
        if (!filteredReleases || filteredReleases.length === 0) {
            alert("No release notes available to export.");
            return;
        }

        const headers = ["Date", "Type", "Content"];
        const rows = filteredReleases.map(rel => {
            const cleanContent = stripHtml(rel.body)
                .replace(/"/g, '""') // Escape double quotes
                .replace(/\s+/g, ' ') // Standardize spacing
                .replace(/\r?\n/g, ' ') // Flatten newlines
                .trim();
            return [
                `"${rel.date}"`,
                `"${rel.type}"`,
                `"${cleanContent}"`
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const filterStr = currentFilter !== 'all' ? `_${currentFilter.toLowerCase()}` : '';
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bigquery_releases${filterStr}_${timestamp}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${filteredReleases.length} release notes to CSV!`);
    }

    // Export Button Clicked
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Refresh Button Clicked
    refreshBtn.addEventListener('click', () => {
        loadReleases(true);
    });

    // Retry Buttons
    retryBtn.addEventListener('click', () => {
        loadReleases(false);
    });

    // Clear filters and query button
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        currentFilter = 'all';
        
        filtersContainer.querySelectorAll('.filter-badge').forEach(el => {
            el.classList.toggle('active', el.dataset.type === 'all');
        });
        
        applyFiltersAndSearch();
    });

    // Close Modal Button
    closeModalBtn.addEventListener('click', () => {
        tweetModal.close();
    });

    // Dynamic presets triggers
    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activePreset = e.currentTarget.dataset.preset;
            presetButtons.forEach(el => el.classList.remove('active'));
            e.currentTarget.classList.add('active');

            if (selectedRelease) {
                tweetText.value = generateTweetDraft(selectedRelease, activePreset);
                updateCharCount();
            }
        });
    });

    // Realtime textarea typing handler
    tweetText.addEventListener('input', updateCharCount);

    // Copy Draft Text in modal
    copyTweetBtn.addEventListener('click', (e) => {
        const textToCopy = tweetText.value;
        const btn = e.currentTarget;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Tweet draft copied to clipboard!");
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#10b981" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </svg>
                <span style="color: #10b981">Copied!</span>
            `;
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 1800);
        });
    });

    // Tweet Share Trigger
    submitTweetBtn.addEventListener('click', () => {
        const text = tweetText.value;
        if (!text || text.length > 280) return;

        // Open Web Intent URL
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        
        showToast("Opened Twitter composer draft!");
        
        // Close modal
        tweetModal.close();
    });

    // --- Modal light-dismiss fallback for Safari / older browsers ---
    if (!('closedBy' in HTMLDialogElement.prototype)) {
        tweetModal.addEventListener('click', (event) => {
            if (event.target !== tweetModal) return;
            const rect = tweetModal.getBoundingClientRect();
            const isDialogContent = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );
            if (isDialogContent) return;
            tweetModal.close();
        });
    }

    // --- Theme toggling logic ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);

    function updateThemeToggleUI(theme) {
        const moonIcon = themeToggleBtn.querySelector('.moon-icon');
        const sunIcon = themeToggleBtn.querySelector('.sun-icon');
        if (theme === 'light') {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleUI(newTheme);
        showToast(`Swapped to ${newTheme} mode.`);
    });

    // --- Sort Toggle Logic ---
    sortToggleBtn.addEventListener('click', () => {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        sortText.textContent = sortOrder === 'desc' ? 'Newest First' : 'Oldest First';
        applyFiltersAndSearch();
        showToast(`Sorted release notes (${sortOrder === 'desc' ? 'newest first' : 'oldest first'}).`);
    });

    // --- Toast Notification Helper ---
    function showToast(message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="color: var(--primary-light)">
                <path fill="currentColor" d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove after 3s
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // --- Initial Load ---
    loadReleases(false);
});
