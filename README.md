<!-- ========================================================================= -->
<!--                             CARETRACK AI                                 -->
<!--       Next-Generation Intelligent Clinical Diagnostics & Triage Platform -->
<!-- ========================================================================= -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:090d16,40:1e1b4b,80:0f766e,100:0284c7&height=240&section=header&text=CareTrack%20AI&fontSize=54&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Next-Gen%20Intelligent%20Healthcare%20Diagnostics%20%26%20Clinical%20Triage&descSize=19&descColor=93c5fd&descAlignY=60" alt="CareTrack AI Banner" width="100%" />

<br/>

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=1200&color=38BDF8&center=true&vCenter=true&width=750&height=42&lines=Precision+Disease+Prediction+via+Gaussian+Naive+Bayes;713+Condition+Classes+%E2%80%A2+377+Clinical+Symptom+Features;Generative+AI+Clinical+Triage+%26+Remedy+Enrichment;Contextual+Medical+Chatbot+Powered+by+OpenAI+%26+Gemini;Full+Patient+Portal+%26+Role-Based+Admin+Control+Center" alt="Typing SVG" />
</a>

<p align="center">
  <strong>Bridging multi-signal probabilistic machine learning with modern generative AI for accessible, reliable clinical insights.</strong>
</p>

<!-- Badges Bar -->
<p align="center">
  <a href="https://theneerajgrover.github.io/CareTrackAI/">
    <img src="https://img.shields.io/badge/Live_Demo-GitHub_Pages-22c55e?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://caretrack-ai.onrender.com/api/health">
    <img src="https://img.shields.io/badge/Backend_API-Render_Live-0ea5e9?style=for-the-badge&logo=render&logoColor=white" alt="Backend API" />
  </a>
  <a href="#-machine-learning--performance">
    <img src="https://img.shields.io/badge/ML_Accuracy-86.6%25-8b5cf6?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="ML Accuracy" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge&logo=apache" alt="Apache 2.0 License" />
  </a>
  <img src="https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white" alt="Build Passing" />
</p>

<!-- Quick Navigation Links -->
<p align="center">
  <a href="#-executive-overview">Overview</a> •
  <a href="#-key-capabilities">Key Features</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-machine-learning--performance">ML Engine</a> •
  <a href="#-repository-structure">Structure</a> •
  <a href="#-getting-started">Installation</a> •
  <a href="#-platform-showcase">Showcase</a> •
  <a href="#-license">License</a>
</p>

---

</div>

<br/>

## 🩺 Executive Overview

**CareTrack AI** is an advanced, full-stack medical intelligence platform engineered to evaluate multi-symptom signals, produce calibrated disease predictions, and deliver structured clinical triage information in real time. 

Built with an enterprise **React 19** frontend and a high-performance **Python Flask** REST backend, the platform leverages a **Gaussian Naive Bayes** classifier trained on **377 clinical symptom features** across **713 condition categories** (~86.6% accuracy), dynamically enriched through **Google Gemini** for home remedies, dietary guidance, warning indicators, and medical specialist recommendations.

> [!NOTE]  
> **Clinical Disclaimer:** CareTrack AI is an assistive decision-support and health-assessment platform. It is designed to enhance health awareness and streamline triage; it does not replace professional clinical evaluation or emergency medical services.

<br/>

---

