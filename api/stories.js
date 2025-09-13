import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
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
      
      return {
        filename,
        metadata,
        content: contentLines.join('---').trim(),
      };
    }));
    
    res.status(200).json({ chapters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read story nodes.', details: error.message });
  }
}
