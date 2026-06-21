const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously" });

// We need to simulate the browser environment for the scripts to run
const scriptFiles = ['state.js', 'matcher.js', 'database.js', 'markdown-parser.js'];

scriptFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf-8');
  dom.window.eval(code);
});

console.log("Scripts loaded.");
const db = new dom.window.AgendaDatabase();
const data = `# General
- [ ] Task 1
  Note line 1
`;
const parser = dom.window.AgendaMarkdownParser;
if (parser) {
  const success = parser.parse(db, data);
  console.log("Import success:", success);
  console.log("DB items:", db.items);
} else {
  console.log("Parser not found");
}
