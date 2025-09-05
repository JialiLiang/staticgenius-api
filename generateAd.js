const axios = require('axios');

// Import template functions from the frontend codebase
const TEMPLATES = {
  standard: (productName, productDescription, featureName, featureDescription) => {
    return `You're a top ad designer.
  
  Create a high-converting static ad to promote this feature with both clear copy and a strong visual concept.
  
  • Product: ${productName}
  • Feature: ${featureName} — ${featureDescription}
  • Description: ${productDescription}
  
  ⸻
  
  Layout:
  • Headline at the top (max 10 chars, bold, benefit-driven)
  • Subheadline just below (max 20 chars, plain tone)
  • Centered hero visual showing the feature in action (e.g. before/after or transformation)
  • CTA at bottom: "Try ${productName} for free" or "Download for Free"
  • Leave 15% bottom padding so CTA isn't cropped
  
  ⸻
  
  Design Rules:
  • DO NOT include any logos
  • All text and visuals must remain inside a central 80% safe zone
  • Use clean, modern design: soft shadows, gradient or neutral background, high clarity`;
  },

  pure_hero: (productName, productDescription, featureName, featureDescription) => {
    return `You are a world-class ad creative designer.

Create a high-quality static ad that highlights the product feature below through strong visuals. Editorial style. No brand logo.

Inputs:
• Product: ${productName}
• Feature: ${featureName} — ${featureDescription}
• Product Description: ${productDescription}`;
  },

  post_it: (productName, productDescription, featureName, featureDescription) => {
    return `First, analyze this product and feature to understand the core user benefit:

Product: ${productName}  
Feature: ${featureDescription}  
Context: ${productDescription}

Then create a realistic yellow Post-It note that someone would actually stick on their monitor or desk.

Requirements:
- Write 1-2 lines in casual, handwritten style
- Focus on the personal benefit/feeling, not technical details
- Tone: friendly, scrappy, authentic (like texting a friend)
- Visual: yellow Post-It with black marker text, centered
- No logos, product names, or formal language

Think: "What would someone scribble down when they're genuinely excited about how this helps them?"`;
  },

  imessage: (productName, productDescription, featureName, featureDescription) => {
    return `Generate a realistic iPhone iMessage-style chat screenshot between two friends.

One of them just discovered ${productName} and is excited about the ${featureName} feature (${featureDescription}).  
The other is curious, slightly skeptical, and asking questions.

Tone: 
- Natural, playful, casual — like two friends texting
- Use contractions, emoji, and voicey phrasing
- Avoid formal or robotic language like "You should try..."
- Use short messages (no longer than 2 lines each)

Instructions:
- Include 4–6 messages total
- Add a sense of excitement or surprise
- Feel free to use casual abbreviations (e.g., "yo", "lmk", "idk")
- Use expressive emoji where it makes sense (😭 😍 👀 🔥 etc.)

Visual Layout Instructions (for image generation):
- iPhone iMessage layout in light mode
- Include: top bar (signal, time, battery), contact name (e.g., "Emma"), blue/gray bubbles, timestamp (e.g., "Today 2:16 PM"), and bottom input field
- Format: 1:1 (square), with UI centered and no cropping
- Do NOT include brand logos, watermarks, or the app name in the layout

Product context: ${productDescription}`;
  },

  minimal: (productName, productDescription, featureName, featureDescription) => {
    return `You are a top copywriter specializing in minimalist design.

Create a clean black-and-white ad with powerful, concise copy.

Inputs:
• Product: ${productName}
• Feature: ${featureName} — ${featureDescription}
• Context: ${productDescription}

Requirements:
- Maximum 6-8 words total
- HEADLINE + SUBHEADLINE only
- Sharp, impactful language
- No logos or brand names`;
  },

  notes: (productName, productDescription, featureName, featureDescription) => {
    return `Create a realistic iPhone Notes app screenshot that feels like a casual, personal list someone saved or is about to share.

The note should focus on how ${productName} makes their life easier — especially the ${featureName} (${featureDescription}).

Instructions:

### Content:
- Start with a casual title at the top, e.g.:
  • "apps I actually use"  
  • "my seller toolkit"  
  • "what's saving me lately"  
  • "3 things I'm using every day"  
  (Choose one that fits the feature context)

- Write 3–5 bullet points using \`•\` and a personal tone
  • First bullet must mention the ${featureName}
  • Others can include real-world use, productivity, or emotional benefits
  • Use a few natural emojis if helpful (💡 😭 ✅ 🔥)

### Visual Instructions:
- Simulate a real iPhone Notes screenshot (light mode)
- Include:
  • Top status bar (time, battery, Wi-Fi)
  • Yellow "Notes" header
  • Clean system font (no bold or styled highlights)
  • White background with proper margins
- No logos, watermarks, or stylized visuals

Aspect ratio: 1:1 (square), designed for static display ad use.

Product context: ${productDescription}`;
  },

  comparison: (productName, productDescription, featureName, featureDescription) => {
    return `You are an expert at comparison marketing.

Create a clear "Before ❌ vs After ✅" comparison chart.

Inputs:
• Product: ${productName}
• Feature: ${featureName} — ${featureDescription}
• Context: ${productDescription}

Format:
- Two-column table layout
- 4-6 benefit-driven rows
- Short, scannable text
- No competitor names or logos`;
  },

  testimonial: (productName, productDescription, featureName, featureDescription) => {
    return `Create a testimonial ad for ${productName}'s ${featureName} feature.

Product: ${productName}
Feature: ${featureName} — ${featureDescription}
Context: ${productDescription}

Generate:
1. Quote: 1-2 sentences in quotation marks, natural language
2. Attribution: "— [Name], [Job Title]" (e.g., "— Sarah K., Small Business Owner")
3. User Photo: Realistic person in their work environment:
   - Small business owner: at desk/store
   - Photographer: with camera/in studio
   - Ecommerce seller: in warehouse/office
   - Designer: at computer/workspace
   - Restaurant owner: in kitchen/dining area

Visual: Clean layout with quote, attribution, and authentic user photo. No logos.`;
  },

  crm_email: (productName, productDescription, featureName, featureDescription) => {
    return `You are an expert SaaS email copywriter and designer.

Create a clean, modular CRM email to promote this product feature. The tone should be clear, helpful, and action-oriented — great for onboarding, upsell, or re-engagement.

- Product: ${productName}  
- Feature: ${featureName} — ${featureDescription}  
- Product Description: ${productDescription}  

---

Write the following:

1. Subject Line (max 50 characters)  
2. Preheader Text (1 short supporting sentence)  
3. Headline (main in-email heading)  
4. Body Copy (2~3 short points — highlight user-facing benefits, not features)  
5. CTA Button Text (short, friendly)  
6. Visual Concept  
   - Show the feature visually using a clean, modern image  
   - Prefer visual transformation, before/after, or metaphor  
   - Avoid heavy UI screenshots unless stylized  
   - Keep the visual lightweight, professional, and CTA-aligned

Design Style:
- No logos
- Clean layout with central image and soft CTA
- Bullet points should be crisp and user-centered
- Visual should be expressive but minimal (no text inside image)`;
  },

  comic: (productName, productDescription, featureName, featureDescription) => {
    return `You are a skilled comic artist and storyteller.

Create a 3-panel comic strip that tells a story about this product feature.

Inputs:
• Product: ${productName}
• Feature: ${featureName} — ${featureDescription}
• Context: ${productDescription}

Requirements:
- 3 panels: Setup → Problem → Solution
- Simple cartoon style characters
- Brief dialogue bubbles (max 8 words each)
- Show the feature solving a relatable problem
- Friendly, approachable art style
- No logos or brand names in visuals`;
  },

  creative_freedom: (productName, productDescription, featureName, featureDescription) => {
    return `You are an innovative creative director with unlimited artistic freedom.

Create a completely original and creative advertisement that showcases this product feature in an unexpected, memorable way.

Inputs:
• Product: ${productName}
• Feature: ${featureName} — ${featureDescription}
• Context: ${productDescription}

Creative Guidelines:
- Think outside the box - surprise and delight
- No format restrictions - be inventive with layout, style, and concept
- Could be: artistic, abstract, metaphorical, storytelling, experimental, surreal, minimalist, maximalist, or any other creative direction
- Express the feature's value through creative visual storytelling
- Consider unique perspectives, unexpected compositions, or innovative design approaches
- Let your creativity run wild while keeping the core message clear

Only constraints:
- Keep the feature benefit understandable
- No logos required
- Make it memorable and engaging

Be bold. Be different. Create something that stands out.`;
  }
};

