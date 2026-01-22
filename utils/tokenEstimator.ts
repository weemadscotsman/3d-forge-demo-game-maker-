export const estimateTokens = (text: string | object | null | undefined): number => {
  if (!text) return 0;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  // Rough estimation: 1 token ~= 4 characters for English text/code
  return Math.ceil(str.length / 4);
};

export const formatTokenCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(2)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

export const generateShortHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return '000000';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
};