let userName = null;
let userAddress = null;
let categories = {};
const categoryOptions = [
    { value: "ART", displayText: "Art and Design" },
    { value: "AUTOMOTIVE", displayText: "Automotive" },
    { value: "BEAUTY", displayText: "Beauty" },
    { value: "BOOKS", displayText: "Books and Reference" },
    { value: "BUSINESS", displayText: "Business" },
    { value: "COMMUNICATIONS", displayText: "Communications" },
    { value: "CRYPTOCURRENCY", displayText: "Cryptocurrency and Blockchain" },
    { value: "CULTURE", displayText: "Culture" },
    { value: "DATING", displayText: "Dating" },
    { value: "DESIGN", displayText: "Design" },
    { value: "ENTERTAINMENT", displayText: "Entertainment" },
    { value: "EVENTS", displayText: "Events" },
    { value: "FAITH", displayText: "Faith and Religion" },
    { value: "FASHION", displayText: "Fashion" },
    { value: "FINANCE", displayText: "Finance" },
    { value: "FOOD", displayText: "Food and Drink" },
    { value: "GAMING", displayText: "Gaming" },
    { value: "GEOGRAPHY", displayText: "Geography" },
    { value: "HEALTH", displayText: "Health" },
    { value: "HISTORY", displayText: "History" },
    { value: "HOME", displayText: "Home" },
    { value: "KNOWLEDGE", displayText: "Knowledge Share" },
    { value: "LANGUAGE", displayText: "Language" },
    { value: "LIFESTYLE", displayText: "Lifestyle" },
    { value: "MANUFACTURING", displayText: "Manufacturing" },
    { value: "MAPS", displayText: "Maps and Navigation" },
    { value: "MUSIC", displayText: "Music" },
    { value: "NEWS", displayText: "News" },
    { value: "OTHER", displayText: "Other" },
    { value: "PETS", displayText: "Pets" },
    { value: "PHILOSOPHY", displayText: "Philosophy" },
    { value: "PHOTOGRAPHY", displayText: "Photography" },
    { value: "POLITICS", displayText: "Politics" },
    { value: "PRODUCE", displayText: "Products and Services" },
    { value: "PRODUCTIVITY", displayText: "Productivity" },
    { value: "PSYCHOLOGY", displayText: "Psychology" },
    { value: "QORTAL", displayText: "Qortal" },
    { value: "SCIENCE", displayText: "Science" },
    { value: "SELF_CARE", displayText: "Self Care" },
    { value: "SELF_SUFFICIENCY", displayText: "Self-Sufficiency and Homesteading" },
    { value: "SHOPPING", displayText: "Shopping" },
    { value: "SOCIAL", displayText: "Social" },
    { value: "SOFTWARE", displayText: "Software" },
    { value: "SPIRITUALITY", displayText: "Spirituality" },
    { value: "SPORTS", displayText: "Sports" },
    { value: "STORYTELLING", displayText: "Storytelling" },
    { value: "TECHNOLOGY", displayText: "Technology" },
    { value: "TOOLS", displayText: "Tools" },
    { value: "TRAVEL", displayText: "Travel" },
    { value: "UNCATEGORIZED", displayText: "Uncategorized" },
    { value: "VIDEO", displayText: "Video" },
    { value: "WEATHER", displayText: "Weather" }
];

// Function to initialize the app
async function init() {
    try {
        const account = await qortalRequest({ action: "GET_USER_ACCOUNT" });
        const response = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: account.address
        });
        if (response.length > 0) {
            userName = response[0].name;
            userAddress = account.address;
            document.getElementById('username-display').innerText = `Logged in as: ${userName}`;
            document.getElementById('login-btn').style.display = 'none';
            // Show the New Thread button in the header
            const newThreadHeaderBtn = document.getElementById('new-thread-header-btn');
            newThreadHeaderBtn.style.display = 'inline-block';
            // Add event listener to the New Thread button
            newThreadHeaderBtn.addEventListener('click', () => openModal('thread'));
        }
    } catch (error) {
        // User not logged in
        console.log('User not logged in');
    }
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('reload-btn').addEventListener('click', loadMessages);
    // Hide the New Thread button on initialization if userName is not set
    if (!userName) {
        document.getElementById('new-thread-header-btn').style.display = 'none';
    }
    loadMessages();
}

