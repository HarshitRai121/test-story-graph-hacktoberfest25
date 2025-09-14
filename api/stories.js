import fs from 'fs/promises';
import path from 'path';

// Note: Replace with your actual repo details
const REPO_OWNER = 'your-github-username';
const REPO_NAME = 'your-repo-name';

// You will need a GitHub Personal Access Token if your repo is private or for higher API limits.
// For a public repo, it might work without, but adding one is more reliable.
// If using one, store it securely in Vercel as an environment variable (e.g., GITHUB_TOKEN).
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export default async function handler(req, res) {
  try {
    // 1. Fetch contributors from the GitHub API
    const contributorsRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
      }
    });
    if (!contributorsRes.ok) throw new Error(`GitHub API Error: ${contributorsRes.statusText}`);
    const githubContributors = await contributorsRes.json();

    const contributorsMap = {};
    githubContributors.forEach(contributor => {
      contributorsMap[contributor.login] = {
        login: contributor.login,
        avatar_url: contributor.avatar_url,
        contributedNodes: []
      };
    });

    // 2. Read story nodes and associate authors
    const storynodesDir = path.join(process.cwd(), 'storynodes');
    const files = await fs.readdir(storynodesDir);
    const chapters = await Promise.all(files.filter(file => file.endsWith('.md')).map(async (filename) => {
      const filePath = path.join(storynodesDir, filename);
      const fullContent = await fs.readFile(filePath, 'utf8');
      
      const [metadataRaw, ...contentLines] = fullContent.split('---').filter(Boolean);
      const metadata = metadataRaw.trim().split('\n').reduce((acc, line) => {
        const [key, ...value] = line.split(': ');
        if (key && value) acc[key.trim()] = value.join(': ').trim();
        return acc;
      }, {});
      
      // Associate author with this story node
      if (metadata.author && contributorsMap[metadata.author]) {
        contributorsMap[metadata.author].contributedNodes.push(filename);
      }
      
      return {
        filename,
        metadata,
        content: contentLines.join('---').trim(),
      };
    }));
    
    // 3. Send combined data
    res.status(200).json({ 
      chapters,
      contributors: Object.values(contributorsMap)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process stories and contributors.', details: error.message });
  }
}