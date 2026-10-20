// The HSK 3.0 levels. `count` is the size of the official word list for each level.
import hsk1 from '../../data/raw/hsk1.json';
import hsk2 from '../../data/raw/hsk2.json';
import hsk3 from '../../data/raw/hsk3.json';
import hsk4 from '../../data/raw/hsk4.json';
import hsk5 from '../../data/raw/hsk5.json';
import hsk6 from '../../data/raw/hsk6.json';
import hsk79 from '../../data/raw/hsk7-9.json';

export const LEVELS = [
  { key: '1', slug: 'hsk1', label: 'HSK 1', count: hsk1.length },
  { key: '2', slug: 'hsk2', label: 'HSK 2', count: hsk2.length },
  { key: '3', slug: 'hsk3', label: 'HSK 3', count: hsk3.length },
  { key: '4', slug: 'hsk4', label: 'HSK 4', count: hsk4.length },
  { key: '5', slug: 'hsk5', label: 'HSK 5', count: hsk5.length },
  { key: '6', slug: 'hsk6', label: 'HSK 6', count: hsk6.length },
  { key: '7-9', slug: 'hsk7-9', label: 'HSK 7–9', count: hsk79.length },
];

export const TOTAL_WORDS = LEVELS.reduce((sum, l) => sum + l.count, 0);
