
$(document).ready(function () {
    $('#msg_input').keydown(function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#send_button').click();
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.onresult = async function (event) {
        const transcript = event.results[0][0].transcript;
        showUserMessage(transcript);
        $('#msg_input').val('');

        setTimeout(async function () {
            const botResponseText = await runPipeline(transcript);
            const conciseResponse = botResponseText.split('. ').slice(0, 2).join('. ') + '.'; // Keep only 2 sentences
            showBotMessage(conciseResponse);

            const botAudioResponse = await getAudioOutput(transcript);
            if (botAudioResponse) {
                const audio = new Audio(botAudioResponse);
                audio.play();
            } else {
                showBotMessage("Audio response is not available.");
            }
        }, 300);
    };

    $('#voice_input').on('click', function () {
        recognition.start();
    });
});

var stage = "handleWelcome";
var topic = "";
var count = 0;
var mcqQuestions = ""
function sendMessageToBot(userMessage) {
    return new Promise((resolve, reject) => {
        setTimeout(async function () {
            const botResponse = await runPipeline(userMessage);
            //const conciseResponse = botResponse.split('. ').slice(0, 2).join('. ') + '.'; // Keep only 2 sentences
            resolve(botResponse);
        }, 300);
    });
}

$('#send_button').on('click', async function (e) {
    const userMessage = $('#msg_input').val().trim();
    if (!userMessage) return; // Avoid displaying an empty user message
    $('#msg_input').val('');
    showUserMessage(userMessage);
    await handleInteraction(userMessage);
});

$(window).on('load', function () {
    showBotMessage('Hi! AI Tutor here.');
});

async function handleInteraction(userMessage) {
    var getUserInput = false;
    while (!getUserInput) {
        if (stage == "handleWelcome") {
            await handleWelcome();
            topic = "";
            count = 0;
            mcqQuestions = ""
            getUserInput = true;
        } else if (stage == "handleCheckTopic") {
            await handleCheckTopic(userMessage);
        } else if (stage == "handleExplainTopic") {
            await handleExplainTopic();
        } else if (stage == "handleCheckTopicExplanation") {
            await handleCheckTopicExplanation();
            getUserInput = true;
        } else if (stage == "handleUserUnderstandingOfTopic") {
            await handleUserUnderstandingOfTopic(userMessage);
        } else if (stage == "handleMCQ") {
            await handleMCQ();
            getUserInput = true;
        } else if (stage == "handleMCQAnswer") {
            await handleMCQAnswer(userMessage);
        }
    }
}

async function handleWelcome() {
    let userMessage = "Enter the topic you wish to learn"
    showBotMessage(userMessage);
    stage = "handleCheckTopic";

    return stage;
}

async function handleCheckTopic(userMessage) {
    let botMessage = "Check if the following topic is a valid topic. If valid, just simple return 'valid-' followed by topic name: " + userMessage
    let botResponse = await sendMessageToBot(botMessage);
    const prefix = "valid-";
    if (botResponse.startsWith(prefix)) {
        topic = botResponse.substring(prefix.length);
        stage = "handleExplainTopic";
    } else {
        stage = "handleWelcome";
    }

    return stage;
}

async function handleExplainTopic() {
    let botMessage = ""
    if (count++ == 0) {
        botMessage = "Explain the topic briefly: " + topic;
    } else if (count++ == 1) {
        botMessage = "Explain the topic in detail: " + topic;
    } else {
        botMessage = "Explain the topic like a kid: " + topic;
    }
    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);
    stage = "handleCheckTopicExplanation";
    return stage;
}

async function handleCheckTopicExplanation() {
    let userMessage = "Is the topic understood";
    showBotMessage(userMessage);
    stage = "handleUserUnderstandingOfTopic";

    return stage;
}

async function handleUserUnderstandingOfTopic(userMessage) {
    let botMessage = "If the user understood the topic just return yes else no";
    let botResponse = await sendMessageToBot(botMessage);
    if (botResponse.toLowerCase() == "yes") {
        stage = "handleMCQ";
    } else {
        stage = "handleExplainTopic";
    }

    return stage;
}

