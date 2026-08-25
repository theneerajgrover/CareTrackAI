#                                        CareTrack AI

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Progress-yellow?style=for-the-badge" alt="Status: In Progress">
  <img src="https://img.shields.io/badge/AI-Healthcare-blueviolet?style=for-the-badge" alt="AI Healthcare">
  <img src="https://img.shields.io/badge/Machine%20Learning-Enabled-success?style=for-the-badge" alt="Machine Learning">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Frontend-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-Styling-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Python-Backend-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" alt="scikit-learn">
  <img src="https://img.shields.io/badge/JWT-Authentication-black?style=flat-square" alt="JWT">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" alt="License">
</p>

<p align="center">
  <strong>AI-powered symptom analysis and intelligent health assessment platform.</strong>
</p>

<p align="center">
  CareTrack AI analyzes reported symptoms using machine learning to provide probabilistic condition matches, assessment insights, and structured health information through a secure patient portal.
</p>

---

## 📌 Project Status

> **🚧 Status: In Progress**

CareTrack AI is an actively developed healthcare technology project.

The core platform, authentication, AI analysis workflow, patient experience, administrative control center, reporting, monitoring, and system-management features are being continuously refined.

---

## 🩺 Overview

**CareTrack AI** is an AI-powered health assessment platform designed to help users understand their reported symptoms through machine-learning-based analysis.

The platform processes a collection of symptom signals and compares them against a large set of condition profiles to generate probabilistic predictions.

The current system supports:

- Patient accounts
- Secure authentication
- Symptom-based health analysis
- AI-generated condition predictions
- Probability-based findings
- Clinical triage information
- Assessment history
- Reports
- Patient dashboard
- Administrative dashboard
- Patient management
- AI model monitoring
- System health monitoring
- Notifications
- Feedback
- Audit logs
- Backend API integration
- PostgreSQL-backed application data

> **Important:** CareTrack AI is an assistive health-analysis platform and is not intended to replace professional medical diagnosis or emergency medical care.

---

# ✨ Key Highlights

### 🧠 AI-Powered Symptom Analysis

CareTrack AI uses a machine-learning model to analyze reported symptom signals and identify probable health conditions.

### 📊 Probabilistic Predictions

Instead of presenting a diagnosis as an absolute fact, the system provides model-based probability information for predicted conditions.

### 🩺 Clinical Triage Support

Analysis results can include structured triage information to help users understand the potential urgency associated with their reported symptoms.

### 👤 Secure Patient Portal

Registered users can access their health-related analysis information, saved assessments, reports, and history through their personal dashboard.

### 🗂️ Assessment History

Users can review previous health assessments rather than treating every analysis as an isolated interaction.

### 📄 Health Reports

The platform provides structured reports generated from completed analyses.

### 🛡️ Administrative Control Center

Administrators have a dedicated control center for monitoring platform activity and managing operational information.

### 📈 Operational Analytics

The administrator dashboard provides visibility into:

- Patient registrations
- Analysis activity
- Generated reports
- AI predictions
- Feedback
- Symptom distribution
- Frequently predicted conditions
- Recent platform activity

### 🤖 AI Engine Monitoring

Administrators can monitor information about the active AI model, including:

- Active model
- Model version/type
- Number of features/signals
- Number of classes
- Model accuracy

### 🖥️ System Health Monitoring

The administrative interface provides operational status information for major platform services, including:

- AI Service
- Authentication
- Backend API

### 🔐 Audit Logs

Administrative activity and important platform events can be tracked through the audit-log system.

### 🔔 Notifications & Feedback

The platform includes notification and feedback areas for communication and user interaction.

---

# 🧠 AI / Machine Learning

The current CareTrack AI model uses a **Gaussian Naive Bayes** classification approach.

### Current Model

| Property | Current Value |
|---|---|
| Model | Gaussian Naive Bayes |
| Version | v1.0 |
| Features / Signals | 377 |
| Condition Classes | 713 |
| Reported Accuracy | 86.6% |

The model works with a large symptom-to-condition classification space and produces prediction findings based on the symptoms selected or reported during an assessment.

### Analysis Flow

```text
User Symptoms
      │
      ▼
Symptom Processing
      │
      ▼
Feature Representation
      │
      ▼
Machine Learning Model
      │
      ▼
Probabilistic Condition Predictions
      │
      ▼
Analysis / Triage Information
      │
      ▼
Patient Report & History
