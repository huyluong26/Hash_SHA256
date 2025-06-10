const socket = io();
let currentUser = null;

socket.on('connect', () => {
    console.log('Connected to server');
    document.getElementById('status').textContent = 'Đã kết nối';
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('status').textContent = 'Chưa kết nối';
    document.getElementById('users').textContent = 'Không có';
    document.getElementById('recipient').innerHTML = '<option value="">Chọn người dùng</option>';
});

socket.on('connect_error', (error) => {
    alert(error);
});

socket.on('login_success', (username) => {
    currentUser = username;
    document.getElementById('status').textContent = `Đã đăng nhập: ${username}`;
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');
});

socket.on('updateUsers', (users) => {
    const usersDisplay = users.length > 0 ? users.join(', ') : 'Không có';
    document.getElementById('users').textContent = usersDisplay;
    const recipientSelect = document.getElementById('recipient');
    recipientSelect.innerHTML = '<option value="">Chọn người dùng</option>';
    users.forEach(user => {
        if (user !== currentUser) {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            recipientSelect.appendChild(option);
        }
    });
});

socket.on('receiveFile', (data) => {
    const fileList = document.getElementById('received-files');
    const li = document.createElement('li');
    li.className = 'p-2 bg-gray-50 rounded border';

    // Tạo URL để tải file
    const fileContent = atob(data.content);
    const arrayBuffer = new ArrayBuffer(fileContent.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < fileContent.length; i++) {
        uint8Array[i] = fileContent.charCodeAt(i);
    }
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);

    // Tính toán SHA-256 hash của file nhận được
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileData = event.target.result;
        const receivedHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(fileData)).toString();
        const integrity = receivedHash === data.hash ? 'Toàn vẹn' : 'Hỏng';
        const integrityClass = receivedHash === data.hash ? 'text-green-600' : 'text-red-600';

        li.innerHTML = `
            <p>File: <a href="${url}" download="${data.name}" class="text-blue-500 underline">${data.name}</a> từ ${data.sender}</p>
            <p class="text-sm">Hash của người gửi: ${data.hash}</p>
            <p class="text-sm">Hash nhận được: ${receivedHash}</p>
            <p class="text-sm font-semibold ${integrityClass}">Tính toàn vẹn: ${integrity}</p>
        `;
        fileList.appendChild(li);
    };
    reader.readAsArrayBuffer(blob);
});

socket.on('transfer_error', (error) => {
    alert(error);
});

function login() {
    const username = document.getElementById('username').value.trim();
    if (username) {
        socket.emit('login', username);
    } else {
        alert('Vui lòng nhập tên người dùng');
    }
}

function sendFile() {
    const fileInput = document.getElementById('fileInput');
    const recipient = document.getElementById('recipient').value;
    if (!fileInput.files.length) {
        alert('Vui lòng chọn một file');
        return;
    }
    if (!recipient) {
        alert('Vui lòng chọn người nhận');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const fileData = event.target.result;
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileData)));
        socket.emit('fileTransfer', {
            sender: currentUser,
            recipient: recipient,
            name: file.name,
            content: base64Data
        });
    };
    reader.readAsArrayBuffer(file);
}
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentUser = null;

    // Kiểm tra phần tử DOM
    const loginSection = document.getElementById('login-section');
    const mainSection = document.getElementById('main-section');
    const statusElement = document.getElementById('status');
    const usersElement = document.getElementById('users');
    const recipientSelect = document.getElementById('recipient');

    if (!loginSection || !mainSection || !statusElement || !usersElement || !recipientSelect) {
        console.error('Một hoặc nhiều phần tử DOM không tìm thấy');
        alert('Lỗi giao diện: Không tìm thấy các phần tử cần thiết');
        return;
    }

    socket.on('connect', () => {
        console.log('Connected to server');
        statusElement.textContent = 'Đã kết nối';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        statusElement.textContent = 'Chưa kết nối';
        usersElement.textContent = 'Không có';
        recipientSelect.innerHTML = '<option value="">Chọn người dùng</option>';
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        alert('Lỗi kết nối: ' + error);
    });

    socket.on('login_success', (username) => {
        console.log('Login success:', username);
        currentUser = username;
        statusElement.textContent = `Đã đăng nhập: ${username}`;
        loginSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
    });

    socket.on('updateUsers', (users) => {
        console.log('Update users:', users);
        const usersDisplay = users.length > 0 ? users.join(', ') : 'Không có';
        usersElement.textContent = usersDisplay;
        recipientSelect.innerHTML = '<option value="">Chọn người dùng</option>';
        users.forEach(user => {
            if (user !== currentUser) {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                recipientSelect.appendChild(option);
            }
        });
    });

    socket.on('receiveFile', (data) => {
        const fileList = document.getElementById('received-files');
        if (!fileList) {
            console.error('Không tìm thấy received-files element');
            return;
        }
        const li = document.createElement('li');
        li.className = 'p-2 bg-gray-50 rounded border';

        // Tạo URL để tải file
        const fileContent = atob(data.content);
        const arrayBuffer = new ArrayBuffer(fileContent.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < fileContent.length; i++) {
            uint8Array[i] = fileContent.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);

        // Tính toán SHA-256 hash của file nhận được
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileData = event.target.result;
            const receivedHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(fileData)).toString();
            const integrity = receivedHash === data.hash ? 'Toàn vẹn' : 'Hỏng';
            const integrityClass = receivedHash === data.hash ? 'text-green-600' : 'text-red-600';

            li.innerHTML = `
                <p>File: <a href="${url}" download="${data.name}" class="text-blue-500 underline">${data.name}</a> từ ${data.sender}</p>
                <p class="text-sm">Hash của người gửi: ${data.hash}</p>
                <p class="text-sm">Hash nhận được: ${receivedHash}</p>
                <p class="text-sm font-semibold ${integrityClass}">Tính toàn vẹn: ${integrity}</p>
            `;
            fileList.appendChild(li);
        };
        reader.readAsArrayBuffer(blob);
    });

    socket.on('transfer_error', (error) => {
        console.error('Transfer error:', error);
        alert('Lỗi truyền file: ' + error);
    });

    window.login = function() {
        const usernameInput = document.getElementById('username');
        if (!usernameInput) {
            console.error('Không tìm thấy username input');
            alert('Lỗi: Không tìm thấy ô nhập tên người dùng');
            return;
        }
        const username = usernameInput.value.trim();
        if (username) {
            console.log('Sending login request:', username);
            socket.emit('login', username);
        } else {
            alert('Vui lòng nhập tên người dùng');
        }
    };

    window.sendFile = function() {
        const fileInput = document.getElementById('fileInput');
        const recipient = document.getElementById('recipient').value;
        if (!fileInput.files.length) {
            alert('Vui lòng chọn một file');
            return;
        }
        if (!recipient) {
            alert('Vui lòng chọn người nhận');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileData = event.target.result;
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileData)));
            socket.emit('fileTransfer', {
                sender: currentUser,
                recipient: recipient,
                name: file.name,
                content: base64Data
            });
        };
        reader.readAsArrayBuffer(file);
    };
});