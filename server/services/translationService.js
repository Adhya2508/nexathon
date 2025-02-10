const { Translate } = require('@google-cloud/translate').v2;
const NodeCache = require('node-cache');
const translationCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Initialize Google Translate
const translate = new Translate({
    projectId: process.env.GOOGLE_PROJECT_ID,
    key: process.env.GOOGLE_TRANSLATE_API_KEY
});

class TranslationService {
    static async translateText(text, targetLang) {
        if (!text) return text;

        // Generate cache key
        const cacheKey = `${text}_${targetLang}`;

        // Check cache first
        const cachedTranslation = translationCache.get(cacheKey);
        if (cachedTranslation) return cachedTranslation;

        try {
            const [translation] = await translate.translate(text, targetLang);
            translationCache.set(cacheKey, translation);
            return translation;
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }

    static async translateDeal(deal, targetLang) {
        if (targetLang === 'en') return deal;

        const translatedDeal = { ...deal };
        translatedDeal.name = await this.translateText(deal.name, targetLang);
        translatedDeal.description = await this.translateText(deal.description, targetLang);
        return translatedDeal;
    }
}

module.exports = TranslationService;
