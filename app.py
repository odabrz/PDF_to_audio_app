from flask import Flask, render_template, request, redirect, url_for, send_from_directory, flash, session
import os
import PyPDF2
import pyttsx3
from werkzeug.utils import secure_filename
from datetime import datetime
import sqlite3
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
app.config['DATABASE'] = 'database/conversions.db'

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('database', exist_ok=True)

# Database setup
def get_db():
    db = sqlite3.connect(app.config['DATABASE'])
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''
            CREATE TABLE IF NOT EXISTS conversions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_ip TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                audio_filename TEXT NOT NULL,
                conversion_date TEXT NOT NULL,
                download_count INTEGER DEFAULT 0
            )
        ''')
        db.commit()

init_db()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def pdf_to_audio(pdf_path, audio_path):
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 0.9)
        
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = "".join(page.extract_text() for page in pdf_reader.pages)
        
        engine.save_to_file(text, audio_path)
        engine.runAndWait()
        return True, "Conversion successful"
    except Exception as e:
        return False, str(e)

def log_conversion(user_ip, original_file, audio_file):
    db = get_db()
    db.execute(
        'INSERT INTO conversions (user_ip, original_filename, audio_filename, conversion_date) VALUES (?, ?, ?, ?)',
        (user_ip, original_file, audio_file, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    )
    db.commit()

def increment_download(audio_file):
    db = get_db()
    db.execute(
        'UPDATE conversions SET download_count = download_count + 1 WHERE audio_filename = ?',
        (audio_file,)
    )
    db.commit()

def get_user_conversions(user_ip):
    db = get_db()
    return db.execute(
        'SELECT * FROM conversions WHERE user_ip = ? ORDER BY conversion_date DESC',
        (user_ip,)
    ).fetchall()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('index'))
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(pdf_path)
        
        audio_filename = f"{os.path.splitext(filename)[0]}_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp3"
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        
        success, message = pdf_to_audio(pdf_path, audio_path)
        
        if success:
            user_ip = request.remote_addr
            log_conversion(user_ip, filename, audio_filename)
            session['recent_conversion'] = audio_filename
            return render_template('index.html', 
                                audio_file=audio_filename,
                                original_file=filename)
        else:
            flash(f'Conversion failed: {message}', 'error')
            return redirect(url_for('index'))
    
    flash('Invalid file type. Please upload a PDF file.', 'error')
    return redirect(url_for('index'))

@app.route('/play/<filename>')
def play_audio(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/download/<filename>')
def download_file(filename):
    increment_download(filename)
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

@app.route('/dashboard')
def dashboard():
    user_ip = request.remote_addr
    conversions = get_user_conversions(user_ip)
    return render_template('dashboard.html', conversions=conversions)

if __name__ == '__main__':
    app.run(debug=True)