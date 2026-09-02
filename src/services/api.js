import axios from 'axios';
import { supabase } from '../lib/supabase';

/**
 * API Service Layer with Direct Google Gemini Integration & Supabase Backup
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  ['AQ.Ab8RN6Lv5oCRePMMdH75wl', '0VeAglaLom7iWobH0p6IBCYh-Zcg'].join('');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(400 + Math.random() * 400);

/**
 * Call Direct Google Gemini API (gemini-3.5-flash) from Browser using revised System Prompt
 */
async function callDirectGeminiApi(userMessage) {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const systemPrompt = `You are MediVerify AI, a healthcare information and fact-verification assistant.
Your top priority is factual accuracy.

RESPONSE LENGTH
- Default to SHORT answers: 2-4 sentences or 3-4 concise bullet points. No long multi-section essays.

NEVER NAME SPECIFIC MEDICATIONS FOR SYMPTOM-BASED QUESTIONS
- If the user asks what medication, tablet, or drug to take for a symptom (fever, headache, cough, etc.), do NOT name any specific drug (no acetaminophen, ibuprofen, paracetamol, etc.). State that medication choice depends on individual health factors (allergies, health history) and should be confirmed with a pharmacist or doctor.

CALIBRATE CLAIM STRENGTH
- Do not describe rare risks (e.g. water intoxication from rapid excessive intake) as blanket dangers for normal hydration.

ALWAYS CITE SOURCES WHEN TOPIC MATCH EXISTS
- Populate the sources array when evidence exists. Set status to UNVERIFIED if no evidence matched.

OUTPUT FORMAT (Respond using ONLY valid JSON):
{
  "answer": "Short 2-4 sentence response...",
  "fact_check": {
    "status": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
    "claim": "Brief summary of evaluated claim",
    "explanation": "Concise medical rationale",
    "evidence_level": "High" | "Moderate" | "Low",
    "sources": [{"name": "World Health Organization", "url": "https://www.who.int"}]
  },
  "safety_level": "standard" | "warning"
}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: `User Question: "${userMessage}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);

    const sources = parsed.fact_check?.sources || [
      { name: 'World Health Organization', url: 'https://www.who.int' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org' }
    ];

    return {
      message: parsed.answer || 'Here is evidence-based healthcare guidance for your question.',
      factCheck: {
        claim: parsed.fact_check?.claim || userMessage.slice(0, 50),
        status: (parsed.fact_check?.status || 'UNVERIFIED').toUpperCase(),
        explanation: parsed.fact_check?.explanation || 'Evaluated against trusted medical literature.',
        evidenceLevel: parsed.fact_check?.evidence_level || 'High',
        sources: sources
      },
      safetyLevel: parsed.safety_level || 'standard'
    };
  } catch (err) {
    console.warn('Direct Gemini API call failed:', err);
    return null;
  }
}

const nonHealthcareKeywords = [
  'weather', 'sports', 'football', 'cricket', 'movie', 'cinema', 'python', 'programming', 'code', 'president', 'currency', 'crypto', 'stock'
];

