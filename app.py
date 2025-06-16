import os
import logging
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
from pydub import AudioSegment
import PyPDF2
from gtts import gTTS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Initialize logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    conversions = db.relationship('Conversion', backref='user', lazy=True)

class Conversion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    original_filename = db.Column(db.String(100), nullable=False)
    audio_filename = db.Column(db.String(100), nullable=False)
    conversion_date = db.Column(db.DateTime, default=datetime.utcnow)
    download_count = db.Column(db.Integer, default=0)

# User loader
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def pdf_to_audio(pdf_path, audio_path, language_code='en'):
    """
    Convert PDF text to a single MP3 audio file using gTTS page-by-page chunking.

    Returns (success: bool, tts_engine_info: str or None)
    """
    try:
        logging.info(f"Starting PDF to audio conversion: {pdf_path} with language '{language_code}'")
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            if not pdf_reader.pages:
                logging.error("PDF has no pages.")
                return False, None

            temp_audio_files = []
            # Limit text size per page to avoid gTTS errors (max ~5000 chars per request)
            MAX_TTS_CHARS = 4800

            for idx, page in enumerate(pdf_reader.pages):
                text = page.extract_text() or ""
                if not text.strip():
                    logging.warning(f"Page {idx+1} has no extractable text, skipping.")
                    continue

                # Split page text into chunks if too long
                text_chunks = []
                while text:
                    chunk = text[:MAX_TTS_CHARS]
                    # Attempt to split at last space to avoid cutting words
                    last_space = chunk.rfind(' ')
                    if last_space != -1 and len(text) > MAX_TTS_CHARS:
                        chunk = chunk[:last_space]
                    text_chunks.append(chunk.strip())
                    text = text[len(chunk):]

                for chunk_idx, chunk_text in enumerate(text_chunks):
                    try:
                        tts = gTTS(text=chunk_text, lang=language_code)
                        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_page_{idx+1}_{chunk_idx+1}.mp3")
                        tts.save(temp_path)
                        temp_audio_files.append(temp_path)
                        logging.info(f"Page {idx+1} chunk {chunk_idx+1} converted successfully.")
                    except Exception as e:
                        logging.error(f"gTTS failed on page {idx+1} chunk {chunk_idx+1}: {e}")
                        continue

            if not temp_audio_files:
                logging.error("No pages or chunks converted.")
                return False, None

            # Combine audio files into one
            combined = AudioSegment.empty()
            for f in temp_audio_files:
                combined += AudioSegment.from_file(f)

            combined.export(audio_path, format="mp3")
            logging.info(f"Combined audio saved at {audio_path}")

            # Cleanup temporary files
            for f in temp_audio_files:
                try:
                    os.remove(f)
                except Exception as e:
                    logging.warning(f"Failed to remove temp file {f}: {e}")

            return True, 'gTTS (page-by-page chunking with internal chunk split)'

    except Exception as e:
        logging.error(f"Conversion error: {e}", exc_info=True)
        return False, None

# Routes (unchanged except added better flash messages and logs where needed)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            flash('Login successful!', 'success')
            logging.info(f"User logged in: {email}")
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')
            logging.warning(f"Failed login attempt for email: {email}")

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return redirect(url_for('register'))

        if User.query.filter_by(email=email).first():
            flash('Email already exists', 'error')
            return redirect(url_for('register'))

        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'error')
            return redirect(url_for('register'))

        hashed_password = generate_password_hash(password, method='scrypt')
        new_user = User(username=username, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful! Please login.', 'success')
        logging.info(f"New user registered: {email}")
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logging.info(f"User logged out: {current_user.email}")
    logout_user()
    flash('You have been logged out', 'success')
    return redirect(url_for('index'))

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        flash('No file selected (file part missing)', 'error')
        return redirect(url_for('index'))

    file = request.files['file']
    if file.filename == '':
        flash('No file selected (empty filename)', 'error')
        return redirect(url_for('index'))

    if not allowed_file(file.filename):
        flash('Invalid file type. Only PDF files are allowed.', 'error')
        return redirect(url_for('index'))

    language = request.form.get('language', 'en').lower().strip()

    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    saved_pdf_filename = f"{os.path.splitext(filename)[0]}_{timestamp}.pdf"
    pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], saved_pdf_filename)
    file.save(pdf_path)

    audio_filename = f"{os.path.splitext(filename)[0]}_{timestamp}.mp3"
    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)

    logging.info(f"User {current_user.email} uploaded file {filename} for conversion.")

    success, tts_engine = pdf_to_audio(pdf_path, audio_path, language_code=language)
    if not success:
        flash(f"Conversion failed for {filename}. Please upload a valid PDF with extractable text.", 'error')
        logging.error(f"Conversion failed for user {current_user.email} file {filename}")
        return redirect(url_for('index'))

    new_conversion = Conversion(
        user_id=current_user.id,
        original_filename=filename,
        audio_filename=audio_filename
    )
    db.session.add(new_conversion)
    db.session.commit()

    flash('Conversion successful! You can play or download your audio file.', 'success')
    logging.info(f"Conversion successful for user {current_user.email} file {filename}")

    return render_template('index.html',
                           audio_file=audio_filename,
                           original_file=filename,
                           current_time=datetime.utcnow(),
                           tts_engine=tts_engine)

@app.route('/play/<filename>')
@login_required
def play_audio(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/download/<filename>')
@login_required
def download_file(filename):
    conversion = Conversion.query.filter_by(audio_filename=filename).first()
    if conversion:
        conversion.download_count += 1
        db.session.commit()
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

@app.route('/dashboard')
@login_required
def dashboard():
    conversions = Conversion.query.filter_by(user_id=current_user.id).order_by(Conversion.conversion_date.desc()).all()
    total_downloads = sum(conv.download_count for conv in conversions)
    return render_template('dashboard.html',
                           conversions=conversions,
                           total_downloads=total_downloads)

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    logging.error(f"Internal server error: {error}", exc_info=True)
    flash("An internal server error occurred. Please try again or contact support.", "error")
    return render_template('500.html'), 500

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