const FORMAT_TO_TEMPLATE = {
  'Standard Template': 'standard',
  'Pure Hero Concept': 'pure_hero',
  // 'Real-life Post-It Notes': 'post_it',
  // 'iMessage Conversation': 'imessage',
  // 'Simple Black and White': 'minimal',
  // 'iPhone Notes': 'notes',
  // 'Us vs. Them Comparison': 'comparison',
  'Testimonial': 'testimonial',
  // 'CRM': 'crm_email',
  'Comic Story': 'comic',
  'Creative Freedom': 'creative_freedom'
};

async function handler(req, res) {
  console.log('\n=== GENERATE-AD ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  // Enable CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      productName,
      productDescription,
      formats,
      aspectRatio = '1:1',
      language = 'English',
      numAds = 1,
      model = 'gpt-image-1',
      features,
      brandColor
    } = req.body;

    console.log('Request payload:', {
      productName,
      productDescription: productDescription?.substring(0, 100) + '...',
      formats,
      aspectRatio,
      language,
      numAds,
      model,
      features: features?.map(f => ({ name: f.name, description: f.description?.substring(0, 50) + '...' })),
      brandColor
    });

    // Validate required fields
    if (!productName || !productDescription || !formats || !features) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['productName', 'productDescription', 'formats', 'features']
      });
    }

    if (!Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({
        error: 'formats must be a non-empty array'
      });
    }

    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        error: 'features must be a non-empty array with name and description'
      });
    }

    const results = {};
    let totalImagesGenerated = 0;

    // Process each format
    for (const format of formats) {
      console.log(`\n🎨 Processing format: ${format}`);
      
      const templateKey = FORMAT_TO_TEMPLATE[format];
      if (!templateKey || !TEMPLATES[templateKey]) {
        console.warn(`❌ No template found for format: ${format}`);
        continue;
      }

      const templateFn = TEMPLATES[templateKey];
      const formatResults = [];

      // Process each feature
      for (const feature of features) {
        console.log(`🎯 Processing feature: ${feature.name}`);
        
        try {
          // Generate prompt using template
          const prompt = templateFn(
            productName,
            productDescription,
            feature.name,
            feature.description
          );

          console.log('Generated prompt preview:', prompt.substring(0, 200) + '...');

          // Call the base generate endpoint (use localhost in development, deployed URL in production)
          const baseURL = process.env.NODE_ENV === 'production' 
            ? 'https://staticgenius-api-production.up.railway.app'
            : 'http://localhost:3001';
          
          console.log('🌍 Sending to /api/generate with language:', language, 'and model:', model);
          const response = await axios.post(`${baseURL}/api/generate`, {
            prompt,
            aspectRatio,
            language,
            numOutputs: numAds,
            model
          });

          if (response.data.images && Array.isArray(response.data.images)) {
            formatResults.push(...response.data.images);
            totalImagesGenerated += response.data.images.length;
            console.log(`✅ Generated ${response.data.images.length} images for ${format} - ${feature.name}`);
          }
        } catch (error) {
          console.error(`❌ Error generating for ${format} - ${feature.name}:`, error.message);
          // Continue with other combinations instead of failing completely
        }
      }

      if (formatResults.length > 0) {
        results[format] = formatResults;
      }
    }

    console.log(`\n📊 Generation complete: ${totalImagesGenerated} total images across ${Object.keys(results).length} formats`);

    if (Object.keys(results).length === 0) {
      return res.status(500).json({
        error: 'No images were generated',
        details: 'All format/feature combinations failed'
      });
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('❌ Generate-ad endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = handler;
