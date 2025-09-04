// Discovery endpoints for available features and formats

// Available ad formats from the frontend
const AD_FORMATS = [
  'Standard Template 🔥',
  'CRM 💌',
  'Pure Hero Concept 🦸‍♂️',
  'Real-life Post-It Notes',
  'iMessage Conversation',
  'Simple Black and White',
  'iPhone Notes',
  'Us vs. Them Comparison',
  'Testimonial 💬',
  'Comic Story 📚'
];

// Available features from the frontend
const FEATURE_OPTIONS = [
  {
    name: "Background Remover",
    description: "Automatically remove backgrounds from images in one tap, creating clean, professional visuals ideal for product listings, social media, and marketing materials. - Show many options",
    isCustom: false
  },
  {
    name: "AI Background",
    description: "Upload a simple photo — AI removes the background and instantly creates a high-quality, professional scene with cinematic lighting, all while keeping your product untouched. Perfect for ads, catalogs, and online shops.- Show many options",
    isCustom: false
  },
  {
    name: "AI Object Removal",
    description: "Remove unwanted objects from your photos.- Show many options",
    isCustom: false
  },
  {
    name: "AI upscale (Cleanup & Enhance)",
    description: "Use AI to upscale your super-blurred low quality photos to HD and improve the quality.- Show many options",
    isCustom: false
  },
  {
    name: "AI Resize",
    description: "Quickly resize images to fit various platforms and marketplaces (e.g., Amazon, Etsy, Instagram) without compromising quality — perfect for multichannel sellers.- Show many options",
    isCustom: false
  },
  {
    name: "AI Logo",
    description: "Create logos instantly with AI — whether it's a friendly name logo for a local real estate brand, a bold diner-style badge for a burger joint, or a cozy handwritten logo for a handmade shop. No design skills needed.- Show many options",
    isCustom: false
  },
  {
    name: "AI Virtual Try-On",
    description: "Display your products (like clothing, shoes, or accessories) on AI-generated models to showcase how they look in real life — no photoshoot needed.- Show many options",
    isCustom: false
  },
  {
    name: "Product Staging",
    description: "Turn your product photos into lifestyle images with AI. Place your items in realistic scenes — sometimes with people using them — to add context and inspire buyers. Objects can be jewelry, mugs, candles, shoes, etc.- Show many options",
    isCustom: false
  },
  {
    name: "AI Product Beautifier",
    description: "Turn ugly product shots — even quick snaps from your iPhone — into stunning, studio-quality images. Instantly add cinematic lighting, and create high-end professional backgrounds that make your products shine.- Show many options",
    isCustom: false
  },
  {
    name: "AI IG Story",
    description: "Turn any photo into a scroll-stopping Instagram Story with AI-powered layouts, backgrounds, and styling — made for creators who move fast.- Show many options",
    isCustom: false
  }
];

// Available aspect ratios
const ASPECT_RATIOS = [
  { value: "1:1", name: "Square (1:1)", description: "Perfect for Instagram posts, profile pictures, and social media" },
  { value: "16:9", name: "Landscape (16:9)", description: "Great for YouTube thumbnails, banners, and wide displays" },
  { value: "9:16", name: "Portrait (9:16)", description: "Ideal for Instagram Stories, TikTok, and mobile content" },
  { value: "4:3", name: "Standard Landscape (4:3)", description: "Traditional photo format, good for presentations" },
  { value: "3:4", name: "Standard Portrait (3:4)", description: "Traditional portrait format, good for print" }
];

// Available languages for translation
const LANGUAGES = [
  { code: "BR", name: "Brazilian Portuguese" },
  { code: "CN", name: "Chinese (Simplified)" },
  { code: "DE", name: "German" },
  { code: "EN", name: "English" },
  { code: "ES", name: "Spanish" },
  { code: "FR", name: "French" },
  { code: "IN", name: "Hindi" },
  { code: "IT", name: "Italian" },
  { code: "JP", name: "Japanese" },
  { code: "KR", name: "Korean" },
  { code: "MY", name: "Malay" },
  { code: "NL", name: "Dutch" },
  { code: "PH", name: "Filipino" },
  { code: "PL", name: "Polish" },
  { code: "SA", name: "Arabic" },
  { code: "TH", name: "Thai" },
  { code: "TR", name: "Turkish" },
  { code: "VN", name: "Vietnamese" },
  { code: "ID", name: "Indonesian" },
  { code: "HK", name: "Chinese (Traditional)" },
  { code: "CZ", name: "Czech" }
];

async function handler(req, res) {
  console.log('\n🔍 === DISCOVERY ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
  // Enable CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.query;

    switch (type) {
      case 'formats':
        return res.status(200).json({
          success: true,
          formats: AD_FORMATS,
          count: AD_FORMATS.length,
          description: 'Available ad format templates'
        });

      case 'features':
        return res.status(200).json({
          success: true,
          features: FEATURE_OPTIONS,
          count: FEATURE_OPTIONS.length,
          description: 'Available product features for ad generation'
        });

      case 'aspect-ratios':
        return res.status(200).json({
          success: true,
          aspectRatios: ASPECT_RATIOS,
          count: ASPECT_RATIOS.length,
          description: 'Available aspect ratios for image generation'
        });

      case 'languages':
        return res.status(200).json({
          success: true,
          languages: LANGUAGES,
          count: LANGUAGES.length,
          description: 'Available languages for image translation'
        });

      case 'all':
      default:
        return res.status(200).json({
          success: true,
          data: {
            formats: AD_FORMATS,
            features: FEATURE_OPTIONS,
            aspectRatios: ASPECT_RATIOS,
            languages: LANGUAGES
          },
          counts: {
            formats: AD_FORMATS.length,
            features: FEATURE_OPTIONS.length,
            aspectRatios: ASPECT_RATIOS.length,
            languages: LANGUAGES.length
          },
          description: 'All available options for StaticGeniusPro API'
        });
    }
  } catch (error) {
    console.error('❌ Discovery endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = handler;
