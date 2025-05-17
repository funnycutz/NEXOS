// Chat Functions
let currentChannel = 'general';
let privateChats = {};

// Initialize chat
function initChat() {
    if (!currentUser) return;
    
    // Load general chat
    loadChannel('general');
    
    // Load user's private chats
    loadPrivateChats();
    
    // Set up event listeners
    setupChatListeners();
}

// Load channel messages
function loadChannel(channelId) {
    currentChannel = channelId;
    
    // Update UI
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    document.querySelector(`.channel[data-channel="${channelId}"]`).classList.add('active');
    document.getElementById('channel-name').textContent = channelId === 'general' ? 'General' : privateChats[channelId].name;
    document.getElementById('channel-icon').className = channelId === 'general' ? 'fas fa-hashtag' : 'fas fa-user-friends';
    
    // Clear messages
    document.getElementById('messages-container').innerHTML = '';
    
    // Load messages
    const messagesRef = db.ref(`messages/${channelId}`).orderByChild('timestamp').limitToLast(100);
    
    messagesRef.on('child_added', snapshot => {
        const message = snapshot.val();
        addMessageToUI(message, snapshot.key);
    });
    
    // Update member count for general channel
    if (channelId === 'general') {
        db.ref('users').orderByChild('isOnline').equalTo(true).on('value', snapshot => {
            const onlineCount = snapshot.numChildren();
            document.getElementById('member-count').textContent = `${onlineCount} online`;
        });
    } else {
        // For private chats, show participants
        const participants = privateChats[channelId].participants;
        document.getElementById('member-count').textContent = `${Object.keys(participants).length} participants`;
    }
}

// Load user's private chats
function loadPrivateChats() {
    db.ref(`userChats/${currentUser.uid}`).on('value', snapshot => {
        privateChats = {};
        const dmList = document.getElementById('dm-list');
        dmList.innerHTML = '';
        
        snapshot.forEach(chatSnapshot => {
            const chatId = chatSnapshot.key;
            const chatData = chatSnapshot.val();
            privateChats[chatId] = chatData;
            
            // Create DM item
            const dmItem = document.createElement('div');
            dmItem.className = 'dm-item';
            dmItem.dataset.channel = chatId;
            
            // Get other participant's info (for 1:1 chats)
            let otherUserId = null;
            let otherUserAvatar = 'https://i.imgur.com/7bMqyJ2.png';
            let chatName = chatData.name;
            
            if (chatData.isGroup) {
                // Group chat
                otherUserAvatar = 'https://i.imgur.com/JxLQq3Y.png';
            } else {
                // 1:1 chat - find the other user
                for (const uid in chatData.participants) {
                    if (uid !== currentUser.uid) {
                        otherUserId = uid;
                        break;
                    }
                }
                
                if (otherUserId) {
                    // Get user info
                    db.ref(`users/${otherUserId}`).once('value', userSnapshot => {
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            otherUserAvatar = userData.avatar || otherUserAvatar;
                            chatName = userData.username;
                            
                            // Update UI
                            const img = dmItem.querySelector('img');
                            if (img) img.src = otherUserAvatar;
                            const span = dmItem.querySelector('span');
                            if (span) span.textContent = chatName;
                        }
                    });
                }
            }
            
            dmItem.innerHTML = `
                <img src="${otherUserAvatar}" alt="${chatName}">
                <span>${chatName}</span>
                <div class="status ${chatData.participants[otherUserId]?.isOnline ? 'online' : ''}"></div>
            `;
            
            dmItem.addEventListener('click', () => loadChannel(chatId));
            dmList.appendChild(dmItem);
        });
    });
}

