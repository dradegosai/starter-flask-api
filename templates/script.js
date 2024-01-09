const sendButton = document.getElementById('send-button');
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const attivaWebcamCheckbox = document.getElementById('attiva-webcam');
userInput.addEventListener("keyup", function(event) {
if (event.keyCode === 13) {
    document.getElementById('send-button').click();
}
});
        
    var videoStream;
    function attivaWebcam() {
        var video = document.getElementById('video');
        var chat = document.getElementById('chat-window');
        if (document.getElementById('attiva-webcam').checked) {
            if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                videoStream = stream;
                video.srcObject = stream;
                video.play();
                video.style.display = 'block';
                chat.style.float = 'right';
                chat.style.width = '55%';
                })
                .catch(function (error) {
                console.log('Errore:', error);
                });
            }
        } else {
            video.pause();
            video.srcObject = null;
            videoStream.getTracks().forEach(function(track) {
            track.stop();
            });
            video.style.display = 'none';
            chat.style.float = 'left';
            chat.style.width = '100%';
            chat.classList.add('full-width');
        }
        }
function showLoadingMessage() {
    var loading_message = document.createElement('p');
    loading_message.textContent = 'Artemis sta elaborando la risposta...';
    loading_message.className = 'message-bot';
    loading_message.id = 'loading-message';
    document.getElementById('chat-window').appendChild(loading_message);
}
function showLoadingVocal() {
    var loading_message = document.createElement('p');
    loading_message.textContent = 'Artemis sta ascoltando...';
    loading_message.className = 'message-bot';
    loading_message.id = 'loading-message';
    document.getElementById('chat-window').appendChild(loading_message);
}
function showLoadingImage() {
    var loading_message = document.createElement('p');
    loading_message.textContent = "Artemis sta analizzando l' immagine...";
    loading_message.className = 'message-bot';
    loading_message.id = 'loading-message';
    document.getElementById('chat-window').appendChild(loading_message);
}
function hideLoadingMessage() {
    var loading_message = document.getElementById('loading-message');
    if (loading_message) {
        loading_message.remove();
    }
}
$("#send-button").click(function() {
    var user_input = $("#user-input").val();
    var user_message = document.createElement('p');
    user_message.textContent = 'Tu: ' + user_input;
    user_message.className = 'message-user';
    $("#user-input").val("");
    if (selectedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(image.files[0]);
        reader.onload = () => {
            const img = document.createElement('img');
            img.src = reader.result;
            img.style.maxWidth = '400px';
            img.style.maxHeight = '400px';
            img.style.display = 'block';
            img.style.marginBottom = '10px';
            document.getElementById('chat-window').appendChild(img);
            if (user_input != '') {
                document.getElementById('chat-window').appendChild(user_message);
            }
            showLoadingImage()
            const formData = new FormData();
            formData.append('file', image.files[0]);
            formData.append('user_input', user_input);

            fetch('https://us-central1-artemis-406920.cloudfunctions.net/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    hideLoadingMessage();
                    const bot_message = document.createElement('p');
                    bot_message.textContent = 'Artemis: ' + data.response;
                    bot_message.className = 'message-bot';
                    document.getElementById('chat-window').appendChild(bot_message);
                }
            })
            .catch(error => console.error(error));
        };
    } else if (document.getElementById('attiva-webcam').checked) {
        document.getElementById('chat-window').appendChild(user_message);
        showLoadingMessage();
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('webimg', blob);
            formData.append('user_input', user_input);
            fetch('https://us-central1-artemis-406920.cloudfunctions.net/webcam', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        hideLoadingMessage();
                        var bot_message = document.createElement('p');
                        bot_message.textContent = 'Artemis: ' + data.response;
                        bot_message.className = 'message-bot';
                        document.getElementById('chat-window').appendChild(bot_message);
                    }
                });
        });
    } else {
        document.getElementById('chat-window').appendChild(user_message);
        showLoadingMessage();
        $.post("https://us-central1-artemis-406920.cloudfunctions.net/chat", {user_input: user_input}, function(data) {
            if (data.status === 'success') {
                hideLoadingMessage();
                var bot_message = document.createElement('p');
                bot_message.textContent = 'Artemis: ' + data.response;
                bot_message.className = 'message-bot';
                document.getElementById('chat-window').appendChild(bot_message);
            }
        });
    }
});
$("#search-button").click(function() {
    var query = $("#user-input").val();
    var user_message = document.createElement('p');
        user_message.textContent = 'Tu: ' + query;
        user_message.className = 'message-user';
        document.getElementById('chat-window').appendChild(user_message);
        $("#user-input").val("");
    showLoadingMessage();
    $.post("https://us-central1-artemis-406920.cloudfunctions.net/search", {query: query, action: 'search'}, function(data) {
        if (data.status === 'success') {       
            hideLoadingMessage();            
            var bot_message = document.createElement('p');
            bot_message.textContent = 'Artemis: ' + data.response;
            bot_message.className = 'message-bot';
            document.getElementById('chat-window').appendChild(bot_message);
        }
    });
}); 
var recognition = new webkitSpeechRecognition();
recognition.lang = 'it-IT';
recognition.continuous = false;
recognition.interimResults = false;
var isRecording = false;

recognition.onresult = function(event) {
    var result = event.results[0][0].transcript;
    hideLoadingMessage();
    var user_message = document.createElement('p');
    user_message.textContent = 'Tu: ' + result;
    user_message.className = 'message-user';
    document.getElementById('chat-window').appendChild(user_message);
    showLoadingMessage();
    console.log(result);

    if (document.getElementById('attiva-webcam').checked) {
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('webimg', blob);
            formData.append('user_input', result);
            fetch('https://us-central1-artemis-406920.cloudfunctions.net/webcam', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        hideLoadingMessage();
                        var bot_message = document.createElement('p');
                        bot_message.textContent = 'Artemis: ' + data.response;
                        bot_message.className = 'message-bot';
                        document.getElementById('chat-window').appendChild(bot_message);
                    }
                });
        });
    } else {
        $.post("https://us-central1-artemis-406920.cloudfunctions.net/chat", {user_input: result}, function(data) {
            if (data.status === 'success') {
                hideLoadingMessage();
                var bot_message = document.createElement('p');
                bot_message.textContent = 'Artemis: ' + data.response;
                bot_message.className = 'message-bot';
                document.getElementById('chat-window').appendChild(bot_message);
            }
        });
    }
};
$("#vocal").click(function() {
if (!isRecording) {
    recognition.start();
    showLoadingVocal();
    isRecording = true;
} else {
    recognition.stop();
    isRecording = false;
}
});
const fileInput = document.getElementById('image');
const imageContainer = document.getElementById('chat-window');
let selectedFile;

fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    selectedFile = files[0];
});
function SendImage(){
    const reader = new FileReader();
            reader.readAsDataURL(image.files[0]);
            reader.onload = () => {
                const img = document.createElement('img');
                img.src = reader.result;
                img.style.maxWidth = '400px';
                img.style.maxHeight = '400px';
                img.style.display = 'block';
                img.style.marginBottom = '10px';
                document.getElementById('chat-window').appendChild(img);

                const formData = new FormData();
                formData.append('file', image.files[0]);
                formData.append('user_input', user_input);

                fetch('https://us-central1-artemis-406920.cloudfunctions.net/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        hideLoadingMessage();
                        const bot_message = document.createElement('p');
                        bot_message.textContent = 'Artemis: ' + data.response;
                        bot_message.className = 'message-bot';
                        document.getElementById('chat-window').appendChild(bot_message);
                    }
                })
                .catch(error => console.error(error));
            };
        }