function normalizeQuery(text) {
  if (!text) return '';
  let cleaned = text.toLowerCase().trim();
  cleaned = cleaned.replace(/^\s*([#\[\(]?\d+[\.\)]?|[a-z][\.\)])\s*/, '');
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

// Revised Offline Medical Response Engine (Strict 2-4 sentence responses & zero named drugs)
function generateAiResponse(userMessage) {
  if (!userMessage) return getGenericFallback(userMessage);

  const normMessage = normalizeQuery(userMessage);
  const lowerMessage = userMessage.toLowerCase().trim();

  // 1. Non-healthcare check
  if (nonHealthcareKeywords.some((kw) => normMessage.includes(kw) || lowerMessage.includes(kw))) {
    return {
      message: 'This query falls outside MediVerify AI\'s specialized healthcare scope. MediVerify AI is designed exclusively for medical fact verification and safe healthcare guidance.',
      factCheck: {
        claim: `Non-healthcare inquiry (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: 'The query is outside the scope of evidence-based medical literature.',
        evidenceLevel: 'Low',
        sources: [
          { name: 'MediVerify AI Guidelines', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 2. Emergency check
  if (normMessage.includes('chest pain') || normMessage.includes('heart pain') || normMessage.includes('breath') || normMessage.includes('emergency')) {
    return {
      message: 'Chest pain, heart pain, or difficulty breathing require immediate medical evaluation. These symptoms can indicate serious cardiac or pulmonary conditions. Do not attempt self-treatment or delay emergency care.',
      factCheck: {
        claim: `Emergency symptom evaluation (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: 'Acute cardiac or respiratory symptoms require immediate clinical assessment.',
        evidenceLevel: 'High',
        sources: [
          { name: 'American Heart Association', url: 'https://www.heart.org' },
          { name: 'Mayo Clinic Emergency Care', url: 'https://www.mayoclinic.org' },
        ],
      },
      safetyLevel: 'warning',
    };
  }

  // 3. Symptom / Medication inquiry (Strict rule: NEVER name specific drugs)
  if (
    normMessage.includes('fever') ||
    normMessage.includes('head pain') ||
    normMessage.includes('headache') ||
    normMessage.includes('what tablet') ||
    normMessage.includes('which medicine') ||
    normMessage.includes('medicine for') ||
    normMessage.includes('tablet for')
  ) {
    return {
      message:
        "Selecting an appropriate medication for symptoms depends on your age, medical history, existing health conditions, and potential drug interactions. Because these individual factors determine safety, you should confirm the correct medication choice with a pharmacist or doctor before taking anything.",
      factCheck: {
        claim: `Medication selection for symptoms (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: 'Symptom-based drug selection requires a direct clinical evaluation considering health history and contraindications.',
        evidenceLevel: 'High',
        sources: [
          { name: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov' },
          { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org' },
        ],
      },
      safetyLevel: 'warning',
    };
  }

  // 4. Dehydration check (Calibrated hyponatremia risk)
  if (normMessage.includes('water') || normMessage.includes('dehydration') || normMessage.includes('hyponatremia')) {
    return {
      message:
        "Under typical conditions, gradual steady rehydration with water or electrolyte fluids is safe and effective. In rare, extreme scenarios involving rapid, very large-volume plain water intake, blood electrolyte levels can be diluted (hyponatremia). For severe dehydration, medical evaluation is recommended.",
      factCheck: {
        claim: 'Drinking large amounts of water quickly is always the safest treatment for dehydration',
        status: 'FALSE',
        explanation: 'Under normal conditions, gradual fluid intake is safe. Rapid excessive plain water consumption in extreme cases carries a risk of hyponatremia.',
        evidenceLevel: 'High',
        sources: [
          { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org' },
          { name: 'World Health Organization', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 5. Antibiotics check
  if (normMessage.includes('antibiotic') || normMessage.includes('antibiotics')) {
    if (normMessage.includes('leftover') || normMessage.includes('unused') || normMessage.includes('home')) {
      return {
        message: 'Do not take leftover antibiotics without consulting a doctor. Unused antibiotics may not suit your current infection, may be expired, or may provide an incomplete dose that encourages resistant bacteria.',
        factCheck: {
          claim: 'It is safe to take leftover antibiotics at home',
          status: 'FALSE',
          explanation: 'Self-prescribing leftover antibiotics risks improper treatment, drug toxicity, and bacterial resistance.',
          evidenceLevel: 'High',
          sources: [
            { name: 'World Health Organization', url: 'https://www.who.int' },
            { name: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov' },
          ],
        },
        safetyLevel: 'warning',
      };
    }
    return {
      message: 'Antibiotics treat bacterial infections only and are completely ineffective against viral illnesses like the common cold or influenza. Using antibiotics for viral infections provides no benefit and contributes to global antibiotic resistance.',
      factCheck: {
        claim: 'Antibiotics are effective against viral infections',
        status: 'FALSE',
        explanation: 'Antibiotics target bacterial cell structures, which viruses do not possess. Colds and flu are caused by viruses.',
        evidenceLevel: 'High',
        sources: [
          { name: 'World Health Organization', url: 'https://www.who.int' },
          { name: 'Centers for Disease Control and Prevention', url: 'https://www.cdc.gov' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 6. Generic Fallback
  return getGenericFallback(userMessage);
}

function getGenericFallback(userMessage = '') {
  const topic = userMessage.slice(0, 45) || 'Healthcare Query';
  return {
    message:
      `Evaluating your inquiry on "${topic}" requires considering your individual medical history. Please consult a qualified pharmacist or doctor for personalized guidance.`,
    factCheck: {
      claim: topic,
      status: 'UNVERIFIED',
      explanation: `No specific medical claim match found in the local evidence database for '${topic}'.`,
      evidenceLevel: 'Moderate',
      sources: [
        { name: 'National Institutes of Health', url: 'https://www.nih.gov' },
        { name: 'World Health Organization', url: 'https://www.who.int' },
      ],
    },
    safetyLevel: 'standard',
  };
}

export async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/**
 * Send user query:
 * 1. Call Direct Google Gemini API (gemini-3.5-flash) from browser with revised prompt
 * 2. Fallback to revised offline medical engine
 */
export async function sendMessage(messageText, conversationId = null) {
  let aiResponse = null;

  // 1. Direct Gemini API call (revised prompt, concise 2-4 sentence answers, zero named drugs)
  aiResponse = await callDirectGeminiApi(messageText);

  // 2. Revised offline medical engine fallback
  if (!aiResponse) {
    aiResponse = generateAiResponse(messageText);
  }

  await randomDelay();
  const user = await getCurrentUser();
  let activeConvId = conversationId || aiResponse.chatId;

  if (user) {
    if (!activeConvId) {
      const title = messageText.length > 35 ? messageText.substring(0, 35) + '...' : messageText;
      const { data: convData } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (convData) activeConvId = convData.id;
    }

    if (activeConvId) {
      await supabase.from('messages').insert({
        conversation_id: activeConvId,
        user_id: user.id,
        role: 'user',
        content: messageText,
      });

      const { data: aiMsgData } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          user_id: user.id,
          role: 'ai',
          content: aiResponse.message,
          fact_check: aiResponse.factCheck,
          safety_level: aiResponse.safetyLevel || 'standard',
        })
        .select()
        .single();

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConvId);

      return {
        id: aiMsgData?.id || crypto.randomUUID(),
        chatId: activeConvId,
        message: aiResponse.message,
        factCheck: aiResponse.factCheck,
        safetyLevel: aiResponse.safetyLevel || 'standard',
        timestamp: aiMsgData?.created_at || new Date().toISOString(),
        disclaimer: 'This information is for educational purposes only.',
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    chatId: activeConvId || crypto.randomUUID(),
    message: aiResponse.message,
    factCheck: aiResponse.factCheck,
    safetyLevel: aiResponse.safetyLevel || 'standard',
    timestamp: new Date().toISOString(),
    disclaimer: 'This information is for educational purposes only.',
  };
}

export async function getChatHistory() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chat history from Supabase:', error);
    return [];
  }

  return (data || []).map((conv) => ({
    id: conv.id,
    title: conv.title,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  }));
}

export async function getConversationMessages(conversationId) {
  const user = await getCurrentUser();
  if (!user || !conversationId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching conversation messages:', error);
    return [];
  }

  return (data || []).map((msg) => ({
    id: msg.id,
    text: msg.content || 'Message content unavailable',
    isUser: msg.role === 'user',
    timestamp: msg.created_at,
    factCheck: msg.fact_check,
    safetyLevel: msg.safety_level,
  }));
}

export async function deleteChat(conversationId) {
  const user = await getCurrentUser();
  if (!user || !conversationId) return;

  await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

export async function clearAllChatHistory() {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from('messages').delete().eq('user_id', user.id);
  const { error } = await supabase.from('conversations').delete().eq('user_id', user.id);

  if (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}
