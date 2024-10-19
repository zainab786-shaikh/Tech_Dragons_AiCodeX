const chatLog = document.querySelector('.chat-log');
const messageInput = document.querySelector('#message-input');
const sendBtn = document.querySelector('#send-btn');

// Function to render chat messages
function renderMessage(message, isUser) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    if (isUser) {
        messageBubble.classList.add('right');
    } else {
        messageBubble.classList.add('left');
    }
    messageBubble.textContent = message;
    chatLog.appendChild(messageBubble);
}

// Function to handle user input
function handleUserInput() {
    const userInput = messageInput.value.trim();
    if (userInput) {
        renderMessage(userInput, true);
        // TO DO: Send user input to chatbot API and get response
        const response = 'This is a sample response from the chatbot';
        renderMessage(response, false);
        messageInput.value = '';
    }
}

sendBtn.addEventListener('click', handleUserInput);