# Run from: IMHAS/frontend/src
import re, os

def strip_emojis(text):
    return re.sub(
        r'[\U00002600-\U000027BF\U0001F000-\U0001FFFF\U00002702-\U000027B0\uFE0F\u200D]+',
        '', text, flags=re.UNICODE
    )

targets = [
    'pages/LoginPage.jsx',
    'pages/DashboardPage.jsx',
    'pages/PatientPage.jsx',
    'pages/SecurityPage.jsx',
    'components/DiagnosticsPanel.jsx',
    'components/BillingPanel.jsx',
    'components/AuditLogs.jsx',
    'components/PatientCard.jsx',
]

for path in targets:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = strip_emojis(content)
    # Fix hardcoded model names
    content = content.replace("'BERT MiniLM'", "'Gemini gemini-embedding-001'")
    content = content.replace("['Dimension', '384']", "['Dimension', '768']")
    content = content.replace('BERT MiniLM + Gemini 2.0', 'Gemini gemini-embedding-001')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Cleaned: {path}')