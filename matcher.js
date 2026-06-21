// Heuristic Matcher Engine

function parseDate(text) {
  // Use robust chrono-node parser if available (exposed via preload.js)
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.parseDate) {
    return window.electronAPI.parseDate(text);
  }

  // Fallback naive parser for environments without chrono-node
  const lower = text.toLowerCase();
  const today = new Date();
  
  if (lower.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  if (lower.includes('tomorrow')) {
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    return tmr.toISOString().split('T')[0];
  }
  if (lower.includes('yesterday')) {
    const yst = new Date(today);
    yst.setDate(yst.getDate() - 1);
    return yst.toISOString().split('T')[0];
  }
  
  if (lower.includes('next month')) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  }
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + ((i + 7 - today.getDay()) % 7 || 7));
      return nextDay.toISOString().split('T')[0];
    }
  }
  
  // Match YYYY-MM-DD
  const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  return null;
}

function tokenize(text) {
  // simple tokenization: split by spaces and punctuation
  return text.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
}

function matchCategories(text, categories) {
  const matchedCategoryIds = [];
  const textLower = text.toLowerCase();
  
  // For multi-word matching, checking if the text includes the category name/synonym is simplest.
  // In a real app we'd want word-boundary checks to avoid "cat" matching "catch".
  for (const catId in categories) {
    const cat = categories[catId];
    if (!cat.indexed) continue;
    
    const terms = [cat.name.toLowerCase(), ...(cat.synonyms || []).map(s => s.toLowerCase())];
    
    for (const term of terms) {
      // Create a regex for exact word match
      // Escape special characters in term just in case
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
      
      if (regex.test(textLower)) {
        matchedCategoryIds.push(cat.id);
        break; // Match found for this category, no need to check other synonyms
      }
    }
  }
  
  return matchedCategoryIds;
}

if (typeof module !== 'undefined') {
  module.exports = { parseDate, matchCategories, tokenize };
}
