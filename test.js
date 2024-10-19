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

        // Ensure voice input follows the structured stages
        await handleInteraction(transcript);
    };

    $('#voice_input').on('click', function () {
        recognition.start();
    });
});

var stage = "handleWelcome";
var topic = "";
var count = 0;
var mcqQuestions = [];
var mcqCurrentQuestion = 0;
var mcqData = [];
let botExplanation = "";
let correctAnswersCount = 0;



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
    // Retrieve the student's name from localStorage
    const studentName = localStorage.getItem('nameInput');
    
    // Check if the name exists
    if (studentName) {
        showBotMessage('Hello,' +studentName +'! AI Tutor here.');
    } else {
        showBotMessage('Hi! AI Tutor here.');
    }
});

async function handleInteraction(userMessage) {
    var getUserInput = false;
    while (!getUserInput) {
        if (stage == "handleWelcome") {
            await handleWelcome();
            topic = "";
            count = 0;
            mcqQuestions = [];
            mcqCurrentQuestion = 0;
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
            getUserInput = true; // Ensure we wait for user input after handling MCQs
        } else if (stage == "handleMCQEachQuestion") {
            await handleMCQEachQuestion();
            if (stage != "handleMCQDone") {
                getUserInput = true;
            }
        } else if (stage == "handleMCQEachAnswer") {
            await handleMCQEachAnswer(userMessage);
        } else if (stage == "handleMCQDone") {
            await handleMCQDone();
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
        mcqData=[];
        stage = "handleExplainTopic";
    } else {
        stage = "handleWelcome";
    }

    return stage;
}

// Function to explain the topic
async function handleExplainTopic() {
    let botMessage = "";
    
    // Determine which explanation to provide based on the count
    if (count === 0) {
        botMessage = "Explain the topic briefly: " + topic;
    } else if (count === 1) {
        botMessage = "Explain the topic in detail: " + topic;
    } else {
        botMessage = "Explain the topic like a kid: " + topic;
    }
    
    // Increment count after determining the message
    count++;

    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);

    // Store the explanation provided by the bot
    botExplanation = botResponse;
    
    stage = "handleCheckTopicExplanation"; // Move to check understanding stage
    return stage;
}
async function handleCheckTopicExplanation() {
    let userMessage = "Is the topic understood";    
    showBotMessage(userMessage);
    stage = "handleUserUnderstandingOfTopic";

    return stage;
}

// Function to handle user response about understanding
async function handleUserUnderstandingOfTopic(userMessage) {
    // Check if user response indicates understanding
    if (userMessage.toLowerCase() === "yes") {
        showBotMessage("Great! Let's move on to some questions.");
        stage = "handleMCQ"; // Proceed to MCQ if understood
        await handleMCQ(); // Call your MCQ handling function here
    } else {
        // Check how many times we've explained before resetting count
        if (count < 3) { 
            stage = "handleExplainTopic"; // Explain the topic again
            await handleExplainTopic(); // Call again for another explanation
        } else {
            showBotMessage("It seems you're still having trouble. Let's go over it again from scratch.");
            count = 0; // Reset count for another full round of explanations
            stage = "handleExplainTopic"; 
            await handleExplainTopic(); // Start over with brief explanation
        }
    }
}
async function handleMCQ() {
    let botMessage = "Based on the "+botExplanation+" , Share 5 MCQs on the following topic with 4 options each, without the answer. Topic is: " + topic;
    let botResponse = await sendMessageToBot(botMessage);
    
    // Split questions based on the pattern "number + period + space"
    mcqQuestions = botResponse.split(/(?=\d+\.\s)/);
    mcqCurrentQuestion = 0; // Reset current question index
    stage = "handleMCQEachQuestion"; // Move to asking questions
    return stage;
}