// Function to handle user login
async function login() {
    try {
        const account = await qortalRequest({ action: "GET_USER_ACCOUNT" });
        const response = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: account.address
        });
        if (response.length > 0) {
            userName = response[0].name;
            userAddress = account.address;
            document.getElementById('username-display').innerText = `Logged in as: ${userName}`;
            document.getElementById('login-btn').style.display = 'none';
            // Show the New Thread button in the header
            const newThreadHeaderBtn = document.getElementById('new-thread-header-btn');
            newThreadHeaderBtn.style.display = 'inline-block';
            // Add event listener to the New Thread button
            newThreadHeaderBtn.addEventListener('click', () => openModal('thread'));
        } else {
            alert('You do not have a registered name.');
        }
    } catch (error) {
        console.error(error);
        alert('Error during login.');
    }
}

// Function to load all existing messages
async function loadMessages() {
    dismissLoading(false);
    let deletedThreads = 0;
    let deletedReplies = 0;
    try {
        // Get reference to loading feedback element
        const loadingThreads = document.getElementById('loading-threads');
        const loadingReplies = document.getElementById('loading-replies');
        loadingThreads.innerHTML = 'Searching for messages...';
        // Use qortalRequest to fetch messages
        const messages = await qortalRequest({
            action: "SEARCH_QDN_RESOURCES",
            service: "COMMENT",
            identifier: "qboard",
            prefix: true,
            includeMetadata: true,
            mode: "ALL"
        });
        loadingThreads.innerHTML = `Found ${messages.length} messages.  Loading content...`;
        const loadedNoneMsg = "" + loadingThreads.innerHTML;
        const categories = {};
        const threadsMap = {}; // New map to store threads by identifier
        for (const msg of messages) {
            const category = msg.metadata?.category ? msg.metadata.category : 'UNCATEGORIZED';
            const identifier = msg.identifier;
            const sequence = parseInt(identifier.slice(-4), 10);
            // Threads have sequence '0000'
            if (sequence === 0) {
                const thread = {
                    identifier: identifier,
                    subject: msg.metadata?.title ? msg.metadata.title : '(No Subject)',
                    author: msg.name,
                    category: category,
                    content: '', // Will fetch content
                    replies: [],
                    created: msg.created,
                    updated: msg.updated
                };
                threadsMap[identifier] = thread; // Add to threadsMap
                if (!categories[category]) {
                    categories[category] = {};
                }
                categories[category][identifier] = thread;
            } else {
                // Replies
                const threadIdentifier = identifier.slice(0, -4) + '0000';
                const thread = threadsMap[threadIdentifier]; // Find parent thread without considering category
                if (thread) {
                    thread.replies.push({
                        identifier: identifier,
                        subject: msg.metadata?.title ? msg.metadata.title : '(No Subject)',
                        author: msg.name,
                        content: '', // Will fetch content
                        created: msg.created,
                        updated: msg.updated
                    });
                }
            }
        }
        // After building the categories object
        const categoriesArray = Object.keys(categories).map(categoryName => ({
            name: categoryName,
            threads: categories[categoryName],
            threadCount: Object.keys(categories[categoryName]).length
        }));
        // Sort categories by thread count (descending order)
        categoriesArray.sort((a, b) => b.threadCount - a.threadCount);
        let totalThreads = 0;
        let totalReplies = 0;
        // Calculate total messages to fetch
        for (const category in categories) {
            for (const threadId in categories[category]) {
                totalThreads += 1; // For thread
                totalReplies += categories[category][threadId].replies.length; // For replies
            }
        }
        let loadedThreads = 0;
        let failedThreads = 0;
        let loadedReplies = 0;
        let failedReplies = 0;
        const contentPromises = [];
        // Fetch content for all messages with progress updates
        for (const category in categories) {
            for (const threadId in categories[category]) {
                const thread = categories[category][threadId];
                const threadContentPromise = fetchMessageContent(thread.author, thread.identifier)
                    .then(content => {
                        const parsed = parseMessageContent(content);
                        if (parsed) {
                            thread.subject = parsed.subject;
                            thread.category = parsed.category;
                            thread.content = parsed.message;
                        } else {
                            thread.content = content; // Use original content if parsing fails
                        }
                        // Check if thread is deleted
                        if (thread.subject.toLowerCase() === 'deleted' || thread.content.toLowerCase() === 'deleted') {
                            thread.deleted = true;
                            deletedThreads++;
                        } else {
                            loadedThreads++;
                        }
                        loadingThreads.innerHTML = `${loadedNoneMsg}<br>Loaded ${loadedThreads} of ${totalThreads} threads. Failed: ${failedThreads}. Deleted: ${deletedThreads}`;
                    })
                    .catch(error => {
                        thread.content = `Error loading content: ${error}`;
                        failedThreads++;
                        loadingThreads.innerHTML = `${loadedNoneMsg}<br>Loaded ${loadedThreads} of ${totalThreads} threads. Failed: ${failedThreads}. Deleted: ${deletedThreads}`;
                    });
                contentPromises.push(threadContentPromise);
                // Fetch replies content
                for (const reply of thread.replies) {
                    const replyContentPromise = fetchMessageContent(reply.author, reply.identifier)
                        .then(content => {
                            const parsed = parseMessageContent(content);
                            if (parsed) {
                                reply.subject = parsed.subject;
                                reply.content = parsed.message;
                            } else {
                                reply.content = content; // Use original content if parsing fails
                            }
                            // Check if reply is deleted
                            if (reply.subject.toLowerCase() === 'deleted' || reply.content.toLowerCase() === 'deleted') {
                                reply.deleted = true;
                                deletedReplies++;
                            } else {
                                loadedReplies++;
                            }
                            loadingReplies.innerHTML = `Loaded ${loadedReplies} of ${totalReplies} replies. Failed: ${failedReplies}. Deleted: ${deletedReplies}`;
                        })
                        .catch(error => {
                            reply.content = `Error loading content: ${error}`;
                            failedReplies++;
                            loadingReplies.innerHTML = `Loaded ${loadedReplies} of ${totalReplies} replies. Failed: ${failedReplies}. Deleted: ${deletedReplies}`;
                        });
                    contentPromises.push(replyContentPromise);
                }
            }
        }
        await Promise.all(contentPromises);
        loadingReplies.innerHTML += `<br>Finished loading messages.<br>
        <button id="dismiss-button">Dismiss</button>`;
        const dismissBtn = document.getElementById('dismiss-button');
        dismissBtn.addEventListener('click', () => dismissLoading(true));
        dismissBtn.classList.add('dismiss-btn');
        // Render categories and threads
        renderCategories(categoriesArray);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function dismissLoading(showBtn) {
    const loadingThreads = document.getElementById('loading-threads');
    const loadingReplies = document.getElementById('loading-replies');
    loadingThreads.innerHTML = '';
    loadingReplies.innerHTML = '';
}

function getCategoryDisplayName(internalName) {
    const category = categoryOptions.find(cat => cat.value === internalName);
    return category ? category.displayText : internalName;
}

function renderCategories(categoriesArray) {
    const categoriesContainer = document.getElementById('categories-container');
    categoriesContainer.innerHTML = '';
    categoriesArray.forEach(categoryObj => {
        const categoryName = categoryObj.name;
        const threads = categoryObj.threads;
        // Calculate the count of non-deleted threads
        const nonDeletedThreadsCount = Object.values(threads).filter(thread => !thread.deleted).length;
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');
        // Create the category header
        const categoryHeader = document.createElement('div');
        categoryHeader.classList.add('category-header');
        const categoryTitle = document.createElement('h2');
        // Use the correct count of non-deleted threads
        categoryTitle.innerText = `${getCategoryDisplayName(categoryName)} (${nonDeletedThreadsCount})`;
        categoryHeader.appendChild(categoryTitle);
        categoryDiv.appendChild(categoryHeader);
        // Create the threads container and set it to be hidden by default
        const threadsContainer = document.createElement('div');
        threadsContainer.classList.add('threads-container');
        threadsContainer.style.display = 'none'; // Start minimized
        // Render threads
        for (const threadId in threads) {
            const thread = threads[threadId];
            // Skip deleted threads
            if (thread.deleted) continue;
            const threadDiv = document.createElement('div');
            threadDiv.classList.add('thread');
            const threadTitle = document.createElement('h3');
            threadTitle.innerText = thread.subject;
            const threadAuthor = document.createElement('p');
            threadAuthor.innerText = `By: ${thread.author}`;
            const visibleRepliesCount = thread.replies.filter(reply => !reply.deleted).length;
            const threadReplies = document.createElement('p');
            threadReplies.innerText = `Replies: ${visibleRepliesCount}`;
            // Display created and updated times
            const threadCreated = document.createElement('p');
            threadCreated.innerText = `Created: ${new Date(thread.created).toLocaleString()}`;
            threadDiv.appendChild(threadCreated);
            if (thread.updated && thread.updated !== thread.created) {
                const threadUpdated = document.createElement('p');
                threadUpdated.innerText = `Updated: ${new Date(thread.updated).toLocaleString()}`;
                threadDiv.appendChild(threadUpdated);
            }
            threadDiv.appendChild(threadTitle);
            threadDiv.appendChild(threadAuthor);
            threadDiv.appendChild(threadReplies);
            threadDiv.addEventListener('click', () => openThread(thread, categoryName));
            threadsContainer.appendChild(threadDiv);
        }
        categoryDiv.appendChild(threadsContainer);
        categoriesContainer.appendChild(categoryDiv);
        // Add event listener to toggle threadsContainer display
        categoryHeader.addEventListener('click', () => {
            if (threadsContainer.style.display === 'none') {
                threadsContainer.style.display = 'block';
            } else {
                threadsContainer.style.display = 'none';
            }
        });
    });
}

async function fetchMessageContent(name, identifier) {
    try {
        const content = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: name,
            service: "COMMENT",
            identifier: identifier
        });
        return content; // Assuming the content is returned as a string
    } catch (error) {
        console.error(`Error fetching message content for ${name} ${identifier}:`, error);
        return `Error fetching message content: ${error}`;
    }
}

