# Twitch Clip Automation Bot

This repository contains a **Python** and **Node.js** application designed to automate the creation of Twitch clips based on specific chat messages. The Python application serves as a Flask server to handle clip creation and playback, while the Node.js application connects to Twitch chat, monitors messages, and communicates with the Python server to trigger clip creation.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Python Backend Setup](#python-backend-setup)
  - [Node.js Bot Setup](#nodejs-bot-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [License](#license)

## Features

- **Automated Clip Creation**: Automatically creates Twitch clips when specific keywords or patterns are detected in chat messages.
- **Clip Playback**: Plays the created clips in a queue with a Tkinter GUI displaying the current channel and game category.
- **Image Monitoring**: Detects specific images on the screen to handle unavailable clips.
- **Rate Limiting**: Ensures clips are not created too frequently for the same channel.
- **Hotkey Support**: Allows manual interruption and control of clip playback using the F1 key.
- **Scalable Chat Monitoring**: Utilizes multiple connections to monitor a large number of Twitch channels efficiently.

## Prerequisites

### Python Backend

- Python 3.9 or higher
- Pip

### Node.js Bot

- Node.js v14 or higher
- npm

## Installation

### Python Backend Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/twitch-clip-automation-bot.git
   cd twitch-clip-automation-bot
   ```

2. **Navigate to the Python Backend Directory**

   ```bash
   cd backend
   ```

3. **Create a Virtual Environment**

   ```bash
   python -m venv venv
   ```

4. **Activate the Virtual Environment**

   - **Windows**

     ```bash
     venv\Scripts\activate
     ```

   - **macOS/Linux**

     ```bash
     source venv/bin/activate
     ```

5. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

### Node.js Bot Setup

1. **Navigate to the Node.js Bot Directory**

   ```bash
   cd ../bot
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

## Configuration

### Python Backend Configuration

1. **Configure Twitch Credentials**

   Open `backend/main.py` and update the following variables with your Twitch credentials:

   ```python
   TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID'
   TWITCH_CLIENT_SECRET = 'YOUR_TWITCH_CLIENT_SECRET'

   PERMANENT_ACCESS_TOKEN = 'YOUR_PERMANENT_ACCESS_TOKEN'
   PERMANENT_REFRESH_TOKEN = 'YOUR_PERMANENT_REFRESH_TOKEN'
   ```

2. **Configure Image Paths**

   Ensure that the image paths for `"not_available.png"`, `"unavailable4000.png"`, and `"not_old_enough.png"` are correct. Update the paths if necessary:

   ```python
   not_available_img_path = r"C:\Path\To\not_available.png"
   unavailable4000_img_path = r"C:\Path\To\unavailable4000.png"
   not_old_enough_img_path = r"C:\Path\To\not_old_enough.png"
   ```

### Node.js Bot Configuration

1. **Configure Twitch Credentials**

   Open `bot/bot.js` and update the following variables with your Twitch credentials:

   ```javascript
   const TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID';
   const TWITCH_ACCESS_TOKEN = 'YOUR_TWITCH_ACCESS_TOKEN';
   ```

2. **Configure Chat Bot Credentials**

   Update the `ChatClient` configuration with your bot's username and password (OAuth token):

   ```javascript
   const client = new ChatClient({
       username: 'YOUR_BOT_USERNAME',
       password: 'oauth:YOUR_OAUTH_TOKEN',
       // ... other configurations
   });
   ```

## Usage

### Running the Python Backend

1. **Navigate to the Backend Directory**

   ```bash
   cd backend
   ```

2. **Activate the Virtual Environment**

   - **Windows**

     ```bash
     venv\Scripts\activate
     ```

   - **macOS/Linux**

     ```bash
     source venv/bin/activate
     ```

3. **Run the Backend Server**

   ```bash
   python main.py
   ```

   The Flask server will start on `http://localhost:5000`.

### Running the Node.js Bot

1. **Navigate to the Bot Directory**

   ```bash
   cd bot
   ```

2. **Run the Bot**

   ```bash
   node bot.js
   ```

   The bot will connect to Twitch chat and start monitoring messages.

## Project Structure

```
twitch-clip-automation-bot/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── not_available.png
│   ├── unavailable4000.png
│   └── not_old_enough.png
├── bot/
│   ├── bot.js
│   └── package.json
├── README.md
└── LICENSE
```

- **backend/**: Contains the Python Flask server responsible for handling clip creation and playback.
- **bot/**: Contains the Node.js application that connects to Twitch chat and monitors messages.
- **README.md**: Documentation for the project.
- **LICENSE**: License information.

## License

This project is licensed under the [MIT License](LICENSE).

---

## Code

### Backend: `main.py`

```python
import os
import asyncio
import json
from flask import Flask, request, jsonify
from datetime import datetime, timedelta, timezone
import undetected_chromedriver as uc
from selenium.webdriver.common.action_chains import ActionChains
import aiohttp
import cv2
import numpy as np
from PIL import ImageGrab
import psutil
import time
import threading
import tkinter as tk
import keyboard

app = Flask(__name__)

# Initialize the queue
clip_queue = []
is_clip_playing = False
current_channel = ""  # Track the current channel
browser_lock = asyncio.Lock()  # Lock to control browser access

# Twitch credentials
TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID'
TWITCH_CLIENT_SECRET = 'YOUR_TWITCH_CLIENT_SECRET'

# Permanent tokens
PERMANENT_ACCESS_TOKEN = 'YOUR_PERMANENT_ACCESS_TOKEN'
PERMANENT_REFRESH_TOKEN = 'YOUR_PERMANENT_REFRESH_TOKEN'
TOKEN_EXPIRY = datetime.now(timezone.utc) + timedelta(hours=1)  # Assuming token expires in 1 hour

# Load the "not available", "unavailable 4000" and "not_old_enough" images
not_available_img_path = r"C:\Path\To\not_available.png"
unavailable4000_img_path = r"C:\Path\To\unavailable4000.png"
not_old_enough_img_path = r"C:\Path\To\not_old_enough.png"
not_available_img = cv2.imread(not_available_img_path, cv2.IMREAD_GRAYSCALE)
unavailable4000_img = cv2.imread(unavailable4000_img_path, cv2.IMREAD_GRAYSCALE)
not_old_enough_img = cv2.imread(not_old_enough_img_path, cv2.IMREAD_GRAYSCALE)

# Initialize Tkinter root window
root = tk.Tk()

# Configure the window
root.overrideredirect(True)  # Remove the title bar
root.geometry("300x50+0+0")  # Width x Height + X position + Y position
root.attributes("-topmost", True)  # Keep window on top
root.configure(bg='gray')  # Change background to gray

# Create labels for the channel info
channel_label = tk.Label(root, text="", font=("Arial", 14, "bold"), bg='gray', fg='white')  # Change text to white, bold font
category_label = tk.Label(root, text="", font=("Arial", 14, "bold"), bg='gray', fg='white')  # Change text to white, bold font

# Pack the labels into the window
channel_label.pack(anchor='nw')
category_label.pack(anchor='nw')

# Event to handle interruption
interruption_event = asyncio.Event()

# Start Flask in a separate thread
def run_flask():
    app.run(debug=False)

flask_thread = threading.Thread(target=run_flask)
flask_thread.daemon = True
flask_thread.start()

# Start the main asyncio event loop
main_loop = asyncio.new_event_loop()
asyncio.set_event_loop(main_loop)

async def refresh_access_token():
    global PERMANENT_ACCESS_TOKEN, PERMANENT_REFRESH_TOKEN, TOKEN_EXPIRY
    url = 'https://id.twitch.tv/oauth2/token'
    params = {
        'grant_type': 'refresh_token',
        'refresh_token': PERMANENT_REFRESH_TOKEN,
        'client_id': TWITCH_CLIENT_ID,
        'client_secret': TWITCH_CLIENT_SECRET
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                PERMANENT_ACCESS_TOKEN = data['access_token']
                PERMANENT_REFRESH_TOKEN = data['refresh_token']
                TOKEN_EXPIRY = datetime.now(timezone.utc) + timedelta(seconds=data['expires_in'])
                print("Access token refreshed.")
            else:
                print(f"Failed to refresh access token: {response.status}")
                # Retry logic or alert here
                await asyncio.sleep(60)  # Wait for 60 seconds before retrying
                await refresh_access_token()

async def get_valid_token():
    if datetime.now(timezone.utc) >= TOKEN_EXPIRY:
        await refresh_access_token()
    return PERMANENT_ACCESS_TOKEN

@app.route('/clip', methods=['POST'])
def clip():
    global is_clip_playing, current_channel
    data = request.json
    channel_name = data['channel']
    message = data['message']
    clip_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    print(f"{clip_timestamp} - Keyword received: {channel_name}, {message}")

    asyncio.run_coroutine_threadsafe(handle_clip_creation(channel_name), main_loop)

    return jsonify({"status": "Keyword received and clip creation started"}), 200

async def handle_clip_creation(channel_name):
    clip_url = await create_clip_for_channel(channel_name)
    if clip_url:
        clip_queue.append((clip_url, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), channel_name))
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Clip URL added to queue: {clip_url}")
        print(f"Current queue length: {len(clip_queue)}")

        if len(clip_queue) > 300:
            clip_queue.pop(0)  # Remove the oldest clip if the queue exceeds 300

        if not is_clip_playing:
            asyncio.run_coroutine_threadsafe(play_next_clip(), main_loop)

async def create_clip_for_channel(channel_name):
    user_id = await get_user_id(channel_name)
    if not user_id:
        print(f"Failed to get user ID for {channel_name}")
        return None

    clip_url = await create_clip(user_id)
    return clip_url

async def get_user_id(username):
    token = await get_valid_token()
    headers = {
        'Authorization': f'Bearer {token}',
        'Client-Id': TWITCH_CLIENT_ID
    }
    url = f'https://api.twitch.tv/helix/users?login={username}'

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                if data['data']:
                    return data['data'][0]['id']
                else:
                    print(f"No user found with username {username}")
                    return None
            else:
                print(f"Failed to get user ID for {username}: {response.status}")
                return None

async def create_clip(broadcaster_id):
    token = await get_valid_token()
    headers = {
        'Authorization': f'Bearer {token}',
        'Client-Id': TWITCH_CLIENT_ID
    }
    url = f'https://api.twitch.tv/helix/clips?broadcaster_id={broadcaster_id}'

    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers) as response:
            if response.status == 202:
                data = await response.json()
                clip_id = data['data'][0]['id']
                embed_url = f"https://clips.twitch.tv/embed?clip={clip_id}&parent=localhost"
                return embed_url
            else:
                print(f"Failed to create clip: {response.status}")
                return None

async def get_game_category(broadcaster_id):
    token = await get_valid_token()
    headers = {
        'Authorization': f'Bearer {token}',
        'Client-Id': TWITCH_CLIENT_ID
    }
    url = f'https://api.twitch.tv/helix/channels?broadcaster_id={broadcaster_id}'

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                if data['data']:
                    return data['data'][0]['game_name']
                else:
                    print(f"No game category found for broadcaster ID {broadcaster_id}")
                    return "Unknown"
            else:
                print(f"Failed to get game category for broadcaster ID {broadcaster_id}: {response.status}")
                return "Unknown"

async def update_tkinter_labels(channel_name):
    user_id = await get_user_id(channel_name)
    if user_id:
        game_category = await get_game_category(user_id)
        channel_label.config(text=f"Channel: {channel_name}")
        category_label.config(text=f"Category: {game_category}")

async def play_next_clip():
    global is_clip_playing, interruption_event
    async with browser_lock:
        if not clip_queue:
            is_clip_playing = False
            print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Queue is empty, no clip to play.")
            return

        is_clip_playing = True
        clip_url, timestamp, channel_name = clip_queue.pop(0)
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Playing clip: {clip_url}")

        await update_tkinter_labels(channel_name)

        try:
            await play_clip(clip_url)
        except Exception as e:
            print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Error during clip playback: {e}")
        finally:
            is_clip_playing = False
            if clip_queue:
                asyncio.run_coroutine_threadsafe(play_next_clip(), main_loop)

async def play_clip(clip_url):
    global is_clip_playing, interruption_event  # Declare global at the beginning of the function
    driver = None
    try:
        # Using undetected_chromedriver to open and play the clip URL
        chrome_options = uc.ChromeOptions()
        chrome_options.add_argument("--start-fullscreen")

        driver = uc.Chrome(options=chrome_options, version_main=126)  # Specify the main version of Chrome
        driver.get(clip_url)
        await asyncio.sleep(1)  # Give the page time to load

        # Click in the middle of the screen to start the video
        width, height = 2560, 1440
        action = ActionChains(driver)
        action.move_by_offset(width / 2, height / 2).click().perform()

        # Check for "not available" and "unavailable 4000" images
        await monitor_clip_playback(driver, 20)  # Play for 20 seconds
    except Exception as e:
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Error during clip playback: {e}")
    finally:
        if driver:
            driver.quit()
        close_chrome()  # Ensure all Chrome processes are terminated
        is_clip_playing = False
        if clip_queue and not interruption_event.is_set():
            asyncio.run_coroutine_threadsafe(play_next_clip(), main_loop)

async def monitor_clip_playback(driver, duration):
    global is_clip_playing, interruption_event  # Declare global here to modify the variable in the outer scope
    start_time = time.time()
    while is_clip_playing and (time.time() - start_time) < duration:
        if interruption_event.is_set():
            print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Interruption event set, stopping playback.")
            interruption_event.clear()
            break
        screenshot = np.array(ImageGrab.grab())
        gray_screenshot = cv2.cvtColor(screenshot, cv2.COLOR_BGR2GRAY)

        # Define the region of interest (ROI) around the center of the screen
        screen_height, screen_width = gray_screenshot.shape
        center_x, center_y = screen_width // 2, screen_height // 2
        roi_width, roi_height = 800, 600  # Adjust the ROI size as needed
        x1 = center_x - roi_width // 2
        y1 = center_y - roi_height // 2
        x2 = center_x + roi_width // 2
        y2 = center_y + roi_height // 2
        roi = gray_screenshot[y1:y2, x1:x2]

        # Check if "not available" or "unavailable 4000" images are present in the ROI
        res_not_available = cv2.matchTemplate(roi, not_available_img, cv2.TM_CCOEFF_NORMED)
        res_unavailable4000 = cv2.matchTemplate(roi, unavailable4000_img, cv2.TM_CCOEFF_NORMED)
        res_not_old_enough = cv2.matchTemplate(roi, not_old_enough_img, cv2.TM_CCOEFF_NORMED)
        threshold = 0.8  # Set a threshold for matching
        loc_not_available = np.where(res_not_available >= threshold)
        loc_unavailable4000 = np.where(res_unavailable4000 >= threshold)
        loc_not_old_enough = np.where(res_not_old_enough >= threshold)

        if len(loc_not_available[0]) > 0 or len(loc_unavailable4000[0]) > 0 or len(loc_not_old_enough[0]) > 0:
            print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - 'Not available' or 'Unavailable 4000' image detected.")
            driver.quit()
            close_chrome()  # Ensure all Chrome processes are terminated
            is_clip_playing = False
            if clip_queue:
                asyncio.run_coroutine_threadsafe(play_next_clip(), main_loop)
            break

        await asyncio.sleep(2)

def close_chrome():
    for process in psutil.process_iter(['pid', 'name']):
        if process.info['name'] and 'chrome' in process.info['name'].lower():
            try:
                parent = psutil.Process(process.info['pid'])
                for child in parent.children(recursive=True):
                    child.kill()
                parent.kill()
            except psutil.NoSuchProcess:
                pass

# Function to handle F1 key press
def on_f1_key():
    global interruption_event
    close_chrome()
    interruption_event.set()
    if not is_clip_playing and clip_queue:
        asyncio.run_coroutine_threadsafe(play_next_clip_with_delay(), main_loop)

# Helper function to play next clip with delay
async def play_next_clip_with_delay():
    await asyncio.sleep(1)  # 1-second delay
    await play_next_clip()

# Register the F1 key press event
keyboard.add_hotkey('F1', on_f1_key)

# Start the main asyncio loop in a separate thread
def start_main_loop(loop):
    asyncio.set_event_loop(loop)
    loop.run_forever()

main_loop_thread = threading.Thread(target=start_main_loop, args=(main_loop,))
main_loop_thread.start()

# Start Tkinter mainloop
root.mainloop()
```

### Backend: `requirements.txt`

```txt
Flask
aiohttp
undetected-chromedriver
selenium
opencv-python
numpy
Pillow
psutil
keyboard
tkinter
```

### Bot: `bot.js`

```javascript
const { ChatClient, JoinRateLimiter, ConnectionRateLimiter, ConnectionPool } = require('@kararty/dank-twitch-irc');
const axios = require('axios');

const existingChannels = new Set();
const channelMessageTimestamps = new Map();

const TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID';
const TWITCH_ACCESS_TOKEN = 'YOUR_TWITCH_ACCESS_TOKEN';

const client = new ChatClient({
    username: 'YOUR_BOT_USERNAME',
    password: 'oauth:YOUR_OAUTH_TOKEN',
    rateLimits: 'bot',
    ignoreUnhandledPromiseRejections: true,
    installDefaultMixins: false,
    connection: {
        type: 'websocket',
        secure: true,
    },
    maxChannelCountPerConnection: 5000,
    connectionRateLimits: {
        parallelConnections: 3500,
        releaseTime: 20,
    }
});

client.use(new JoinRateLimiter(client));
client.use(new ConnectionPool(client, { poolSize: 150 }));
client.use(new ConnectionRateLimiter(client));

client.on('ready', () => console.log('connected'));

function processChannels(channels) {
    const newChannels = channels.filter(channel => 
        !existingChannels.has(channel.user_login)
    );

    newChannels.forEach(channel => existingChannels.add(channel.user_login));

    if (newChannels.length > 0) {
        client.joinAll(newChannels.map(channel => channel.user_login));
    }
}

async function fetchChannels() {
    let cursor;
    try {
        do {
            const response = await axios.get(`https://api.twitch.tv/helix/streams?first=100${cursor ? `&after=${cursor}` : ''}`, {
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`
                }
            });
            cursor = response.data.pagination.cursor;
            processChannels(response.data.data);
        } while (cursor);
    } catch (error) {
        console.error('Error fetching channels:', error);
    }
}

function scheduleChannelFetch() {
    fetchChannels()
        .then(() => setTimeout(scheduleChannelFetch, 300000)) // Fetch every 5 minutes
        .catch(() => setTimeout(scheduleChannelFetch, 1000));
}

client.connect();
scheduleChannelFetch();

setInterval(() => {
    console.log(`connections: ${client.connections.length}, joined: ${client.joinedChannels.size}`);
}, 15000);

const validClipMessages = [
    "10/10 clip", "lol", "lmao"
];

const validClipMessagePatterns = [
    /^LETSGO{5,10}$/, 
    /^LET'?S\sGO{5,10}$/, 
    /^AHAH{5,10}$/, 
    /^WHAAA{5,10}T$/, 
    /^LMFAOO{5,10}$/, 
    /^LOOO{5,10}L$/, 
    /^OMG{5,10}$/, 
    /^LMAOO{5,10}$/, 
    /^HYPEE{5,10}$/, 
    /^OOOOO{5,10}$/
];

function isValidClipMessage(message) {
    const trimmedMessage = message.trim();
    if (validClipMessages.includes(trimmedMessage)) {
        return true;
    }
    return validClipMessagePatterns.some(pattern => pattern.test(trimmedMessage));
}

function canSendMessage(channelName) {
    const lastMessageTime = channelMessageTimestamps.get(channelName);
    if (!lastMessageTime) return true;
    const oneHour = 60 * 60 * 1000;
    return (Date.now() - lastMessageTime) > oneHour;
}

function updateLastMessageTime(channelName) {
    channelMessageTimestamps.set(channelName, Date.now());
}

client.on("PRIVMSG", (msg) => {
    if (isValidClipMessage(msg.messageText) &&
        !msg.messageText.includes('http://') && !msg.messageText.includes('https://')) {
        if (msg.displayName === 'Nightbot' || msg.displayName === 'StreamElements') {
            return; // Ignore messages from Nightbot and StreamElements
        }
        if (canSendMessage(msg.channelName)) {
            console.log(`[#${msg.channelName}] ${msg.displayName}: ${msg.messageText}`);
            // Send the message to the Python endpoint
            axios.post('http://localhost:5000/clip', {
                channel: msg.channelName,
                message: msg.messageText
            }).then(response => {
                console.log(`Message sent to Python server: ${response.status}`);
                updateLastMessageTime(msg.channelName);
            }).catch(error => {
                console.error(`Error sending message to Python server: ${error}`);
            });
        } else {
            console.log(`Message not sent due to rate limit for channel: ${msg.channelName}`);
        }
    }
});
```

### Bot: `package.json`

```json
{
  "name": "twitch-clip-bot",
  "version": "1.0.0",
  "description": "A Twitch bot that creates clips based on chat messages.",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "@kararty/dank-twitch-irc": "^4.7.0",
    "axios": "^1.4.0"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

## Additional Notes

- **Tkinter GUI**: The Python backend includes a Tkinter GUI that displays the current channel and game category of the playing clip. It stays on top and can be controlled using the F1 key to interrupt playback.
  
- **Image Monitoring**: Ensure that the images used for detecting unavailable clips (`not_available.png`, `unavailable4000.png`, `not_old_enough.png`) are clear and accurately represent the states you want to detect.

- **Security**: Make sure to keep your Twitch credentials secure. Do not commit them to version control. Consider using environment variables or a configuration file that's excluded from the repository.

- **Dependencies**: Some dependencies like `tkinter` are part of the Python Standard Library on most systems. If you encounter issues, ensure that `tkinter` is installed on your system.

- **Chrome Driver**: The Python backend uses `undetected_chromedriver`. Ensure that the version specified (`version_main=126`) matches your installed Chrome version. You may need to adjust this based on your system.

---

Feel free to customize and enhance this bot to better fit your needs. Contributions are welcome!