async function handleMCQEachQuestion() {
    if (mcqCurrentQuestion < mcqQuestions.length) {
        let currentQuestion = mcqQuestions[mcqCurrentQuestion];
        showBotMessage(currentQuestion); // Ask the current question
        stage = "handleMCQEachAnswer"; // Move to waiting for user answer
    } else {
        stage = "handleMCQDone"; // If no more questions, move to done stage
    }
    return stage;
}
var pointStr = "";
// Function to handle the user's answer to each MCQ
async function handleMCQEachAnswer(userMessage) {
    // Get the current question before incrementing
    const currentQuestion = mcqQuestions[mcqCurrentQuestion];
    var userPoint=0;
    botMessage= "For the following MCQ, provide only the letter (A, B, C, or D) of the correct answer: (for example: A)\n" + currentQuestion;
    let correctAnswer = await sendMessageToBot(botMessage);
    var correctAnswerArr = correctAnswer.split('');
    correctAnswer = correctAnswerArr[0];

    userAns = userMessage.trim().toUpperCase();

        if (correctAnswer === userAns) {
            showBotMessage("Congratulations! That's the correct answer.");
            userPoint++;
        } else {
            showBotMessage(`Oops! That's not correct. The correct answer is ${correctAnswer}.`); // Provide the correct answer
        }
    
        botMessage = "Explain the correct answer for the current question "+currentQuestion;
        let botResponse = await sendMessageToBot(botMessage);
        showBotMessage(botResponse);
        
        if (userPoint%2 == 0) {
            for(i=1;i<=userPoint;i+2){
                pointStr += "⭐";
            }
        }else{
            for(i=1;i<=userPoint;i++){
                pointStr += "⭐";
            }
        }

        
    // Store the question, user answer, and evaluation in JSON
    mcqData.push({
        'question': currentQuestion,
        'userAnswer': userMessage,
        'correctAnswer': correctAnswer, // Store the correct answer
        'evaluation': botResponse
    });

    // Increment mcqCurrentQuestion after saving the answer
    mcqCurrentQuestion++; 
    stage = "handleMCQEachQuestion";
    return stage;
}