## ✨ Key Capabilities

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧠 Multi-Signal Disease Prediction</h3>
      <ul>
        <li><strong>Gaussian Naive Bayes Engine:</strong> High-dimensional probabilistic classification against 713 disease profiles.</li>
        <li><strong>377 Symptom Signals:</strong> Granular multi-system symptom collection (cardiovascular, respiratory, gastrointestinal, muscular, systemic).</li>
        <li><strong>Calibrated Probabilities:</strong> Quantified confidence scoring avoiding dogmatic diagnoses.</li>
        <li><strong>Guest & Registered Flow:</strong> Instant free guest assessment with seamless profile migration.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🩺 Generative AI Clinical Triage</h3>
      <ul>
        <li><strong>Dual-Engine AI:</strong> Powered by <strong>Google Gemini</strong> and <strong>OpenAI GPT</strong>.</li>
        <li><strong>Clinical Risk Stratification:</strong> Automatic classification into Low, Moderate, High, or Critical urgency tiers.</li>
        <li><strong>Holistic Care Guidance:</strong> Tailored home remedies, precautions, dietary advice, and lifestyle modifications.</li>
        <li><strong>Specialist Directives:</strong> Specific medical discipline recommendations (e.g., Cardiologist, Pulmonologist, Neurologist).</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>💬 Contextual Medical Chatbot</h3>
      <ul>
        <li><strong>Strict Clinical Guardrails:</strong> Dedicated domain boundaries that reject non-medical queries with polite redirections.</li>
        <li><strong>Symptom Context Awareness:</strong> Dynamic clarification dialogue based on user-provided symptoms and reports.</li>
        <li><strong>Emergency Detection:</strong> Instant red-flag identification routing critical conditions to emergency care.</li>
        <li><strong>Persistent Sessions:</strong> Threaded conversation storage backed by PostgreSQL.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>👤 Unified Patient Portal</h3>
      <ul>
        <li><strong>Longitudinal Health Tracking:</strong> Historical timeline of completed health analyses and trends.</li>
        <li><strong>Clinical Health Reports:</strong> Downloadable, structured assessment documentation with diagnostic breakdowns.</li>
        <li><strong>Interactive Health Workspace:</strong> Profile health vitals, saved findings, and tailored triage recommendations.</li>
        <li><strong>Secure JWT Sessions:</strong> Dual access and refresh token authentication with bcrypt password hashing.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🛡️ Executive Admin Control Center</h3>
      <ul>
        <li><strong>Patient Registry Management:</strong> Administrative view and moderation of registered patient profiles.</li>
        <li><strong>Diagnostic Report Governance:</strong> Real-time oversight of all platform-generated reports and predictions.</li>
        <li><strong>Symptom Database Management:</strong> Browse, verify, and monitor the clinical symptom matrix.</li>
        <li><strong>Live Health & AI Monitoring:</strong> Real-time status for AI services, database latency, and auth systems.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🔒 Enterprise Reliability & Security</h3>
      <ul>
        <li><strong>Zero Frontend Secrets:</strong> All sensitive API keys and database credentials reside securely server-side.</li>
        <li><strong>Comprehensive Audit Trail:</strong> Immutable logging of all administrative actions and sensitive events.</li>
        <li><strong>PostgreSQL Relational Core:</strong> ACID-compliant schema managing users, predictions, chat, and system telemetry.</li>
        <li><strong>Automated CI/CD Pipeline:</strong> Zero-downtime GitHub Actions workflow deploying to GitHub Pages.</li>
      </ul>
    </td>
  </tr>
</table>

<br/>

---

## 💻 Technology Stack

<div align="center">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,python,flask,postgres,sklearn,githubactions" alt="Tech Stack Icons" />
</div>

<br/>

