const fs = require('fs');
const transcriptPath = 'c:\\Users\\EMAYAN\\.gemini\\antigravity\\brain\\b2b09b09-3b15-4c78-b872-ac3f235499e8\\.system_generated\\logs\\transcript_full.jsonl';

const data = fs.readFileSync(transcriptPath, 'utf8');
const lines = data.split('\n');

let viewFileOutput = '';
for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'TOOL_RESPONSE' && obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === 'view_file' && call.response && call.response.output && call.response.output.includes('Dashboard.jsx')) {
          viewFileOutput += `--- Step ${obj.step_index} ---\n${call.response.output}\n\n`;
        }
      }
    }
  } catch (e) {}
}
fs.writeFileSync('dashboard_views.txt', viewFileOutput);