async function handleMCQDone() {
    // Determine overall understanding based on correctAnswersCount
    let understandingFeedback;
    if (correctAnswersCount === mcqQuestions.length) {
        understandingFeedback = "Excellent! You demonstrated a clear understanding of the topic.";
    } else if (correctAnswersCount > mcqQuestions.length / 2) {
        understandingFeedback = "Good job! You have a decent understanding, but there are areas to review.";
    } else {
        understandingFeedback = "It seems there are some concepts that you need to revise.";
    }

    let botMessage = "Please analyze the following JSON object containing a list of questions with multiple-choice options, along with the user's provided answers: " + JSON.stringify(mcqData) + "..."+
        " Based on this data, " + understandingFeedback + 
        " If the user has not grasped certain concepts, kindly suggest specific areas for revision." +
        " If all answers are correct, please congratulate the user with an encouraging quote and answer it as you are a teacher and don't mention JSON object.";

    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);
    

    
    showBotMessage("You have achieved " + pointStr + " in this topic ");

    // Reset for next interaction
    stage = "handleWelcome";
    correctAnswersCount = 0; // Reset for the next session
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
            <div class="text">
                ${args.text.replace(/(\r\n|\n|\r)/g, '<br>')}
            </div>
            <div class="timestamp">${displayDate}</div>
        </div>
    </li>
    `);

    messagesContainer.append(message);

    var toggleAudio =0;
    // const audio = new Audio(botAudioResponse);
    // Only show the mic button for bot messages
    if (args.message_side === 'left') {
        let micButton = $(`<button class="mic_button" style="margin-left:55px;position: relative; top: -10px;">🔊</button>`);
        messagesContainer.append(micButton);
        
        // Check for audio response
        getAudioOutput(args.text).then(botAudioResponse => {
            // Set up click event to handle audio playback and speech synthesis
            micButton.off('click').on('click', function() {
                const audio = new Audio(botAudioResponse);
                if (toggleAudio == 0) {
                    toggleAudio = 1;
                    if (botAudioResponse) {
                        // If audio response is available, play it
                      speak(args.text);
                    }
                }
                else if (toggleAudio == 1) {
                    toggleAudio = 0;
                    stopaudio();
                    // audio.currentTime=0;
                }
            });
        });
    } 

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
function stopaudio(){
    window.speechSynthesis.cancel();
}
function clearscreen(){
    
}

var historyStorage = new Array();
var msgHistory = new Array();
function showUserMessage(message, datetime) {
    if (!message.trim()) return; // Avoid rendering an empty message
    renderMessageToScreen({
        text: message,
        time: datetime,
        message_side: 'right',
    });
    msgHistory.push({user:"you",time:datetime,msg : message});
    for(let i = 0; i< msgHistory.length; i++) {
        document.getElementById("chathistory").innerHTML = "";
        document.getElementById("chathistory").innerHTML += "<br><strong>" + msgHistory[i].user + " :</strong> " + msgHistory[i].msg;
    }
}
let historyHTML = ""; // Initialize an empty string to store HTML

function showBotMessage(message, datetime) {
    if (!message.trim()) return; // Avoid rendering an empty message
    renderMessageToScreen({
        text: message,
        time: datetime,
        message_side: 'left',
    }

    );
    msgHistory.push({user:"bot",time:datetime,msg : message});
    for(let i = 0; i< msgHistory.length; i++) {
        document.getElementById("chathistory").innerHTML = ""; 
        document.getElementById("chathistory").innerHTML += "<br><strong>" + msgHistory[i].user + " :</strong> " + msgHistory[i].msg;
    }
}
function clearscreen(){
    messagesContainer.empty();
}
function newChat() {
    let paragraphCounter = 0;
    newP = document.createElement('p');
    paragraphCounter++; // Increment the counter
    newP.id = `paragraph-${paragraphCounter}`; // Set ID
    newP.innerHTML="sumaiya";
    newP.onclick=function(){
        
    }
        document.getElementById('dropdown').appendChild(newP);
    historyStorage.push(msgHistory.length);
    for(let i = 0; i < msgHistory.length; i++) {
        historyStorage.push(msgHistory[i]);
    }
    msgHistory.length = 0;

    // Step 1: Clear the chat area
    $('.messages').empty(); // Clear all messages displayed in the chat
    
    // Step 2: Reset chat variables (optional)
    stage = "handleWelcome";      // Reset conversation stage
    topic = "";                   // Reset topic
    count = 0;                    // Reset explanation count
    mcqQuestions = [];            // Clear MCQ questions
    mcqCurrentQuestion = 0;       // Reset question index
    mcqData = [];                 // Clear previous question data
    correctAnswersCount = 0;      // Reset correct answers counter
    botExplanation = "";          // Clear stored explanation

    // Step 3: Optionally reset chat history display (if separate)
    $('#chathistory').html("");   // Clear the history display (if necessary)

    // Step 4: Show welcome message for a new chat session
    showBotMessage("Hi! Let's start a new conversation. What topic would you like to discuss?");
}


//-----------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------
async function runPipeline(inputData) {
    try {
        const response = await fetch('https://models.aixplain.com/api/v1/execute/640b517694bf816d35a59125', {
            method: 'POST',
            body: JSON.stringify({ data: inputData }),
            headers: {
                'x-api-key': '76b49b0b7a157016612ff7d23822c21faee1d97cbc80492a6da93c422e7b945b',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('HTTP error! status: ${response.status}');

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
                    'x-api-key': '76b49b0b7a157016612ff7d23822c21faee1d97cbc80492a6da93c422e7b945b',
                    'Content-Type': 'application/json'
                }
            });

            if (!statusResponse.ok) throw new Error('HTTP error! status: ${statusResponse.status}');

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
                'x-api-key': '76b49b0b7a157016612ff7d23822c21faee1d97cbc80492a6da93c422e7b945b',
                'Content-Type': 'application/json'
            }
        });

        if (!audioResponse.ok) throw new Error('HTTP error! status: ${audioResponse.status}');

        const audioResults = await audioResponse.json();
        return audioResults.data;
    } catch (error) {
        return null;
    }
}