// Add message to UI
function addMessageToUI(message, messageId) {
    const messagesContainer = document.getElementById('messages-container');
    const isCurrentUser = message.senderId === currentUser.uid;
    
    // Convert markdown to HTML
    let messageHtml = marked.parse(message.text);
    
    // Process links for preview
    messageHtml = processLinks(messageHtml);
    
    // Format timestamp
    const timestamp = formatTimestamp(message.timestamp);
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'current-user' : ''}`;
    messageElement.dataset.messageId = messageId;
    
    messageElement.innerHTML = `
        <img src="${message.senderAvatar}" alt="${message.senderName}" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${message.senderName}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${messageHtml}</div>
        </div>
    `;
    
    // Add message actions for current user's messages
    if (isCurrentUser) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="message-action edit-btn" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="message-action delete-btn" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        actions.querySelector('.edit-btn').addEventListener('click', () => editMessage(messageId, message.text));
        actions.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(messageId));
        
        messageElement.appendChild(actions);
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Process links in message for preview
function processLinks(html) {
    const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/g;
    return html.replace(linkRegex, (match, url, text) => {
        // Check if it's an image link
        if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            return `<a href="${url}" target="_blank"><img src="${url}" alt="${text}"></a>`;
        }
        
        // For other links, we'll add preview (handled separately)
        return match;
    });
}

// Format timestamp
function formatTimestamp(timestamp) {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    if (now.toDateString() === messageDate.toDateString()) {
        // Today - show time only
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (now.getTime() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        // Within last week - show day name
        return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
        // Older - show date
        return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Setup chat event listeners
function setupChatListeners() {
    // Send message on Enter (Shift+Enter for new line)
    document.getElementById('message-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Attach file button
    document.getElementById('attach-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    // File input change
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
    
    // Channel click listeners
    document.querySelectorAll('.channel').forEach(channel => {
        channel.addEventListener('click', () => {
            const channelId = channel.dataset.channel;
            loadChannel(channelId);
        });
    });
    
    // New DM modal
    document.getElementById('new-dm-btn').addEventListener('click', showNewDMModal);
    document.getElementById('close-dm-modal').addEventListener('click', hideNewDMModal);
    
    // DM search
    document.getElementById('dm-search').addEventListener('input', searchUsersForDM);
    
    // Image preview modal
    document.addEventListener('click', e => {
        if (e.target.classList.contains('message-text') && e.target.tagName === 'IMG') {
            showImagePreview(e.target.src);
        }
    });
    
    document.getElementById('close-image-modal').addEventListener('click', hideImagePreview);
}

// Send message
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.innerText.trim();
    
    if (messageText === '') return;
    
    const message = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Add message to database
    db.ref(`messages/${currentChannel}`).push(message)
        .then(() => {
            messageInput.innerText = '';
            messageInput.focus();
            
            // Update last message timestamp for private chats
            if (currentChannel !== 'general') {
                db.ref(`userChats/${currentUser.uid}/${currentChannel}`).update({
                    lastMessage: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Update for all participants
                const participants = privateChats[currentChannel].participants;
                for (const uid in participants) {
                    if (uid !== currentUser.uid) {
                        db.ref(`userChats/${uid}/${currentChannel}`).update({
                            lastMessage: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        });
}

// Handle file upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Maximum size is 5MB.');
        return;
    }
    
    // Upload file to Firebase Storage
    const storageRef = storage.ref(`chat_files/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed', 
        null, 
        error => {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        }, 
        () => {
            // Upload complete
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                // Create a markdown link to the file
                let fileLink;
                if (file.type.startsWith('image/')) {
                    fileLink = `![${file.name}](${downloadURL})`;
                } else {
                    fileLink = `[${file.name}](${downloadURL})`;
                }
                
                // Add to message input
                const messageInput = document.getElementById('message-input');
                if (messageInput.innerText.trim() !== '') {
                    messageInput.innerText += '\n' + fileLink;
                } else {
                    messageInput.innerText = fileLink;
                }
                messageInput.focus();
                
                // Clear file input
                document.getElementById('file-input').value = '';
            });
        }
    );
}