async function handleMCQ() {
    let botMessage = "Share at least 5 MCQs on the following topic with 4 options each without the answer. Also show the user how to write the answer of the MCQ. Topic is : " + topic;
    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);
    mcqQuestions = botResponse;
    stage = "handleMCQAnswer"
    return stage;
}

async function handleMCQAnswer(userMessage) {
    let botMessage = "Here are the list of MCQs : " + mcqQuestions + " The following are the answer " + userMessage +
        " Kindly validate the answer and provide the analysis whether the topic " + topic + " is understood by user.";
    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);
    stage = "handleWelcome";
    return stage;
}


//-----------------------------------------------------------------------------------------
function getCurrentTimestamp() {
    return new Date();
}
function renderMessageToScreen(args) {
    let displayDate = (args.time || getCurrentTimestamp()).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    });
    let messagesContainer = $('.messages');

    let message = $(`        
    <li class="message ${args.message_side}">
        <div class="avatar"></div>
        <div class="text_wrapper">
            <div class="text">${args.text}</div>
            <div class="timestamp">${displayDate}</div>
        </div>
    </li>
    `);

    messagesContainer.append(message);

    setTimeout(function () {
        message.addClass('appeared');
    }, 0);
    messagesContainer.animate({ scrollTop: messagesContainer.prop('scrollHeight') }, 300);
}
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

function showUserMessage(message, datetime) {
    if (!message.trim()) return; // Avoid rendering an empty message
    renderMessageToScreen({
        text: message,
        time: datetime,
        message_side: 'right',
    });
}

function showBotMessage(message, datetime) {
    if (!message.trim()) return; // Avoid rendering an empty message
    renderMessageToScreen({
        text: message,
        time: datetime,
        message_side: 'left',
    });
    //speak(message);
}

//-----------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------
async function runPipeline(inputData) {
    try {
        const response = await fetch('https://models.aixplain.com/api/v1/execute/640b517694bf816d35a59125', {
            method: 'POST',
            body: JSON.stringify({ data: inputData }),
            headers: {
                'x-api-key': '8565e1e45b584c9358948be08e7350d3b8b36ebdac9d14ca3b3716d24764be28',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const results = await response.json();
        if (!results.data) throw new Error("Data URL is undefined.");

        const pollResponse = await pollForResponse(results.data);
        return pollResponse;
    } catch (error) {
        return "Sorry, there was an error processing your request.";
    }
}

async function pollForResponse(dataUrl) {
    const maxAttempts = 12;
    const delay = 2000;

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const statusResponse = await fetch(dataUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': '8565e1e45b584c9358948be08e7350d3b8b36ebdac9d14ca3b3716d24764be28',
                    'Content-Type': 'application/json'
                }
            });

            if (!statusResponse.ok) throw new Error(`HTTP error! status: ${statusResponse.status}`);

            const results = await statusResponse.json();
            if (results.completed) {
                return Array.isArray(results.data) ? results.data.map(item => item.text).join(' ') : results.data;
            }
        } catch (error) { }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Polling timed out after 1 minute');
}

async function getAudioOutput(inputData) {
    try {
        const audioResponse = await fetch('https://models.aixplain.com/api/v1/execute/6171eeaec714b775a4b48c19', {
            method: 'POST',
            body: JSON.stringify({
                data: inputData
            }),
            headers: {
                'x-api-key': '8565e1e45b584c9358948be08e7350d3b8b36ebdac9d14ca3b3716d24764be28',
                'Content-Type': 'application/json'
            }
        });

        if (!audioResponse.ok) throw new Error(`HTTP error! status: ${audioResponse.status}`);

        const audioResults = await audioResponse.json();
        return audioResults.data;
    } catch (error) {
        return null;
    }
}

//-----------------------------------------------------------------------------------------