function parseMessageContent(content) {
    const regex = /^([A-Z_]+):"([^"]+)";\s*(.*)$/is;
    const match = content.match(regex);
    if (match) {
        const category = match[1];
        const subject = match[2];
        const message = match[3];
        return {
            category,
            subject,
            message
        };
    } else {
        // Content doesn't match the format
        return null;
    }
}

// Function to open a thread and display replies
function openThread(thread, categoryName) {
    const modal = createModal();
    const modalContent = modal.querySelector('.modal-content');
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.classList.add('close');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        modal.remove();
    };
    modalContent.appendChild(closeBtn);
    // New Reply button
    if (userName) {
        const replyBtn = document.createElement('button');
        replyBtn.innerText = 'New Reply';
        replyBtn.classList.add('reply-btn');
        replyBtn.addEventListener('click', () => openModal('reply', categoryName, thread));
        modalContent.appendChild(replyBtn);
    }
    // Thread title
    const threadTitle = document.createElement('h3');
    threadTitle.innerText = thread.subject;
    modalContent.appendChild(threadTitle);
    // Thread author
    const threadAuthor = document.createElement('p');
    threadAuthor.classList.add('author');
    threadAuthor.innerText = `By: ${thread.author}`;
    modalContent.appendChild(threadAuthor);
    // Display created and updated times
    const threadCreated = document.createElement('p');
    threadCreated.classList.add('timestamp');
    threadCreated.innerText = `Created: ${new Date(thread.created).toLocaleString()}`;
    modalContent.appendChild(threadCreated);
    if (thread.updated && thread.updated !== thread.created) {
        const threadUpdated = document.createElement('p');
        threadUpdated.classList.add('timestamp');
        threadUpdated.innerText = `Updated: ${new Date(thread.updated).toLocaleString()}`;
        modalContent.appendChild(threadUpdated);
    }
    // Edit and Delete buttons if user is the author
    if (userName === thread.author) {
        const editBtn = document.createElement('button');
        editBtn.innerText = 'Edit';
        editBtn.classList.add('edit-btn');
        editBtn.addEventListener('click', () => editMessage(thread, 'thread'));
        modalContent.appendChild(editBtn);
        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', () => deleteMessage(thread, 'thread'));
        modalContent.appendChild(deleteBtn);
    }
    // Thread content
    const threadContent = document.createElement('p');
    threadContent.classList.add('message-content');
    threadContent.innerHTML = processQortalLinks(escapeHtml(thread.content));
    modalContent.appendChild(threadContent);
    // Display replies
    const nonDeletedReplies = thread.replies.filter(reply => !reply.deleted);
    if (nonDeletedReplies.length > 0) {
        const repliesTitle = document.createElement('h4');
        repliesTitle.innerText = 'Replies:';
        modalContent.appendChild(repliesTitle);
    } else {
        const noRepliesTitle = document.createElement('h4');
        noRepliesTitle.innerText = 'No Replies';
        modalContent.appendChild(noRepliesTitle);
    }
    // Display non-deleted replies
    nonDeletedReplies.forEach(reply => {
        const replyDiv = document.createElement('div');
        replyDiv.classList.add('message');

        const replyAuthor = document.createElement('p');
        replyAuthor.classList.add('author');
        replyAuthor.innerText = `By: ${reply.author}`;
        replyDiv.appendChild(replyAuthor);
        // Display created and updated times for replies
        const replyCreated = document.createElement('p');
        replyCreated.classList.add('timestamp');
        replyCreated.innerText = `Created: ${new Date(reply.created).toLocaleString()}`;
        replyDiv.appendChild(replyCreated);

        if (reply.updated && reply.updated !== reply.created) {
            const replyUpdated = document.createElement('p');
            replyUpdated.classList.add('timestamp');
            replyUpdated.innerText = `Updated: ${new Date(reply.updated).toLocaleString()}`;
            replyDiv.appendChild(replyUpdated);
        }
        // Edit and Delete buttons for replies
        if (userName === reply.author) {
            const editReplyBtn = document.createElement('button');
            editReplyBtn.innerText = 'Edit';
            editReplyBtn.classList.add('edit-btn');
            editReplyBtn.addEventListener('click', () => editMessage(reply, 'reply', thread));
            replyDiv.appendChild(editReplyBtn);
            const deleteReplyBtn = document.createElement('button');
            deleteReplyBtn.innerText = 'Delete';
            deleteReplyBtn.classList.add('delete-btn');
            deleteReplyBtn.addEventListener('click', () => deleteMessage(reply, 'reply', thread));
            replyDiv.appendChild(deleteReplyBtn);
        }
        // Reply content
        const replyContent = document.createElement('p');
        replyContent.classList.add('message-content');
        replyContent.innerHTML = processQortalLinks(escapeHtml(reply.content));
        replyDiv.appendChild(replyContent);

        modalContent.appendChild(replyDiv);
    });
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Function to create a modal
function createModal() {
    const modalDiv = document.createElement('div');
    modalDiv.classList.add('modal');
    const modalContentDiv = document.createElement('div');
    modalContentDiv.classList.add('modal-content');
    modalDiv.appendChild(modalContentDiv);
    return modalDiv;
}

