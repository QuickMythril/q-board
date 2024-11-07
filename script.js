let userName = null;
let userAddress = null;
let categories = {};

// Function to initialize the app
async function init() {
    document.getElementById('login-btn').addEventListener('click', login);
    // Hide the New Thread button on initialization
    document.getElementById('new-thread-header-btn').style.display = 'none';

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
    try {
        const response = await fetch(`/arbitrary/resources/search?service=COMMENT&identifier=qboard&prefix=true&mode=ALL&includemetadata=true`);
        const messages = await response.json();

        const categories = {};

        for (const msg of messages) {
            const category = msg.metadata.category || 'Uncategorized';
            const identifier = msg.identifier;
            const sequence = parseInt(identifier.slice(-4), 10);

            if (!categories[category]) {
                categories[category] = {};
            }

            // Threads have sequence '0000'
            if (sequence === 0) {
                categories[category][identifier] = {
                    identifier: identifier,
                    subject: msg.metadata.title || 'No Subject',
                    author: msg.name,
                    content: '', // Will fetch content
                    replies: []
                };
            } else {
                // Replies
                const threadIdentifier = identifier.slice(0, -4) + '0000';
                if (categories[category][threadIdentifier]) {
                    categories[category][threadIdentifier].replies.push({
                        identifier: identifier,
                        subject: msg.metadata.title || 'No Subject',
                        author: msg.name,
                        content: '' // Will fetch content
                    });
                }
            }
        }

        // Fetch content for all messages
        const contentPromises = [];

        for (const category in categories) {
            for (const threadId in categories[category]) {
                const thread = categories[category][threadId];
                // Fetch thread content
                const threadContentPromise = fetchMessageContent(thread.author, thread.identifier)
                    .then(content => {
                        thread.content = content;
                    });

                contentPromises.push(threadContentPromise);

                // Fetch replies content
                for (const reply of thread.replies) {
                    const replyContentPromise = fetchMessageContent(reply.author, reply.identifier)
                        .then(content => {
                            reply.content = content;
                        });
                    contentPromises.push(replyContentPromise);
                }
            }
        }

        await Promise.all(contentPromises);

        // Render categories and threads
        renderCategories(categories);

    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderCategories(categories) {
    const categoriesContainer = document.getElementById('categories-container');
    categoriesContainer.innerHTML = '';

    for (const categoryName in categories) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category');

        const categoryTitle = document.createElement('h2');
        categoryTitle.innerText = categoryName;

        categoryDiv.appendChild(categoryTitle);

        const threads = categories[categoryName];

        for (const threadId in threads) {
            const thread = threads[threadId];

            const threadDiv = document.createElement('div');
            threadDiv.classList.add('thread');

            const threadTitle = document.createElement('h3');
            threadTitle.innerText = thread.subject;

            const threadAuthor = document.createElement('p');
            threadAuthor.innerText = `By: ${thread.author}`;

            threadDiv.appendChild(threadTitle);
            threadDiv.appendChild(threadAuthor);
            threadDiv.addEventListener('click', () => openThread(thread, categoryName));

            categoryDiv.appendChild(threadDiv);
        }

        categoriesContainer.appendChild(categoryDiv);
    }
}

async function fetchMessageContent(name, identifier) {
    try {
        const response = await fetch(`/arbitrary/${encodeURIComponent(name)}/COMMENT/${encodeURIComponent(identifier)}`);
        if (response.ok) {
            const content = await response.text();
            return content;
        } else {
            console.error(`Failed to fetch content for ${name} ${identifier}`);
            return '';
        }
    } catch (error) {
        console.error(`Error fetching message content for ${name} ${identifier}:`, error);
        return '';
    }
}

// Function to open a thread and display replies
function openThread(thread, categoryName) {
    const modal = createModal();

    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h3>${thread.subject}</h3>
        <p class="author">By: ${thread.author}</p>
        <p>${thread.content}</p>
        <h4>Replies:</h4>
    `;

    thread.replies.forEach(reply => {
        const replyDiv = document.createElement('div');
        replyDiv.classList.add('message');

        const replyAuthor = document.createElement('p');
        replyAuthor.classList.add('author');
        replyAuthor.innerText = `By: ${reply.author}`;

        const replyContent = document.createElement('p');
        replyContent.innerText = reply.content;

        replyDiv.appendChild(replyAuthor);
        replyDiv.appendChild(replyContent);

        modalContent.appendChild(replyDiv);
    });

    if (userName) {
        const replyBtn = document.createElement('button');
        replyBtn.innerText = 'New Reply';
        replyBtn.classList.add('reply-btn');
        replyBtn.addEventListener('click', () => openModal('reply', categoryName, thread));
        modalContent.appendChild(replyBtn);
    }

    document.body.appendChild(modal);
    modal.style.display = 'block';

    modal.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
        modal.remove();
    };
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
            <input type="text" id="category-input" placeholder="Category" value="${category || ''}">
            <input type="text" id="subject-input" placeholder="Subject">
            <textarea id="message-input" placeholder="Your message"></textarea>
            <button id="submit-btn">Submit</button>
        `;
    } else if (type === 'reply') {
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h3>${titleText}</h3>
            <input type="text" id="subject-input" placeholder="Subject" value="Re: ${thread.subject}">
            <textarea id="message-input" placeholder="Your message"></textarea>
            <button id="submit-btn">Submit</button>
        `;
    }

    modal.querySelector('#submit-btn').addEventListener('click', () => {
        const subject = document.getElementById('subject-input').value;
        const content = document.getElementById('message-input').value;

        if (type === 'thread') {
            const categoryInput = document.getElementById('category-input').value;
            submitThread(categoryInput, subject, content);
        } else if (type === 'reply') {
            submitReply(thread, subject, content);
        }

        modal.style.display = 'none';
        modal.remove();
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
    if (category.length > 64) {
        category = category.substring(0, 64);
    }

    const identifier = generateIdentifier(subject);
    const messageFile = new Blob([content], { type: 'text/plain' });

    try {
        await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName,
            service: "COMMENT",
            identifier: identifier,
            file: messageFile,
            category: category,
            title: subject
        });
        alert('Thread published successfully!');
        loadMessages();
    } catch (error) {
        console.error(error);
        alert('Error publishing thread.');
    }
}

// Function to submit a reply
async function submitReply(thread, subject, content) {
    const identifier = incrementIdentifier(thread.identifier);
    const messageFile = new Blob([content], { type: 'text/plain' });

    try {
        const response = await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName,
            service: "COMMENT",
            identifier: identifier,
            file: messageFile,
            category: thread.category,
            title: subject
        });
        alert('Reply published successfully!');
        loadMessages();
    } catch (error) {
        console.error(error);
        alert('Error publishing reply.');
    }
}

// Function to generate a unique identifier
function generateIdentifier(subject) {
    const simplifiedSubject = subject.replace(/\s+/g, '').toLowerCase();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sequence = '0000';

    // Calculate fixed length parts: 'qboard-', '-', randomString, '-', sequence
    const fixedLength = 'qboard-'.length + '-' + randomString.length + '-' + sequence.length; // 7 + 1 + 6 + 1 + 4 = 19
    const maxSubjectLength = 64 - fixedLength;

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

// Initialize the app on page load
window.onload = init;
