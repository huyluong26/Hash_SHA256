from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit
import os
import hashlib
import base64
import logging
from concurrent.futures import ThreadPoolExecutor

# Thiết lập logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secure_key_2025'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

users = {}
sid_to_username = {}
executor = ThreadPoolExecutor(max_workers=10)

def calculate_file_hash(file_data):
    """Tính toán SHA-256 hash của dữ liệu file."""
    sha256 = hashlib.sha256()
    sha256.update(file_data)
    return sha256.hexdigest()

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)

@socketio.on('connect')
def handle_connect():
    logging.info(f'[connect] SID: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    try:
        if request.sid in sid_to_username:
            username = sid_to_username[request.sid]
            with app.app_context():
                del users[username]
                del sid_to_username[request.sid]
                logging.info(f'[disconnect] {username} disconnected')
                socketio.emit('updateUsers', list(users.keys()))
    except Exception as e:
        logging.error(f"Error in disconnect: {e}", exc_info=True)

@socketio.on('login')
def handle_login(username):
    try:
        logging.info(f'[login] User: {username}, SID: {request.sid}')
        if username in users:
            emit('connect_error', 'Tên người dùng đã được sử dụng')
        else:
            users[username] = request.sid
            sid_to_username[request.sid] = username
            logging.info(f'[login] Users: {list(users.keys())}')
            socketio.emit('updateUsers', list(users.keys()))
            emit('login_success', username)
    except Exception as e:
        logging.error(f"Error in login: {e}", exc_info=True)

@socketio.on('fileTransfer')
def handle_file_transfer(file_data):
    try:
        recipient = file_data['recipient']
        if recipient in users:
            file_content = base64.b64decode(file_data['content'])
            file_hash = calculate_file_hash(file_content)
            logging.info(f'[fileTransfer] {file_data["sender"]} => {recipient}: {file_data["name"]} (Hash: {file_hash})')
            socketio.emit('receiveFile', {
                'sender': file_data['sender'],
                'name': file_data['name'],
                'content': file_data['content'],
                'hash': file_hash
            }, room=users[recipient])
        else:
            emit('transfer_error', f'Người nhận {recipient} không tồn tại')
    except Exception as e:
        logging.error(f"Error in fileTransfer: {e}", exc_info=True)

if __name__ == '__main__':
    os.makedirs('public', exist_ok=True)
    try:
        socketio.run(app, host='0.0.0.0', port=3000, debug=True, use_reloader=False)
    except Exception as e:
        logging.error(f"Server error: {e}", exc_info=True)