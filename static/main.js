$(document).ready(function () {
    loadSchoolData();
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
var className = "10th";
var subject = "";
var lesson = "";
var topic = "";
var topicList = "";
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

var data;

async function handleWelcome() {


    let userMessage = "Enter the topic you wish to learn"

    let completionStatus = JSON.stringify(getSubjectCompletionPercentage(className));
    let botMessage = "Kindly draft a status message using the following JSON containing the subjectName and completionPercentage for each subject. Promote to use this AI tutor to cover the remaiing subjects and topics: " + completionStatus;
    let botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);

    let lessonToComplete = JSON.stringify(getNextLessonAndTopic(className));
    botMessage = "The following json contain the subjectName, nextLesson in each subject and nextTopic in each lesson. Kindly present to user list of subject, lesson and topic. Ask the user to select one topic from the list: " + lessonToComplete;
    botResponse = await sendMessageToBot(botMessage);
    showBotMessage(botResponse);
    topicList = botResponse

    //showBotMessage(userMessage);
    stage = "handleCheckTopic";

    return stage;
}

async function handleCheckTopic(userMessage) {
    let botMessage = "Check if the user selection: " + userMessage + " is selected from the list of topics: " + topicList + 
        " If valid, just simple return 'valid-' followed by subject, lesson and topic name. All the 3 separated with # ";
    let botResponse = await sendMessageToBot(botMessage);
    const prefix = "valid-";
    const separator = "#";
    if (botResponse.startsWith(prefix)) {
        lessonAndTopics = botResponse.substring(prefix.length);
        const parts = lessonAndTopics.split('#');

        // Extract the lesson name and topic name
        subject = parts[0]; // This will be "valid-lesson name"
        lesson = parts[1]; // This will be "valid-lesson name"
        topic = parts[2];   // This will be "Topic name"
        markTopicAsCompleted(className, subject, lesson, topic);

        //let nextList = getNextLessonAndTopic(className);
        //let topicCompleted = JSON.stringify(getSubjectCompletionPercentage(className));
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

    markTopicAsCompleted(className, subject, lesson, topic);

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
                'x-api-key': '04bd2605bac79f25dce0b7c09ded066cf5f1bebf3ba5eb944e5bb4ff0be453b6',
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
                    'x-api-key': '04bd2605bac79f25dce0b7c09ded066cf5f1bebf3ba5eb944e5bb4ff0be453b6',
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
                'x-api-key': '04bd2605bac79f25dce0b7c09ded066cf5f1bebf3ba5eb944e5bb4ff0be453b6',
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


//=============================================================================
// Assume the JSON structure is stored in a variable called 'data'

// Helper function to find a class by name
function findClass(className) {
    return data.classes.find(c => c.name === className);
  }
  
  // 1. Given a class get the list of subjects, lessons and topics
  function getClassDetails(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => ({
      subjectName: subject.name,
      lessons: subject.lessons.map(lesson => ({
        lessonName: lesson.name,
        topics: lesson.topics.map(topic => topic.name)
      }))
    }));
  }
  
  // 2. Given a class get the list of all subjects, along with their completed lesson and topics
  function getCompletedLessonsAndTopics(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => ({
      subjectName: subject.name,
      completedLessons: subject.lessons
        .filter(lesson => lesson.topics.every(topic => topic.completed))
        .map(lesson => lesson.name),
      completedTopics: subject.lessons.flatMap(lesson =>
        lesson.topics.filter(topic => topic.completed).map(topic => topic.name)
      )
    }));
  }
  
  // 3. Given a class get the list of all subjects, along with the percentage of subject completed
  function getSubjectCompletionPercentage(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => {
      const totalTopics = subject.lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0);
      const completedTopics = subject.lessons.reduce((sum, lesson) =>
        sum + lesson.topics.filter(topic => topic.completed).length, 0);
      const percentage = (completedTopics / totalTopics) * 100;
  
      return {
        subjectName: subject.name,
        completionPercentage: Math.round(percentage * 100) / 100
      };
    });
  }
  
  // 4. Given a class get the list of all subjects, lessons in each subject along with the percentage of lessons completed
  function getLessonCompletionPercentage(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => ({
      subjectName: subject.name,
      lessons: subject.lessons.map(lesson => {
        const totalTopics = lesson.topics.length;
        const completedTopics = lesson.topics.filter(topic => topic.completed).length;
        const percentage = (completedTopics / totalTopics) * 100;
  
        return {
          lessonName: lesson.name,
          completionPercentage: Math.round(percentage * 100) / 100
        };
      })
    }));
  }
  
  // 5. Given a class get the list of all subjects, along with their remaining lesson and topics
  function getRemainingLessonsAndTopics(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => ({
      subjectName: subject.name,
      remainingLessons: subject.lessons
        .filter(lesson => lesson.topics.some(topic => !topic.completed))
        .map(lesson => ({
          lessonName: lesson.name,
          remainingTopics: lesson.topics.filter(topic => !topic.completed).map(topic => topic.name)
        }))
    }));
  }
  
  // 6. Given a class get the list of all subjects, along with their next lesson and topic from the remaining lesson and topics
  function getNextLessonAndTopic(className) {
    const classData = findClass(className);
    if (!classData) return null;
  
    return classData.subjects.map(subject => {
      const nextLesson = subject.lessons.find(lesson =>
        lesson.topics.some(topic => !topic.completed)
      );
  
      return {
        subjectName: subject.name,
        nextLesson: nextLesson ? {
          lessonName: nextLesson.name,
          nextTopic: nextLesson.topics.find(topic => !topic.completed).name
        } : null
      };
    });
  }
  
  // 7. Given a class, subject, and lesson get the next topic from the topics in that lesson
  function getNextTopic(className, subjectName, lessonName) {
    const classData = findClass(className);
    if (!classData) return null;
  
    const subject = classData.subjects.find(s => s.name === subjectName);
    if (!subject) return null;
  
    const lesson = subject.lessons.find(l => l.name === lessonName);
    if (!lesson) return null;
  
    return lesson.topics.find(topic => !topic.completed)?.name || null;
  }