| Tier | Technologies & Frameworks | Description |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript_5.7-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat-square) ![Lucide React](https://img.shields.io/badge/Lucide_React-F56565?style=flat-square) | Modern, responsive SPA architecture featuring high-speed Vite bundling, atomic Tailwind styling, fluid transitions, and accessible UI controls. |
| **Backend** | ![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=flat-square&logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/Flask_3.1-000000?style=flat-square&logo=flask&logoColor=white) ![Flask-CORS](https://img.shields.io/badge/Flask--CORS-009688?style=flat-square) ![PyJWT](https://img.shields.io/badge/PyJWT_2.10-black?style=flat-square&logo=jsonwebtokens&logoColor=white) ![Bcrypt](https://img.shields.io/badge/Bcrypt_4.2-4A154B?style=flat-square) | RESTful API service coordinating authentication, feature vectorization, inference execution, database operations, and AI orchestration. |
| **Machine Learning** | ![scikit-learn](https://img.shields.io/badge/scikit--learn_1.6-F7931E?style=flat-square&logo=scikit-learn&logoColor=white) ![NumPy](https://img.shields.io/badge/NumPy_2.2-013243?style=flat-square&logo=numpy&logoColor=white) ![SciPy](https://img.shields.io/badge/SciPy_1.15-8CAAE6?style=flat-square&logo=scipy&logoColor=white) ![Joblib](https://img.shields.io/badge/Joblib-3776AB?style=flat-square) | High-performance Gaussian Naive Bayes classifier processing 377 symptom signals across 713 disease categories with ~86.6% test accuracy. |
| **Generative AI** | ![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=flat-square&logo=google&logoColor=white) ![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o_Mini-412991?style=flat-square&logo=openai&logoColor=white) | Google Gemini 2.5 Flash / Flash Lite for automated clinical triage, risk evaluation, and remedies; OpenAI GPT-4o-mini for domain-bounded medical chat. |
| **Data Persistence** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15+-336791?style=flat-square&logo=postgresql&logoColor=white) ![psycopg2](https://img.shields.io/badge/psycopg2--binary-336791?style=flat-square) | Relational database schema with indexes on predictions, users, symptom mappings, chat logs, system notifications, and security audit events. |
| **Infrastructure** | ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=flat-square&logo=githubpages&logoColor=white) ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white) | Static SPA hosting on GitHub Pages, containerized backend hosting on Render, and continuous deployment workflows via GitHub Actions. |

<br/>

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    classDef client fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef backend fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef ml fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
    classDef genai fill:#4c1d95,stroke:#c084fc,stroke-width:2px,color:#f8fafc;
    classDef db fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc;

    subgraph UserInterface["Client Tier (GitHub Pages)"]
        UI["React 19 SPA<br/>(TypeScript + Tailwind 4)"]:::client
        Portal["Patient Portal & Workspace"]:::client
        AdminUI["Admin Executive Center"]:::client
        Router["Hash-Based Client Router"]:::client
    end

    subgraph APITier["Application Tier (Render Service)"]
        API["Flask REST API Engine<br/>(app.py & admin_routes.py)"]:::backend
        AuthService["Auth Manager<br/>(JWT + Bcrypt)"]:::backend
        ChatService["Medical Chat Engine<br/>(Domain Guardrails)"]:::backend
        TriageService["Triage & Prediction Handler"]:::backend
    end

    subgraph MLEngine["Machine Learning Engine"]
        Vectorizer["377-Signal Feature Encoder"]:::ml
        GNB["Gaussian Naive Bayes Model<br/>(713 Disease Classes)"]:::ml
        ProbDist["Probabilistic Output & Rankings"]:::ml
    end

    subgraph GenerativeAI["Generative Clinical Intelligence"]
        Gemini["Google Gemini 2.5<br/>(Remedies, Lifestyle, Risks)"]:::genai
        OpenAI["OpenAI GPT-4o-mini<br/>(Contextual Dialogue)"]:::genai
    end

    subgraph DataTier["Data Persistence (PostgreSQL)"]
        DB[(PostgreSQL Core Database)]:::db
        Tables["Tables: users, predictions, symptoms,<br/>diseases, chat_messages, audit_logs"]:::db
    end

    %% Client Interactions
    UI --> Router
    Router --> Portal & AdminUI
    Portal & AdminUI -->|"HTTPS / REST API + JWT"| API

    %% Backend Routing
    API --> AuthService
    API --> TriageService
    API --> ChatService

    %% Triage & ML Flow
    TriageService --> Vectorizer
    Vectorizer --> GNB
    GNB --> ProbDist
    ProbDist -->|"Predicted Disease + Confidence"| Gemini
    Gemini -->|"Enriched Clinical Triage Report"| TriageService

    %% Chatbot Flow
    ChatService -->|"Validated Medical Query"| OpenAI

    %% Data Persistence Flow
    AuthService & TriageService & ChatService & API <--> DB
    DB --- Tables

    %% Delivery Back
    TriageService -->|"Structured Diagnosis & Triage JSON"| UI
```

<br/>

---

## 🧠 Machine Learning & Performance

CareTrack AI's core predictive capability is driven by an optimized **Gaussian Naive Bayes (GaussianNB)** classification architecture, selected for its strong probabilistic output calibration and exceptional inference speed in high-dimensional feature spaces.

```
       Input Signals                 Feature Vector                   Classification Space
┌───────────────────────────┐     ┌───────────────────┐     ┌──────────────────────────────────────┐
│  Patient-Reported Details │     │  377 Binary /     │     │      713 Disease Class Profiles      │
│  - Fever, Dry Cough       │ ──> │  Weighted Feature │ ──> │   Gaussian Probabilistic Inference   │
│  - Chest Tightness, etc.  │     │  Encodings        │     │  Top-k Condition Distribution Matrix │
└───────────────────────────┘     └───────────────────┘     └──────────────────┬───────────────────┘
                                                                               │
                                                                               ▼
                                                                ┌──────────────────────────────┐
                                                                │  Enriched Clinical Report    │
                                                                │  - Primary Prediction (~86%) │
                                                                │  - Differential Diagnoses    │
                                                                │  - Gemini Triage Guidance    │
                                                                └──────────────────────────────┘
```

### Benchmark Metrics

| Metric | Specification | Verification Source |
| :--- | :--- | :--- |
| **Core Architecture** | Gaussian Naive Bayes (`GaussianNB`) | `Backend/Model/best_model.pkl` |
| **Feature Signals** | 377 Clinical Symptoms | `Backend/Model/feature_columns.pkl` |
| **Disease Target Classes** | 713 Distinct Conditions | `Backend/Model/label_encoder.pkl` |
| **Validation Accuracy** | **86.6%** | `Backend/Model/training_results.json` |
| **Average Inference Latency** | **< 35ms** | Benchmarked via local runtime execution |
| **Class Label Resolution** | Full Multiclass Probabilistic Ranking | Top-5 differential probabilities returned |

<br/>

<div align="center">
  <details>
    <summary><strong>🔍 Click to inspect Confusion Matrix & Model Training Artifacts</strong></summary>
    <br/>
    <p align="center">
      <img src="Backend/Model/confusion_matrix.png" alt="CareTrack AI Model Confusion Matrix" width="80%" />
      <br/>
      <em>Figure: Gaussian Naive Bayes multiclass evaluation matrix across evaluated conditions.</em>
    </p>
  </details>
</div>

<br/>

---

## 📁 Repository Structure

```
CareTrackAI/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── Backend/
│   ├── Dataset/                    # Raw and preprocessed medical symptom datasets
│   ├── Model/                      # Serialized ML model and encoders
│   │   ├── best_model.pkl          # Trained Gaussian Naive Bayes classifier
│   │   ├── confusion_matrix.png    # Evaluation validation visualization
│   │   ├── feature_columns.pkl     # 377 symptom feature schema
│   │   ├── label_encoder.pkl       # 713 condition class mappings
│   │   └── training_results.json   # Model evaluation metrics & accuracy
│   ├── admin_routes.py             # Executive management API endpoints
│   ├── app.py                      # Flask REST API server & routing hub
│   ├── database.py                 # PostgreSQL connection pool & queries
│   ├── db_setup.py                 # Schema creation & initial migrations
│   ├── gemini_service.py           # Google Gemini clinical triage & remedies
│   ├── openai_service.py           # Domain-bounded medical chatbot assistant
│   ├── predict.py                  # ML feature processing & inference pipeline
│   ├── requirements.txt            # Python dependencies (Flask, scikit-learn, etc.)
│   └── symptom_mapper.py           # Clinical symptom synonym & slug resolution
├── CareTrack Images/               # Platform UI screenshots & media assets
├── Frontend/
│   ├── public/                     # Static icons, favicons, and manifests
│   ├── src/
│   │   ├── admin/                  # Admin control center (analytics, management)
│   │   ├── components/             # Reusable UI widgets, modals, headers, footers
│   │   ├── data/                   # Symptom definitions & category metadata
│   │   ├── motion/                 # Custom animation primitives
│   │   ├── pages/                  # Main route pages (Home, Assessment, Report)
│   │   ├── patient/                # Patient portal workspace & history
│   │   ├── services/               # API clients, auth stores, and interceptors
│   │   ├── App.tsx                 # Hash-based SPA routing & state tree
│   │   └── main.tsx                # React 19 application entry point
│   ├── package.json                # Frontend packages & scripts
│   ├── tailwind.config.js          # Tailwind CSS v4 styling rules
│   └── vite.config.ts              # Vite 8 build & GitHub Pages base configuration
├── LICENSE                         # Apache 2.0 Open Source License
└── README.md                       # Comprehensive project documentation
```

<br/>

---

## 🚀 Getting Started

Follow the steps below to set up and run CareTrack AI locally on your workstation.

### Prerequisites

- **Node.js:** v18.0.0 or higher
- **Python:** v3.10 or higher
- **PostgreSQL:** v14.0 or higher (or a cloud PostgreSQL instance e.g., Neon / Supabase)
- **Git**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/theneerajgrover/CareTrackAI.git
cd CareTrackAI
```

---

### Step 2: Backend Setup

1. **Navigate to the Backend directory and set up a virtual environment:**
   ```bash
   cd Backend
   python -m venv venv
   ```

2. **Activate the virtual environment:**
   - **Windows:**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**  
   Create a `.env` file inside the `Backend/` directory:
   ```env
   # Application Configuration
   PORT=5000
   FLASK_ENV=development
   SECRET_KEY=your_super_secret_jwt_key

   # Database Configuration (PostgreSQL)
   DATABASE_URL=postgresql://username:password@localhost:5432/caretrack_db

   # AI / LLM Integrations (Optional but recommended for full triage & chat)
   GEMINI_API_KEY=your_google_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4o-mini
   ```

5. **Initialize database tables:**
   ```bash
   python db_setup.py
   ```

6. **Launch the Flask server:**
   ```bash
   python app.py
   ```
   *The backend will start at `http://localhost:5000` (API status at `http://localhost:5000/api/health`).*

---

### Step 3: Frontend Setup

1. **In a new terminal window, navigate to the Frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure local environment variables (Optional):**  
   Create a `.env` file inside `Frontend/`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
   *(If omitted, the development proxy defaults to your local or staging backend).*

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   *Access the web application at `http://localhost:5173`.*

<br/>

---

## 📸 Platform Showcase

<div align="center">

<table>
  <tr>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/home%20page.png" alt="Home Landing Page" width="100%" />
      <br/>
      <strong>Modern Homepage & Health Onboarding</strong>
    </td>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/symptom%20selection%20page.png" alt="Symptom Selection" width="100%" />
      <br/>
      <strong>Categorized Multi-Symptom Selection</strong>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/comfirming%20details%20page.png" alt="Confirming Details" width="100%" />
      <br/>
      <strong>Patient Details & Signal Confirmation</strong>
    </td>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/report%20%20page%20part%201.png" alt="Diagnostic Report Overview" width="100%" />
      <br/>
      <strong>AI-Generated Diagnostic Findings & Probability</strong>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/report%20page%20part%202.png" alt="Remedies and Lifestyle" width="100%" />
      <br/>
      <strong>Clinical Triage, Lifestyle & Home Remedies</strong>
    </td>
    <td width="50%" align="center">
      <img src="CareTrack%20Images/profile%20page.png" alt="Patient Portal Profile" width="100%" />
      <br/>
      <strong>Patient Portal Workspace & Health Record</strong>
    </td>
  </tr>
</table>

</div>

<br/>

---

## 🔒 Security & Privacy

CareTrack AI is built with privacy-first and defense-in-depth principles:

- **Zero-Exposure Frontend:** Client builds contain no secret tokens, API keys, or raw database connection strings.
- **Cryptographic Hashing:** Passwords are never stored in plaintext; all user credentials use `bcrypt` hashing with salt rounds.
- **Stateless Authorization:** Token-based JWT authorization enforcing role separation between `patient` and `admin` scopes.
- **Domain Guardrails:** Medical assistance chatbots apply strict prompt engineering boundaries to reject malicious prompts and out-of-scope interactions.
- **CORS Protection:** Configured CORS origins preventing unauthorized cross-origin requests.

<br/>

---

## 🤝 Contributing

Contributions to improve CareTrack AI are welcome! Whether it is extending the symptom dictionary, refining ML models, or enhancing accessibility:

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feat/amazing-feature`)
3. **Commit your Changes** (`git commit -m 'feat: add amazing feature'`)
4. **Push to the Branch** (`git push origin feat/amazing-feature`)
5. **Open a Pull Request**

Please ensure your pull request adheres to existing code standards and passes linting.

<br/>

---

## 📜 License

Distributed under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for more information.

<br/>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0284c7,30:0f766e,70:1e1b4b,100:090d16&height=120&section=footer" alt="CareTrack AI Footer" width="100%" />

<p align="center">
  Crafted with care by <a href="https://github.com/theneerajgrover"><strong>Neeraj Grover</strong></a> and the <strong>CareTrack AI</strong> Community.
</p>

</div>
