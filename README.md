# ClipItLive: Real-Time Twitch Laugh Detection and Stream Clipping

**ClipItLive** is an innovative tool that captures real-time chat data across Twitch and automatically clips the most recent 20 seconds of a stream whenever laughter is detected in the chat. Designed to monitor thousands of live channels simultaneously, ClipItLive identifies humorous moments validated by the Twitch community and generates highlights, providing an uninterrupted stream of entertainment sourced from across the platform.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Future Enhancements](#future-enhancements)

## Features

- **Real-Time Chat Monitoring**: Tracks chat messages across thousands of live Twitch channels simultaneously.
- **Automated Laugh Detection**: Detects laughter or humor-related messages using keyword patterns and triggers clip creation.
- **Instant Highlight Creation**: Captures the last 20 seconds of the stream where laughter was detected.
- **Clip Queue System**: Clips are queued and played sequentially, showcasing the latest humorous moments across Twitch.
- **Scalability**: Capable of monitoring and reacting to chats from over 100,000 active channels efficiently.
- **User Interface**: Provides a minimalistic GUI displaying current clip information, ensuring viewers have context.
- **Interruption Handling**: Allows manual interruption of clip playback, providing control over the streaming queue.

## How It Works

1. **Chat Data Collection**: A Node.js script connects to the Twitch chat using `@kararty/dank-twitch-irc`, joining thousands of channels and monitoring messages in real-time.
2. **Laugh Detection**: The script listens for specific laughter indicators in chat messages (e.g., "lol", "lmao", repeated characters like "ahahahaha") while filtering out bot messages.
3. **Triggering Clip Creation**: Upon detecting laughter, the script sends a POST request to a Python Flask server with the channel name and message.
4. **Clip Creation and Queuing**:
   - The Flask server uses the Twitch API to create a clip of the last 20 seconds of the stream.
   - The clip URL is added to a queue for sequential playback.
5. **Clip Playback**:
   - Clips are played using an undetected Chrome browser in full-screen mode.
   - The system uses image recognition to detect playback issues and handles them accordingly.
6. **User Interface and Control**:
   - A Tkinter GUI displays the current channel and category.
   - Users can interrupt playback using hotkeys (e.g., pressing `F1` to skip to the next clip).

## Architecture

### Node.js Script (`clip_detection.js`)

- **Purpose**: Connects to Twitch chat, monitors messages, detects laughter, and triggers clip creation.
- **Key Components**:
  - **Chat Client**: Uses `@kararty/dank-twitch-irc` for efficient Twitch chat connections.
  - **Channel Management**: Dynamically fetches and joins live channels using the Twitch API.
  - **Message Handling**: Implements regex patterns and keyword lists to detect laughter.
  - **Rate Limiting**: Ensures compliance with Twitch's messaging limits to avoid spam.
  - **Inter-Service Communication**: Sends data to the Python server via HTTP POST requests.

### Python Flask Server (`clip_server.py`)

- **Purpose**: Receives clip creation requests, interacts with the Twitch API, manages clip playback, and provides a GUI.
- **Key Components**:
  - **Clip Creation**: Uses asynchronous HTTP requests to the Twitch API to create clips.
  - **Queue Management**: Maintains a queue of clips to be played, ensuring smooth playback.
  - **Clip Playback**:
    - Utilizes `undetected_chromedriver` and Selenium for automated browser interactions.
    - Monitors playback using OpenCV to detect issues like unavailable content.
  - **GUI Interface**: Displays current clip information using Tkinter.
  - **Interruption Handling**: Allows users to interrupt playback with keyboard events.
  - **Token Management**: Handles Twitch API authentication and token refreshing.

## Tech Stack

- **Languages**: JavaScript (Node.js), Python 3.x
- **APIs**:
  - **Twitch API**: For fetching streams, user data, and creating clips.
- **Node.js Dependencies**:
  - `@kararty/dank-twitch-irc`: Efficient Twitch IRC client.
  - `axios`: Promise-based HTTP client.
- **Python Dependencies**:
  - `Flask`: Web framework for handling incoming requests.
  - `aiohttp`: Asynchronous HTTP client/server framework.
  - `undetected_chromedriver`: Bypasses detection for automated Chrome instances.
  - `selenium`: Automates browser interactions.
  - `opencv-python`: Image processing library for playback monitoring.
  - `Tkinter`: Standard GUI toolkit for Python.
  - `keyboard`: Global event listener for keyboard events.
- **Other Tools**:
  - **Asynchronous Programming**: Utilizes `asyncio` for non-blocking operations.
  - **Multithreading**: Separates Flask server and main event loop to optimize performance.

## Installation

### Prerequisites

- **Node.js** and **npm** installed.
- **Python 3.x** installed.
- **Twitch Developer Account**: Access to Twitch API credentials.
- **Chrome Browser**: Required for `undetected_chromedriver`.
- **Image Assets**: Ensure `not_available.png`, `unavailable4000.png`, and `not_old_enough.png` are present for playback monitoring.

### Setup Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ClipItLive.git
cd ClipItLive
```

#### 2. Set Up Node.js Script

- Navigate to the Node.js script directory:

  ```bash
  cd nodejs_script
  ```

- Install Node.js dependencies:

  ```bash
  npm install
  ```

- Configure Twitch API credentials in `clip_detection.js`:

  ```javascript
  const TWITCH_CLIENT_ID = 'your_twitch_client_id';
  const TWITCH_ACCESS_TOKEN = 'your_twitch_access_token';
  // Set your Twitch username and OAuth password
  const client = new ChatClient({
      username: 'your_username',
      password: 'oauth:your_oauth_token',
      // ...
  });
  ```

#### 3. Set Up Python Flask Server

- Navigate to the Flask server directory:

  ```bash
  cd ../flask_server
  ```

- Install Python dependencies:

  ```bash
  pip install -r requirements.txt
  ```

- Configure Twitch API credentials in `clip_server.py`:

  ```python
  TWITCH_CLIENT_ID = 'your_twitch_client_id'
  TWITCH_CLIENT_SECRET = 'your_twitch_client_secret'
  PERMANENT_ACCESS_TOKEN = 'your_permanent_access_token'
  PERMANENT_REFRESH_TOKEN = 'your_permanent_refresh_token'
  ```

- Ensure the image assets are in the specified directory:

  - `not_available.png`
  - `unavailable4000.png`
  - `not_old_enough.png`

#### 4. Run the Applications

- **Start the Flask Server**:

  ```bash
  python twitchlaughclips.py
  ```

- **Start the Node.js Script** (in a separate terminal):

  ```bash
  node bot.js
  ```

## Usage

### Automatic Operation

Once both the Node.js script and the Python Flask server are running:

- The system will automatically monitor Twitch chats for laughter indicators.
- Clips will be created and queued without any manual intervention.
- Clips will play sequentially, displaying the channel and category information.

### Manual Controls

- **Skip Current Clip**: Press `F1` to interrupt the current clip playback and move to the next clip in the queue.
- **Monitor Status**: Console logs provide real-time feedback on connections, clip creation, queue length, and playback status.

### GUI Interface

- A Tkinter window displays:

  - **Channel**: Name of the channel from which the current clip was created.
  - **Category**: The game or category the channel is streaming.

- The GUI remains on top for easy monitoring.

## Future Enhancements

- **Advanced Laughter Detection**:
  - Implement natural language processing (NLP) techniques to improve laughter detection accuracy.
- **Customizable Triggers**:
  - Allow users to define custom keywords or phrases that trigger clip creation.
- **Enhanced GUI**:
  - Develop a more interactive and informative user interface.
- **Multi-Platform Support**:
  - Extend functionality to support other streaming platforms like YouTube Live or Facebook Gaming.
- **Analytics Dashboard**:
  - Provide insights into the most clipped channels, categories, and peak times for laughter.