// Function to open modal for new thread or reply
function openModal(type, category = null, thread = null) {
    const modal = createModal();
    const modalContent = modal.querySelector('.modal-content');
    let titleText = type === 'thread' ? 'New Thread' : 'New Reply';
    if (type === 'thread') {
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h3>${titleText}</h3>
            <label for="category-select">Category:</label>
            <select id="category-select"></select>
            <input type="text" id="subject-input" placeholder="Subject">
            <textarea id="message-input" placeholder="Your message (Max 500 KB)"></textarea>
            <div id="size-feedback">0 KB / 500 KB</div> <!-- Added size feedback div -->
            <button id="submit-btn">Submit</button>
        `;
        // Populate the category-select
        const categorySelect = modalContent.querySelector('#category-select');
        categoryOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.displayText;
            categorySelect.appendChild(opt);
        });
        // Set the selected category if one is passed
        if (category) {
            categorySelect.value = category;
        } else {
            categorySelect.value = "UNCATEGORIZED";
        }
    } else if (type === 'reply') {
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h3>${titleText}</h3>
            <input type="text" id="subject-input" placeholder="Subject" value="Re: ${thread.subject}">
            <textarea id="message-input" placeholder="Your message (Max 500 KB)"></textarea>
            <div id="size-feedback">0 KB / 500 KB</div> <!-- Added size feedback div -->
            <button id="submit-btn">Submit</button>
        `;
    }
    // Add event listener to update size feedback
    const messageInput = modalContent.querySelector('#message-input');
    const sizeFeedback = modalContent.querySelector('#size-feedback');
    messageInput.addEventListener('input', () => {
        const contentLength = new Blob([messageInput.value]).size; // Size in bytes
        const sizeInKB = Math.ceil(contentLength / 1024); // Convert bytes to KB, round up
        sizeFeedback.textContent = `${sizeInKB} KB / 500 KB`;
    });
    // Updated event listener for submit button
    modal.querySelector('#submit-btn').addEventListener('click', () => {
        const subject = document.getElementById('subject-input').value;
        const content = document.getElementById('message-input').value;

        if (type === 'thread') {
            const categorySelect = document.getElementById('category-select').value;
            submitThread(categorySelect, subject, content);
        } else if (type === 'reply') {
            submitReply(thread, subject, content);
        }
    });
    modal.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
        modal.remove();
    };
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Function to submit a new thread
async function submitThread(category, subject, content) {
    const identifier = generateIdentifier(subject);
    const formattedContent = `${category}:"${subject}"; ${content}`;
    // Check message size
    const messageFile = new Blob([formattedContent], { type: 'text/plain' });
    // Check message size
    if (messageFile.size > 500 * 1024) { // 500 KB in bytes
        alert('Message exceeds maximum allowed size of 500 KB.');
        return;
    }
    try {
        await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName,
            service: "COMMENT",
            identifier: identifier,
            file: messageFile, // Maximum COMMENT size 500 KB
            category: category ? category : "UNCATEGORIZED",
            title: subject
        });
        alert('Thread published successfully!  Confirmation may take several minutes.  Progress can be checked in the Wallet plugin under ARBITRARY txs.  Threads may not appear immediately after confirmation.');
        loadMessages();
    } catch (error) {
        console.error(error);
        alert('Error publishing thread.  Please retry or cancel.');
    }
}

