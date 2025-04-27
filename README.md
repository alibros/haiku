# Haiku Snapshot

An interactive web application where users can capture or upload an image, receive an AI-generated haiku inspired by it, and see an AI-generated visual interpretation of the haiku.

## Features

*   **Image Input:**
    *   Use live camera feed via browser.
    *   Upload an image file (drag & drop or browse).
*   **AI Haiku Generation:** Submits the image to OpenAI (GPT-4) to generate a 5-7-5 haiku.
*   **AI Image Generation:** Uses the generated haiku as a prompt for OpenAI (GPT-Image) to create an abstract visual representation.
*   **Gallery View:** Browse through past creations, showing the original image, the generated haiku, and the AI-generated image.
*   **AI Slideshow:** An immersive, full-screen view that automatically cycles through the AI-generated images and their haikus with background music.
*   **Asynchronous Processing:** Haiku is returned quickly while AI image generation happens in the background; status polling updates the UI when the image is ready.
*   **Responsive Design:** Adapts to different screen sizes.
*   **Persistent Storage:** Uses SQLite to save generated posts.

## Tech Stack

*   **Backend:** Node.js, Express
*   **Database:** SQLite
*   **AI:** OpenAI API (GPT-4.1 for text, GPT-Image for images)
*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **File Uploads:** Multer
*   **Environment Variables:** dotenv

## Setup & Running Locally

1.  **Prerequisites:**
    *   Node.js (v18 or later recommended)
    *   npm
    *   An OpenAI API Key


2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Create a file named `.env.local` in the project root.
    *   Add your OpenAI API key to this file:
        ```
        OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        ```
    *   *(Important: Ensure `.env.local` is added to your `.gitignore` file to avoid committing your key!)*

4.  **Run the application:**
    ```bash
    npm start
    ```
    This command will first run the database initialization script (`scripts/init-db.js`) and then start the server (`server.js`). The application should be available at `http://localhost:3002` (or the port specified by `process.env.PORT`).

## Deployment Notes

*   **Environment Variables:** Ensure the `OPENAI_API_KEY` environment variable is set in your deployment platform (Vercel, Render, etc.).
*   **Database Persistence:** The SQLite database (`data/db.sqlite`) requires persistent storage. On platforms like Render, you **must** configure a **Persistent Disk** and mount it (e.g., to `/var/data`). Update the `dbPath` variable in `server.js` and `scripts/init-db.js` to use the absolute mount path (e.g., `/var/data/db.sqlite`). Without persistent storage, the database will be lost on each deploy/restart.
*   **Build Command:** Typically none needed unless you add a build step.
*   **Start Command:** `npm start` (as configured in `package.json`).

## File Structure

```
/
|-- data/              # SQLite database file
|-- node_modules/      # Dependencies
|-- public/            # Static assets (CSS, JS, images)
|   |-- css/
|   |-- js/
|   |-- images/        # Uploaded and AI-generated images
|-- scripts/           # Database utility scripts (init, flush)
|-- views/             # HTML pages
|-- .env.local         # Local environment variables (GITIGNORED!)
|-- .gitignore
|-- package.json
|-- package-lock.json
|-- server.js          # Main Express server logic
|-- README.md          # This file
```

## Demo
1. Go to the homepage (`/`).
2. Allow webcam access and click "Capture & Haiku".
3. Instantly receive an AI-generated haiku about your image.
4. Visit `/gallery` to view the latest haiku-image posts.

## API Endpoints
- `GET /` — Main page (camera)
- `POST /upload` — Upload image, receive haiku
- `GET /gallery` — Gallery page
- `GET /stream` — JSON: latest 20 haiku-image pairs

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: (Optional) Port to run the server (default: 3002)

## License
ISC

## Acknowledgments
- [OpenAI GPT-4 Vision API](https://platform.openai.com/docs/guides/vision)
- [Express](https://expressjs.com/)
- [Multer](https://github.com/expressjs/multer)
- [SQLite](https://www.sqlite.org/index.html)

## Woo!
- Ali
