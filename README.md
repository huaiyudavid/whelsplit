# whelsplit

whelsplit is a mobile-first full-stack expense sharing app similar to Splitwise.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLModel, Pydantic
- Database: SQLite
- Deployment: Ubuntu, Nginx, Uvicorn/Gunicorn

## Project Structure

```text
whelsplit/
  frontend/
  backend/
  .env.example
  README.md
```

## Features

- Track expenses with payer and participants
- Equal split and manual split support
- Dynamic balance calculation (no stored balances)
- Multi-currency support (USD, CAD, JPY)
- Display balances in selected currency
- Original expense currency amounts are preserved

## Local Setup

### 1. Clone and move into project

```bash
git clone <your-repo-url> whelsplit
cd whelsplit
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Use Python 3.11.x or 3.12.x for the backend (enforced by backend/pyproject.toml).

Backend runs on http://localhost:8000

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## API Overview

### People


### Expenses


### Balances


## Expense Payloads

Equal split example:

```json
{
  "description": "Dinner",
  "amount": 100,
  "currency": "USD",
  "payer_id": 1,
  "participants": [
    { "person_id": 2 },
    { "person_id": 3 }
  ],
  "split_type": "equal"
}
```

Manual split example:

```json
{
  "description": "Hotel",
  "amount": 300,
  "currency": "CAD",
  "payer_id": 1,
  "split_type": "manual",
  "splits": [
    { "person_id": 2, "amount": 150 },
    { "person_id": 3, "amount": 150 }
  ]
}
```

Validation rules:


## Currency Conversion

The backend uses a configurable exchange table in backend/app/services/currency.py.

Original values are always stored in original currency. Conversion is only applied for display/aggregation.

## Ubuntu Deployment (DigitalOcean)

### 1. Install system packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
```

### 2. Deploy app

```bash
cd /var/www
sudo git clone <your-repo-url> whelsplit
cd whelsplit/backend
python3 -m venv .venv
source .venv/bin/activate
pip install .
```

### 3. Test with Gunicorn + Uvicorn worker

```bash
cd /var/www/whelsplit/backend
source .venv/bin/activate
gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000 app.main:app
```

### 4. Build frontend

```bash
cd /var/www/whelsplit/frontend
npm install
npm run build
```

Serve built frontend from Nginx using frontend/dist.

## Nginx Config

Create /etc/nginx/sites-available/whelsplit:

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    root /var/www/whelsplit/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/whelsplit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

If using /api proxy, set frontend env VITE_API_BASE_URL=/api.

## Systemd Service (FastAPI)

Create /etc/systemd/system/whelsplit.service:

```ini
[Unit]
Description=whelsplit FastAPI service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/whelsplit/backend
Environment="PATH=/var/www/whelsplit/backend/.venv/bin"
ExecStart=/var/www/whelsplit/backend/.venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000 app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable whelsplit
sudo systemctl start whelsplit
sudo systemctl status whelsplit
```

## Notes

