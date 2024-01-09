from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import openai
from vertexai.preview.vision_models import ImageCaptioningModel, ImageQnAModel, Image
import os
from google.oauth2 import service_account
from google.cloud import storage
from google.protobuf.json_format import MessageToDict
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
from datetime import datetime
import requests
import os
import re

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)
app.secret_key = "secret"

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'credenziali.json'
key_path = 'credenziali.json'
credentials = service_account.Credentials.from_service_account_file(
    key_path,
    scopes=["https://www.googleapis.com/auth/cloud-platform"],
)
client = storage.Client(credentials=credentials, project='artemis-406920')

openai.api_key = "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"

def get_response(messages:list):
    response = openai.ChatCompletion.create(
        model = "gpt-3.5-turbo-16k-0613",
        messages=messages,
        temperature = 1.0 # 0.0 - 2.0
        )
    print(messages)
    return response.choices[0].message

now = datetime.now()
current_date  = now.strftime("%A %Y-%m-%d")
current_time  = now.strftime("%H:%M:%S")
messages = []
chat_messages = {}
default_messages = []

@app.route('/', methods=['POST', 'GET'])
def chat():
    if request.method == 'POST':
        user_id = session.sid
        user_input = request.form.get('user_input')
        if user_id not in chat_messages:
            chat_messages[user_id] = default_messages.copy()
        link_pattern = re.compile(r'https?://\S+')
        link_match = re.search(link_pattern, user_input)
        if link_match:
            links = link_pattern.findall(user_input)
            text = link_pattern.sub('', user_input)
            content= ""
            for link in links:
                content += scraping_page(link)
                print("X")
            prompt = f"Rispondi alla domanda: {text} tramite, {content}"
            chat_messages[user_id].append({"role": "user", "content": prompt})
            if len(chat_messages[user_id]) > 2:
                chat_messages[user_id].pop(0)
            new_message = get_response(messages=chat_messages[user_id])
            chat_messages[user_id].append(new_message)
            print(new_message)
            return jsonify({'status': 'success', 'response': new_message.content})
        else:
            chat_messages[user_id].append({"role": "user", "content": user_input})
            new_message = get_response(messages=chat_messages[user_id])
            chat_messages[user_id].append(new_message)
            return jsonify({'status': 'success', 'response': new_message.content})
    return render_template('index.html')

@app.route('/search', methods=['POST', 'GET'])
def search_internet():
        action = request.form['action']
        if action == 'search':
            if request.method == 'POST':
                user_id = session.sid
                user_input = request.form['query']
                if user_id not in chat_messages:
                    chat_messages[user_id] = default_messages.copy()
                with DDGS() as ddgs:
                    results = (ddgs.text(user_input))
                    results_prompts = [next(results)['body'] for _ in range(15)]
                    print(results_prompts)
                prompt = "Usa le seguenti fonti per rispondere alla domanda:\n\n" + \
                    "\n\n".join(results_prompts) + "\n\nQuestion: " + user_input + "\n\nAnswer:"
                chat_messages[user_id].append({"role": "user", "content": prompt})
                if len(chat_messages[user_id]) > 2:
                    chat_messages[user_id].pop(0)
                new_message = get_response(messages=chat_messages[user_id])
                chat_messages[user_id].append(new_message)
                return jsonify({'status': 'success', 'response': new_message.content})
            return render_template('index.html')
        
def scraping_page(link):
    page = requests.get(link)
    soup = BeautifulSoup(page.content, 'html.parser')
    for tag in soup(['script', 'style']):
        tag.decompose()
    page_text = soup.get_text()
    prompt = f"Descrizione dettagliata del contenuto della pagina web: {page_text}"
    return prompt

@app.route('/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        user_id = session.sid
        file = request.files['file']
        user_input = request.form.get('user_input')
        if user_id not in chat_messages:
            chat_messages[user_id] = default_messages.copy()
        image_captioning_model = ImageCaptioningModel.from_pretrained("imagetext@001")
        temp_filename = 'temp.jpg'
        file.save(temp_filename)
        image = Image.load_from_file(temp_filename)
        captions = image_captioning_model.get_captions(
            image=image,
            number_of_results=3,
            language='it',
        )
        if user_input != '' :
            image_qna_model = ImageQnAModel.from_pretrained("imagetext@001")
            answer = image_qna_model.ask_question(
                image=image,
                question=user_input,
            )
            prompt = f"Stai vedendo un immagine, utilizza le seguenti descrizioni: {captions}, per rispondere alla domanda: {user_input} che ha seguente risposta breve: {answer}."
        else:
            descrption = f"Nell'immagine vedo: {captions}"
            prompt = f"Fai una descrizione dettagliata dell'immagine che vedi"
            chat_messages[user_id].append({"role": "assistant", "content": descrption})
        chat_messages[user_id].append({"role": "system", "content": prompt})
        new_message = get_response(messages=chat_messages[user_id])
        chat_messages[user_id].append(new_message)
        filename = os.path.join('Immagini', file.filename)
        file.save(filename)
        return jsonify({'status': 'success', 'response': new_message.content})
    return render_template('index.html')


@app.route('/webcam', methods=['POST', 'GET'])
def webcam():
    if request.method == 'POST':
        user_id = session.sid
        file = request.files['webimg']
        user_input = request.form.get('user_input')
        if user_id not in chat_messages:
            chat_messages[user_id] = default_messages.copy()
        image_captioning_model = ImageCaptioningModel.from_pretrained("imagetext@001")
        image_qna_model = ImageQnAModel.from_pretrained("imagetext@001")
        temp_filename = 'temp.jpg'
        file.save(temp_filename)
        image = Image.load_from_file(temp_filename)
        captions = image_captioning_model.get_captions(
            image=image,
            number_of_results=3,
            language='it',
        )
        answer = image_qna_model.ask_question(
        image=image,
        question= user_input,
        )
        prompt = f"Stai vedendo attraverso la Webcam, utilizza le seguenti descrizioni: {captions}, per rispondere alla domanda: {user_input}, che ha seguente risposta breve: {answer}."
        chat_messages[user_id].append({"role": "system", "content": prompt})
        new_message = get_response(messages=chat_messages[user_id])
        chat_messages[user_id].append(new_message)
        filename = os.path.join('Immagini', file.filename)
        file.save(filename)
        return jsonify({'status': 'success', 'response': new_message.content})
    return render_template('index.html')
        
if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0',port=int(os.environ.get('PORT', 8080)))
