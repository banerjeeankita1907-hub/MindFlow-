# MindFlow

A personal wellbeing and productivity workspace for journaling, mood check-ins, tasks, goals, focus sessions, and progress review.

> **Scope note:** MindFlow is a self-reflection and productivity prototype. AI-generated text is not medical advice, diagnosis, counselling, or crisis support. Mood trends are descriptive logs, not clinical assessments.

## What is included

- **Daily check-ins** for recording mood, sleep, and energy.
- **Journal** for private reflections and prompts.
- **Mood tracker** for viewing logged mood and energy over time.
- **Tasks and goals** for planning and progress updates.
- **Focus sessions** for time-boxed work.
- **Analytics** for summarising the records entered into the app.

The exact functionality available depends on the current backend and frontend implementation. External AI and database-backed features require the services and credentials described below.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Tailwind CSS |
| Backend | FastAPI, Python |
| Persistence | MongoDB via Motor |
| AI integration | Provider adapter configured on the server |
| Authentication | JWT-based API authentication |

## Run locally

### Backend

```bash
cd app/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with a MongoDB URL, an allowed frontend origin, a provider key, and a new random JWT secret. Never commit `.env`.

Start the API using the command appropriate to the backend entry point, for example:

```bash
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

Install the dependencies in `app/frontend` using the package manager and manifest supplied with that frontend, then start its development server. Configure its API base URL to point at the local backend.

## Configuration

See [app/backend/.env.example](app/backend/.env.example). Use a unique, high-entropy `JWT_SECRET` for every deployment. Set `CORS_ORIGINS` to explicit trusted origins; do not use a wildcard with credentials in production.

## Privacy and security

- Do not commit API keys, JWT secrets, database credentials, or real user data.
- Use HTTPS and restrict CORS to the deployed frontend origin.
- Treat journal entries and mood logs as sensitive personal information.
- Before production use, review authentication, authorization, retention, backups, and access controls.
- Rotate any credential that has ever been committed, even after removing the file from the latest revision; Git history can retain older versions.

## Project status

This repository is a prototype, not a hosted or audited health service. Configure your own database and model provider to exercise the full stack. Validate the current code and dependencies before deploying it.

## License

No open-source license is currently declared. All rights are reserved by default until a license is added.