// Function to submit a reply
async function submitReply(thread, subject, content) {
    const identifier = incrementIdentifier(thread.identifier);
    const formattedContent = `${thread.category}:"${subject}"; ${content}`;
    // Check message size
    const messageFile = new Blob([formattedContent], { type: 'text/plain' });
    // Check message size
    if (messageFile.size > 500 * 1024) { // 500 KB in bytes
        alert('Message exceeds maximum allowed size of 500 KB.');
        return;
    }
    try {
        const response = await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName,
            service: "COMMENT",
            identifier: identifier,
            file: messageFile, // Maximum COMMENT size 500 KB
            category: thread.category ? thread.category : "UNCATEGORIZED",
            title: subject
        });
        alert('Reply published successfully!  Confirmation may take several minutes.  Progress can be checked in the Wallet plugin under ARBITRARY txs.  Threads may not appear immediately after confirmation.');
        loadMessages();
    } catch (error) {
        console.error(error);
        alert('Error publishing reply.  Please retry or cancel.');
    }
}

// Function to handle deleting a message
function deleteMessage(message, type) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }
    const identifier = message.identifier;
    const category = message.category ? message.category : 'UNCATEGORIZED';
    const name = userName;
    const service = 'COMMENT';
    const deletedContent = 'deleted';
    const deletedSubject = 'deleted';
    const formattedContent = `${category}:"${deletedSubject}"; ${deletedContent}`;
    const messageFile = new Blob([formattedContent], { type: 'text/plain' });
    qortalRequest({
        action: "PUBLISH_QDN_RESOURCE",
        name: name,
        service: service,
        identifier: identifier,
        file: messageFile,
        category: category,
        title: deletedSubject
    }).then(() => {
        alert('Message deleted successfully!');
        loadMessages();
    }).catch(error => {
        console.error(error);
        alert('Error deleting message.');
    });
}

