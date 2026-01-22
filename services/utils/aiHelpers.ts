/**
 * helper functions for AI response processing
 */

export const parseAndSanitize = (text: string): any => {
    // 1. Attempt direct parse
    try {
        return JSON.parse(text);
    } catch (e) {
        // 2. Attempt to find the first '{' and last '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const jsonCandidate = text.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(jsonCandidate);
            } catch (innerE) {
                // Continue
            }
        }
        
        // 3. Aggressive Cleanup
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanText);
        } catch (finalE) {
            console.error("JSON Parse Failed. Raw text:", text.substring(0, 200) + "...");
            throw new Error("The AI generated an invalid response structure. Please try again.");
        }
    }
}

/**
 * Validates that an object contains specific required keys.
 * Throws an error if validation fails.
 */
export const validateStructure = (data: any, requiredKeys: string[], context: string) => {
    if (!data || typeof data !== 'object') {
        throw new Error(`${context}: Response was not a valid object.`);
    }
    const missing = requiredKeys.filter(key => !(key in data));
    if (missing.length > 0) {
        throw new Error(`${context}: Missing required fields: ${missing.join(', ')}`);
    }
    return data;
};

/**
 * Compresses code for the AI context window by stripping heavy data assets.
 * This significantly reduces token usage during refinement.
 */
export const compressCodeForContext = (code: string): string => {
    if (!code) return "";
    let compressed = code;
    // Replace base64 data URIs (images/audio)
    compressed = compressed.replace(/data:[a-z]+\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '<BASE64_DATA_HIDDEN>');
    // Replace heavy numeric arrays (geometry data) - generic catch for arrays with >10 numbers
    compressed = compressed.replace(/\[(\s*-?\d*\.?\d+,){10,}\s*-?\d*\.?\d+\s*\]/g, '[...GEOMETRY_DATA_HIDDEN...]');
    return compressed;
};
