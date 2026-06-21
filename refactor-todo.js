const fs = require('fs');

const todoText = fs.readFileSync('MD/TODO.md', 'utf8');
const lines = todoText.split('\n');

const out = [];
out.push('# Master Infrastructure TODO');
out.push('');
out.push('## Phase');
out.push('### Phase 1');
out.push('### Phase 2');
out.push('### Phase 3');
out.push('');
out.push('## Workstream');
out.push('### Security');
out.push('### Correspondence');
out.push('### Calculators');
out.push('### Remote Services');
out.push('### Network');
out.push('### Infrastructure');
out.push('');
out.push('## Who');
out.push('### Rohn');
out.push('### Ksolves');
out.push('### Austin');
out.push('### Sean');
out.push('### Michelle');
out.push('### Cyber');
out.push('');
out.push('## Priority');
out.push('### Blocker');
out.push('### Urgent');
out.push('### Normal');
out.push('');
out.push('# Backlog');
out.push('');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.startsWith('### ')) {
    // Make it a bold line instead of a category heading
    line = line.replace(/^### (.*)$/, '**$1**');
  }

  const taskMatch = line.match(/^(\s*)-\s+\[(x|X|\s)\]\s+(.*)$/);
  if (taskMatch) {
    const indent = taskMatch[1];
    const check = taskMatch[2];
    let content = taskMatch[3];

    const tags = new Set();

    // Extract existing [tags]
    content = content.replace(/\[([^\]]+)\]/g, (match, tag) => {
      if (tag.toLowerCase() === 'phase1') tags.add('Phase 1');
      else if (tag.toLowerCase() === 'phase2') tags.add('Phase 2');
      else if (tag.toLowerCase() === 'phase3') tags.add('Phase 3');
      else tags.add(tag.charAt(0).toUpperCase() + tag.slice(1));
      return ''; // remove inline tag
    });

    // Detect owners
    if (content.match(/owner:.*rohn/i)) tags.add('Rohn');
    if (content.match(/owner:.*ksolves/i)) tags.add('Ksolves');
    if (content.match(/owner:.*austin/i)) tags.add('Austin');
    if (content.match(/owner:.*sean/i)) tags.add('Sean');
    if (content.match(/owner:.*michelle/i)) tags.add('Michelle');

    // Detect priority
    if (content.match(/URGENT|🚨/)) tags.add('Urgent');
    if (content.match(/BLOCKER/)) tags.add('Blocker');

    content = content.replace(/\s+/g, ' ').trim();

    const tagsArr = Array.from(tags);
    const tagStr = tagsArr.length > 0 ? ' [' + tagsArr.join('] [') + ']' : '';
    out.push(`${indent}- [${check}] ${content}${tagStr}`);
  } else {
    // Normal line
    out.push(line);
  }
}

fs.writeFileSync('refactored-todo.md', out.join('\n'));
console.log('Successfully written refactored-todo.md');