// Function to handle editing a message
function editMessage(message, type, thread) {
    // Open a modal populated with current message details
    const modal = createModal();
    const modalContent = modal.querySelector('.modal-content');
    const titleText = 'Edit Message';
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h3>${titleText}</h3>
        <label for="category-select">Category:</label>
        <select id="category-select"></select>
        <input type="text" id="subject-input" placeholder="Subject">
        <textarea id="message-input" placeholder="Your message (Max 500 KB)"></textarea>
        <div id="size-feedback">0 KB / 500 KB</div>
        <button id="submit-btn">Submit</button>
    `;
    // Populate the category-select
    const categorySelect = modalContent.querySelector('#category-select');
    categoryOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.displayText;
        categorySelect.appendChild(opt);
    });
    // Set the selected category
    categorySelect.value = message.category ? message.category : 'UNCATEGORIZED';
    // Set the subject and message
    const subjectInput = modalContent.querySelector('#subject-input');
    subjectInput.value = message.subject;
    const messageInput = modalContent.querySelector('#message-input');
    messageInput.value = message.content;
    // Add event listener to update size feedback
    const sizeFeedback = modalContent.querySelector('#size-feedback');
    messageInput.addEventListener('input', () => {
        const contentLength = new Blob([messageInput.value]).size;
        const sizeInKB = Math.ceil(contentLength / 1024);
        sizeFeedback.textContent = `${sizeInKB} KB / 500 KB`;
    });
    // Initialize size feedback
    const initialContentLength = new Blob([messageInput.value]).size;
    const initialSizeInKB = Math.ceil(initialContentLength / 1024);
    sizeFeedback.textContent = `${initialSizeInKB} KB / 500 KB`;
    modalContent.querySelector('#submit-btn').addEventListener('click', () => {
        const newSubject = subjectInput.value;
        const newContent = messageInput.value;
        const newCategory = categorySelect.value;
        submitEdit(message, newCategory, newSubject, newContent);
        // modal.style.display = 'none';
        // modal.remove();
    });
    modalContent.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
        modal.remove();
    };
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Function to submit the edited message
function submitEdit(message, category, subject, content) {
    const identifier = message.identifier;
    const formattedContent = `${category}:"${subject}"; ${content}`;
    const messageFile = new Blob([formattedContent], { type: 'text/plain' });
    // Check message size
    if (messageFile.size > 500 * 1024) { // 500 KB
        alert('Message exceeds maximum allowed size of 500 KB.');
        return;
    }
    qortalRequest({
        action: "PUBLISH_QDN_RESOURCE",
        name: userName,
        service: "COMMENT",
        identifier: identifier,
        file: messageFile,
        category: category,
        title: subject
    }).then(() => {
        alert('Message edited successfully!');
        loadMessages();
    }).catch(error => {
        console.error(error);
        alert('Error editing message.');
    });
}

// Function to generate a unique identifier
function generateIdentifier(subject) {
    // simplifiedSubject should be only letters and numbers, no spaces or other symbols
    const simplifiedSubject = subject.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sequence = '0000';
    // Calculate fixed length parts: 'qboard-', '-', randomString, '-', sequence
    const fixedLength = 'qboard-'.length + '-'.length + randomString.length + '-'.length + sequence.length; // 7 + 1 + 6 + 1 + 4 = 19
    const maxSubjectLength = 64 - fixedLength; // 45
    let truncatedSubject = simplifiedSubject;
    if (simplifiedSubject.length > maxSubjectLength) {
        truncatedSubject = simplifiedSubject.substring(0, maxSubjectLength);
    }
    const identifier = `qboard-${truncatedSubject}-${randomString}-${sequence}`;
    return identifier;
}

// Function to increment the identifier for replies
function incrementIdentifier(identifier) {
    const parts = identifier.split('-');
    const sequence = parseInt(parts[parts.length - 1], 10) + 1;
    parts[parts.length - 1] = sequence.toString().padStart(4, '0');
    const newIdentifier = parts.join('-');
    if (newIdentifier.length > 64) {
        return newIdentifier.substring(0, 64);
    }
    return newIdentifier;
}

function processQortalLinks(text) {
    // Use a regular expression to find qortal:// links
    return text.replace(/qortal:\/\/[^\s<>"']+/g, function(match) {
        const displayText = escapeHtml(match);
        const encodedLink = encodeURIComponent(match);
        // Extract the service, name, and identifier
        const path = match.substring('qortal://'.length);
        const parts = path.split('/');
        const service = parts[0];
        const name = parts[1];
        const identifier = parts.slice(2).join('/'); // In case identifier contains slashes
        // Handle 'use-group/action-join/groupid-XXX' links
        if (service === 'use-group' && name === 'action-join') {
            return `<a href="#" style="color: dodgerblue; text-decoration: underline;" onclick="joinGroup('${encodedLink}'); return false;">${displayText}</a>`;
        }
        // For APP and WEBSITE service types
        else if (service === 'APP' || service === 'WEBSITE') {
            return `<a href="#" style="color: dodgerblue; text-decoration: underline;" onclick="openQortalLink('${encodedLink}'); return false;">${displayText}</a>`;
        }
        // For embeddable service types
        else if (['THUMBNAIL', 'QCHAT_IMAGE', 'IMAGE', 'VIDEO', 'AUDIO', 'QCHAT_AUDIO', 'VOICE', 'BLOG', 'BLOG_POST', 'BLOG_COMMENT', 'DOCUMENT'].includes(service)) {
            const url = `/arbitrary/${service}/${name}/${identifier}`;
            // Decide how to embed based on service type
            if (['IMAGE', 'THUMBNAIL', 'QCHAT_IMAGE'].includes(service)) {
                return `<img src="${url}" alt="${displayText}">`;
            } else if (['VIDEO'].includes(service)) {
                return `<video controls src="${url}"></video>`;
            } else if (['AUDIO', 'QCHAT_AUDIO', 'VOICE'].includes(service)) {
                return `<audio controls src="${url}"></audio>`;
            } else {
                return `<a href="#" onclick="openQortalLink('${encodedLink}'); return false;">${displayText}</a>`;
            }
        } else {
            // Default action for other service types
            return `<a href="#" style="color: dodgerblue; text-decoration: underline;" onclick="openQortalLink('${encodedLink}'); return false;">${displayText}</a>`;
        }
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function openQortalLink(encodedQortalLink) {
    const qortalLink = decodeURIComponent(encodedQortalLink);
    qortalRequest({
        action: 'OPEN_NEW_TAB',
        qortalLink: qortalLink
    }).then(response => {
        // Optionally handle the response
    }).catch(error => {
        console.error('Error opening Qortal link:', error);
    });
}

function joinGroup(encodedQortalLink) {
    const qortalLink = decodeURIComponent(encodedQortalLink);
    const path = qortalLink.substring('qortal://'.length);
    const parts = path.split('/');
    const service = parts[0]; // Should be 'use-group'
    const action = parts[1];  // Should be 'action-join'
    const groupIdPart = parts[2]; // Should be 'groupid-XXX'
    // Extract groupId from 'groupid-XXX'
    const groupIdMatch = groupIdPart.match(/groupid-(\d+)/);
    if (groupIdMatch && groupIdMatch[1]) {
        const groupId = parseInt(groupIdMatch[1], 10);
        // Call the JOIN_GROUP action
        qortalRequest({
            action: "JOIN_GROUP",
            groupId: groupId
        }).then(response => {
            if (response === true || (response && !response.error)) {
                alert(`Successfully joined group ${groupId}.`);
            } else {
                console.error('Error joining group:', response);
                alert('Error joining group. Please try again.');
            }
        }).catch(error => {
            console.error('Error joining group:', error);
            alert('Error joining group. Please try again.');
        });
    } else {
        alert('Invalid group link.');
    }
}

// Initialize the app on page load
window.onload = init;