// Edit message
function editMessage(messageId, originalText) {
    const messageInput = document.getElementById('message-input');
    messageInput.innerText = originalText;
    messageInput.focus();
    
    // Change send button to update button temporarily
    const sendBtn = document.getElementById('send-btn');
    sendBtn.innerHTML = '<i class="fas fa-save"></i>';
    sendBtn.onclick = () => {
        const newText = messageInput.innerText.trim();
        if (newText === '') return;
        
        db.ref(`messages/${currentChannel}/${messageId}`).update({
            text: newText,
            edited: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            messageInput.innerText = '';
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.onclick = sendMessage;
        });
    };
}

// Delete message
function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        db.ref(`messages/${currentChannel}/${messageId}`).remove()
            .catch(error => {
                console.error('Error deleting message:', error);
                alert('Failed to delete message.');
            });
    }
}

// Show new DM modal
function showNewDMModal() {
    document.getElementById('new-dm-modal').classList.remove('hidden');
    document.getElementById('dm-search').focus();
}

// Hide new DM modal
function hideNewDMModal() {
    document.getElementById('new-dm-modal').classList.add('hidden');
    document.getElementById('dm-search').value = '';
    document.getElementById('dm-search-results').innerHTML = '';
}

// Search users for DM
function searchUsersForDM() {
    const searchTerm = document.getElementById('dm-search').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('dm-search-results');
    
    if (searchTerm === '') {
        resultsContainer.innerHTML = '';
        return;
    }
    
    db.ref('users').orderByChild('username').startAt(searchTerm).endAt(searchTerm + '\uf8ff').once('value', snapshot => {
        resultsContainer.innerHTML = '';
        
        snapshot.forEach(userSnapshot => {
            const user = userSnapshot.val();
            if (userSnapshot.key === currentUser.uid) return; // Skip current user
            
            const userElement = document.createElement('div');
            userElement.className = 'user-result';
            userElement.innerHTML = `
                <img src="${user.avatar || 'https://i.imgur.com/7bMqyJ2.png'}" alt="${user.username}">
                <div class="user-info">
                    <div class="username">${user.username}</div>
                    <div class="email">${user.email}</div>
                </div>
            `;
            
            userElement.addEventListener('click', () => createPrivateChat(userSnapshot.key, user.username, user.avatar));
            resultsContainer.appendChild(userElement);
        });
        
        if (resultsContainer.children.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
        }
    });
}

// Create private chat
function createPrivateChat(userId, username, avatar) {
    // Check if chat already exists between these users
    db.ref(`userChats/${currentUser.uid}`).orderByChild(`participants/${userId}`).equalTo(true).once('value', snapshot => {
        if (snapshot.exists()) {
            // Chat exists - open it
            snapshot.forEach(chatSnapshot => {
                if (!chatSnapshot.val().isGroup) {
                    loadChannel(chatSnapshot.key);
                    hideNewDMModal();
                }
            });
        } else {
            // Create new chat
            const chatId = db.ref().child('chats').push().key;
            const chatData = {
                name: username,
                isGroup: false,
                participants: {
                    [currentUser.uid]: true,
                    [userId]: true
                },
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastMessage: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Create chat for both users
            const updates = {};
            updates[`chats/${chatId}`] = chatData;
            updates[`userChats/${currentUser.uid}/${chatId}`] = chatData;
            updates[`userChats/${userId}/${chatId}`] = {
                ...chatData,
                name: currentUser.username,
                participants: {
                    [currentUser.uid]: true,
                    [userId]: true
                }
            };
            
            db.ref().update(updates)
                .then(() => {
                    loadChannel(chatId);
                    hideNewDMModal();
                })
                .catch(error => {
                    console.error('Error creating chat:', error);
                    alert('Failed to create chat. Please try again.');
                });
        }
    });
}

// Show image preview
function showImagePreview(imageUrl) {
    document.getElementById('previewed-image').src = imageUrl;
    document.getElementById('image-preview-modal').classList.remove('hidden');
}

// Hide image preview
function hideImagePreview() {
    document.getElementById('image-preview-modal').classList.add('hidden');
}
