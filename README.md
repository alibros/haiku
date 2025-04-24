# Haiku Snapshot

A web application that captures images from your webcam, generates a 5-7-5 haiku about each image using OpenAI's GPT-4 vision API, and stores both the image and haiku in a gallery. Built with Node.js, Express, SQLite, and vanilla JS.

---

## Features
- 📸 **Capture Images:** Use your webcam to snap a photo directly from the browser.
- 🧠 **AI-Powered Haiku:** Each snapshot is sent to OpenAI's API to generate a unique haiku describing the image.
- 🖼️ **Gallery:** Browse a gallery of your latest 20 haiku-image pairs.
- 💾 **Local Storage:** Images and haikus are stored in a local SQLite database.

---

## Demo
1. Go to the homepage (`/`).
2. Allow webcam access and click "Capture & Haiku".
3. Instantly receive an AI-generated haiku about your image.
4. Visit `/gallery` to view the latest haiku-image posts.

---

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- An OpenAI API key with vision model access

### Installation
1. **Clone the repo:**
   ```sh
   git clone <your-repo-url>
   cd haiku
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env.local` file at the root with:
     ```env
     OPENAI_API_KEY="sk-..."
     ```
4. **Initialize the database:**
   ```sh
   node scripts/init-db.js
   ```
5. **Run the server:**
   ```sh
   node server.js
   ```
6. **Visit:** [http://localhost:3002](http://localhost:3002)

---

## Project Structure
```
haiku/
├── data/              # SQLite DB file
│   └── db.sqlite
├── public/            # Static assets
│   ├── css/styles.css
│   ├── images/        # Uploaded images
│   └── js/
│       ├── camera.js  # Webcam & upload logic
│       └── gallery.js # (Gallery logic placeholder)
├── scripts/
│   └── init-db.js     # DB initialization script
├── views/
│   ├── index.html     # Main UI
│   └── gallery.html   # Gallery UI
├── server.js          # Express server
├── package.json
└── README.md
```

---

## API Endpoints
- `GET /` — Main page (camera)
- `POST /upload` — Upload image, receive haiku
- `GET /gallery` — Gallery page
- `GET /stream` — JSON: latest 20 haiku-image pairs

---

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: (Optional) Port to run the server (default: 3002)

---

## License
ISC

---

## Acknowledgments
- [OpenAI GPT-4 Vision API](https://platform.openai.com/docs/guides/vision)
- [Express](https://expressjs.com/)
- [Multer](https://github.com/expressjs/multer)
- [SQLite](https://www.sqlite.org/index.html)

---

## Author
- Your Name Here
