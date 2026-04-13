# GovProposal AI

AI-powered government contract proposal generator. Uses Google Gemini for content generation and SAM.gov for opportunity search.

## Features

- **Vendor Profile Builder** — Store company info, CAGE code, DUNS, NAICS codes, capabilities
- **SAM.gov Opportunity Search** — Search federal contract opportunities by keyword or NAICS code
- **AI Proposal Generator** — Generates 9 proposal sections using Google Gemini AI:
  - Cover Page, Executive Summary, Vendor Profile, Socioeconomic Status
  - Capability Statement, Past Performance, Technical Approach, Staffing Plan, Compliance Checklist
- **Rich Text Editor** — Edit AI-generated content with formatting tools
- **PDF & DOCX Export** — One-click export to professional documents

## Tech Stack

- **Backend**: Python FastAPI + Google Gemini API + SAM.gov API
- **Frontend**: React + Vite + Tailwind CSS
- **Export**: python-docx (Word) + ReportLab (PDF)

## Setup

### 1. Get API Keys (Free)

- **Google Gemini**: Get a free key at https://aistudio.google.com/apikey
- **SAM.gov**: Get a free key at https://api.data.gov/signup/

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Run server
python main.py
```

### 3. Frontend (for development)

```bash
cd frontend
npm install
npm run dev
```

### 4. Production

The backend serves the frontend build automatically. Just build the frontend and run the backend:

```bash
cd frontend && npm run build
cd ../backend && python main.py
```

Then open http://localhost:8000

## Adding New Templates

1. Edit `backend/services/export_service.py`
2. Modify the `generate_docx()` or `generate_pdf()` functions
3. Customize fonts, colors, headers, and logo placement in the style definitions

## Project Structure

```
govproposal-ai/
├── backend/
│   ├── main.py                 # FastAPI app with all endpoints
│   ├── models.py               # Pydantic request/response schemas
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # API key template
│   ├── data/vendor_profiles/   # Saved vendor profiles
│   └── services/
│       ├── ai_service.py       # Google Gemini AI integration
│       ├── sam_service.py      # SAM.gov API integration
│       └── export_service.py   # PDF & DOCX generation
└── frontend/
    ├── src/
    │   ├── App.jsx             # Routes
    │   ├── components/Layout.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── OpportunitySearch.jsx
    │   │   ├── VendorProfile.jsx
    │   │   ├── ProposalGenerator.jsx
    │   │   └── ProposalEditor.jsx
    │   └── services/api.js     # Axios API client
    └── package.json
```