//=============================================================================

// Function to load the JSON file
function loadSchoolData(filename) {
  try {
    //const rawData = fs.readFileSync(filename, 'utf8');
    //data = JSON.parse(rawData);
    data = {
        "classes": [
          {
            "name": "10th",
            "subjects": [
              {
                "name": "Mathematics",
                "lessons": [
                  {
                    "name": "Chapter 1: Real Numbers",
                    "topics": [
                      {"name": "Euclid’s Division Lemma", "completed": false},
                      {"name": "Fundamental Theorem of Arithmetic", "completed": false},
                      {"name": "Irrational Numbers", "completed": false},
                      {"name": "Decimal Expansions of Rational Numbers", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Polynomials",
                    "topics": [
                      {"name": "Zeros of a Polynomial", "completed": false},
                      {"name": "Relationship Between Zeros and Coefficients", "completed": false},
                      {"name": "Division Algorithm for Polynomials", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 3: Pair of Linear Equations in Two Variables",
                    "topics": [
                      {"name": "Graphical Method", "completed": false},
                      {"name": "Substitution Method", "completed": false},
                      {"name": "Elimination Method", "completed": false},
                      {"name": "Cross-Multiplication Method", "completed": false},
                      {"name": "Word Problems", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 4: Quadratic Equations",
                    "topics": [
                      {"name": "Standard Form of a Quadratic Equation", "completed": false},
                      {"name": "Solutions by Factorization", "completed": false},
                      {"name": "Completing the Square Method", "completed": false},
                      {"name": "Quadratic Formula", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 5: Arithmetic Progressions",
                    "topics": [
                      {"name": "Introduction to Sequences", "completed": false},
                      {"name": "General Term of an AP", "completed": false},
                      {"name": "Sum of First 'n' Terms of an AP", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 6: Triangles",
                    "topics": [
                      {"name": "Similarity of Triangles", "completed": false},
                      {"name": "Criteria for Similarity (AAA, SAS, SSS)", "completed": false},
                      {"name": "Areas of Similar Triangles", "completed": false},
                      {"name": "Pythagoras Theorem", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 7: Coordinate Geometry",
                    "topics": [
                      {"name": "Distance Formula", "completed": false},
                      {"name": "Section Formula", "completed": false},
                      {"name": "Area of a Triangle in Coordinate Plane", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 8: Introduction to Trigonometry",
                    "topics": [
                      {"name": "Trigonometric Ratios", "completed": false},
                      {"name": "Trigonometric Identities", "completed": false},
                      {"name": "Trigonometric Ratios of Complementary Angles", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 9: Applications of Trigonometry",
                    "topics": [
                      {"name": "Heights and Distances", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 10: Circles",
                    "topics": [
                      {"name": "Tangent to a Circle", "completed": false},
                      {"name": "Theorem on Tangents from an External Point", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 11: Constructions",
                    "topics": [
                      {"name": "Division of Line Segment", "completed": false},
                      {"name": "Construction of Tangents to a Circle", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 12: Areas Related to Circles",
                    "topics": [
                      {"name": "Perimeter and Area of Circle, Sector, and Segment", "completed": false},
                      {"name": "Area of Combination of Plane Figures", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 13: Surface Areas and Volumes",
                    "topics": [
                      {"name": "Surface Area of Cubes, Cylinders, Cones, and Spheres", "completed": false},
                      {"name": "Volume of Cubes, Cylinders, Cones, and Spheres", "completed": false},
                      {"name": "Problems Involving Frustum of a Cone", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 14: Statistics",
                    "topics": [
                      {"name": "Mean, Median, Mode of Grouped Data", "completed": false},
                      {"name": "Graphical Representation of Cumulative Frequency", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 15: Probability",
                    "topics": [
                      {"name": "Classical Definition of Probability", "completed": false},
                      {"name": "Probability of Complementary Events", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Physics",
                "lessons": [
                  {
                    "name": "Chapter 1: Light – Reflection and Refraction",
                    "topics": [
                      {"name": "Laws of Reflection and Refraction", "completed": false},
                      {"name": "Image Formation by Spherical Mirrors", "completed": false},
                      {"name": "Mirror Formula", "completed": false},
                      {"name": "Refraction Through Lenses", "completed": false},
                      {"name": "Lens Formula", "completed": false},
                      {"name": "Magnification", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Human Eye and the Colourful World",
                    "topics": [
                      {"name": "Structure of the Human Eye", "completed": false},
                      {"name": "Defects of Vision and Their Correction", "completed": false},
                      {"name": "Dispersion of Light by a Prism", "completed": false},
                      {"name": "Atmospheric Refraction", "completed": false},
                      {"name": "Scattering of Light", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 3: Electricity",
                    "topics": [
                      {"name": "Electric Current and Circuit", "completed": false},
                      {"name": "Ohm’s Law", "completed": false},
                      {"name": "Resistance, Factors Affecting Resistance", "completed": false},
                      {"name": "Series and Parallel Circuits", "completed": false},
                      {"name": "Heating Effect of Electric Current", "completed": false},
                      {"name": "Electric Power", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 4: Magnetic Effects of Electric Current",
                    "topics": [
                      {"name": "Magnetic Field and Its Representation", "completed": false},
                      {"name": "Magnetic Field Due to a Current-Carrying Conductor", "completed": false},
                      {"name": "Force on a Current-Carrying Conductor", "completed": false},
                      {"name": "Electromagnetic Induction", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 5: Sources of Energy",
                    "topics": [
                      {"name": "Conventional Sources of Energy (Fossil Fuels, Thermal Power, etc.)", "completed": false},
                      {"name": "Non-Conventional Sources (Solar Energy, Wind Energy, etc.)", "completed": false},
                      {"name": "Advantages and Limitations of Energy Sources", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Chemistry",
                "lessons": [
                  {
                    "name": "Chapter 1: Chemical Reactions and Equations",
                    "topics": [
                      {"name": "Chemical Equations", "completed": false},
                      {"name": "Types of Reactions: Combination, Decomposition, Displacement, Double Displacement", "completed": false},
                      {"name": "Redox Reactions", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Acids, Bases, and Salts",
                    "topics": [
                      {"name": "Properties of Acids and Bases", "completed": false},
                      {"name": "The pH Scale", "completed": false},
                      {"name": "Important Salts (e.g., Common Salt, Baking Soda)", "completed": false},
                      {"name": "Uses of Acids, Bases, and Salts", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 3: Metals and Non-Metals",
                    "topics": [
                      {"name": "Physical and Chemical Properties of Metals and Non-Metals", "completed": false},
                      {"name": "Reactivity Series", "completed": false},
                      {"name": "Extraction of Metals", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 4: Carbon and Its Compounds",
                    "topics": [
                      {"name": "Classification of Carbon Compounds", "completed": false},
                      {"name": "Functional Groups (Alkanes, Alkenes, Alkynes)", "completed": false},
                      {"name": "Nomenclature of Organic Compounds", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 5: Periodic Classification of Elements",
                    "topics": [
                      {"name": "Mendeleev’s Periodic Table", "completed": false},
                      {"name": "Modern Periodic Table", "completed": false},
                      {"name": "Trends in the Periodic Table (Atomic Size, Metallic Character)", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Biology",
                "lessons": [
                  {
                    "name": "Chapter 1: Life Processes",
                    "topics": [
                      {"name": "Nutrition, Respiration, Transport, and Excretion in Plants and Animals", "completed": false},
                      {"name": "Photosynthesis in Plants", "completed": false},
                      {"name": "Respiration in Organisms", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Control and Coordination",
                    "topics": [
                      {"name": "Nervous System in Humans", "completed": false},
                      {"name": "Hormones and Their Functions", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 3: How do Organisms Reproduce?",
                    "topics": [
                      {"name": "Asexual and Sexual Reproduction", "completed": false},
                      {"name": "Reproductive Health", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 4: Heredity and Evolution",
                    "topics": [
                      {"name": "Mendelian Genetics", "completed": false},
                      {"name": "Evolutionary Processes", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 5: Our Environment",
                    "topics": [
                      {"name": "Ecosystem and its Components", "completed": false},
                      {"name": "Biogeochemical Cycles", "completed": false},
                      {"name": "Environmental Issues", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "English",
                "lessons": [
                  {
                    "name": "Prose",
                    "topics": [
                      {"name": "The Hundred Dresses - I", "completed": false},
                      {"name": "The Hundred Dresses - II", "completed": false},
                      {"name": "The Beggar", "completed": false},
                      {"name": "The Black Aeroplane", "completed": false}
                    ]
                  },
                  {
                    "name": "Poetry",
                    "topics": [
                      {"name": "Dust of Snow", "completed": false},
                      {"name": "Fire and Ice", "completed": false},
                      {"name": "A Tiger in the Zoo", "completed": false},
                      {"name": "How to Tell Wild Animals", "completed": false}
                    ]
                  },
                  {
                    "name": "Grammar",
                    "topics": [
                      {"name": "Tenses", "completed": false},
                      {"name": "Voice", "completed": false},
                      {"name": "Direct and Indirect Speech", "completed": false},
                      {"name": "Prepositions", "completed": false}
                    ]
                  },
                  {
                    "name": "Writing Skills",
                    "topics": [
                      {"name": "Letter Writing", "completed": false},
                      {"name": "Article Writing", "completed": false},
                      {"name": "Essay Writing", "completed": false},
                      {"name": "Story Writing", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "History",
                "lessons": [
                  {
                    "name": "Chapter 1: The Rise of Nationalism in Europe",
                    "topics": [
                      {"name": "Growth of Nationalism", "completed": false},
                      {"name": "European Revolutions", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Nationalism in India",
                    "topics": [
                      {"name": "Freedom Struggle", "completed": false},
                      {"name": "Role of Different Communities", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Geography",
                "lessons": [
                  {
                    "name": "Chapter 1: Resources and Development",
                    "topics": [
                      {"name": "Types of Resources", "completed": false},
                      {"name": "Resource Planning", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Agriculture",
                    "topics": [
                      {"name": "Types of Farming", "completed": false},
                      {"name": "Agricultural Practices in India", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Political Science",
                "lessons": [
                  {
                    "name": "Chapter 1: Power Sharing",
                    "topics": [
                      {"name": "Forms of Power Sharing", "completed": false},
                      {"name": "Challenges of Power Sharing", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Federalism",
                    "topics": [
                      {"name": "Concept of Federalism", "completed": false},
                      {"name": "Decentralization in India", "completed": false}
                    ]
                  }
                ]
              },
              {
                "name": "Economics",
                "lessons": [
                  {
                    "name": "Chapter 1: Development",
                    "topics": [
                      {"name": "Human Development", "completed": false},
                      {"name": "Sustainable Development", "completed": false}
                    ]
                  },
                  {
                    "name": "Chapter 2: Sectors of the Indian Economy",
                    "topics": [
                      {"name": "Primary, Secondary, and Tertiary Sectors", "completed": false},
                      {"name": "Employment in Sectors", "completed": false}
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
      
    console.log('Data loaded successfully.');
  } catch (error) {
    console.error('Error loading the file:', error);
  }
}

// Function to mark a topic as completed
function markTopicAsCompleted(className, subjectName, lessonName, topicName) {
  const classData = findClass(className);
  if (!classData) {
    console.log(`Class ${className} not found.`);
    return;
  }

  const subject = classData.subjects.find(s => s.name === subjectName);
  if (!subject) { 
    console.log(`Subject ${subjectName} not found in class ${className}.`);
    return;
  }

  const lesson = subject.lessons.find(l => l.name === lessonName);
  if (!lesson) {
    console.log(`Lesson ${lessonName} not found in subject ${subjectName}.`);
    return;
  }

  const topic = lesson.topics.find(t => t.name === topicName);
  if (!topic) {
    console.log(`Topic ${topicName} not found in lesson ${lessonName}.`);
    return;
  }

  topic.completed = true;
  console.log(`Topic ${topicName} marked as completed.`);
}
