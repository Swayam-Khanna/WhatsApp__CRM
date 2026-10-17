const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'API_DOCUMENTATION.md');
const htmlPath = path.join(__dirname, '..', 'API_DOCUMENTATION.html');

const md = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let html = md
  .replace(/```([a-z]*)\n([\s\S]*?)```/gim, (m, lang, code) => '<pre><code>' + escapeHtml(code) + '</code></pre>')
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
  .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
  .replace(/`([^`]+)`/gim, '<code>$1</code>')
  .replace(/\n\n/gim, '<p></p>');

const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prajnaa Farm API Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  <style>
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .markdown-body {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    @media (max-width: 767px) {
      body { padding: 15px; }
      .markdown-body { padding: 20px; }
    }
    @media print {
      body { padding: 0; background: white; }
      .markdown-body { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${html}
  </article>
</body>
</html>`;

fs.writeFileSync(htmlPath, template, 'utf8');
console.log('Successfully created API_DOCUMENTATION.html at:', htmlPath);
