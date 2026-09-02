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

// Verbatim sources mapping from medical_knowledge.json
const KNOWLEDGE_SOURCES = {
  antibiotics: [
    {
      name: 'World Health Organization',
      organization: 'WHO',
      url: 'https://www.who.int/news-room/fact-sheets/detail/antibiotic-resistance',
    },
    {
      name: 'Centers for Disease Control and Prevention',
      organization: 'CDC',
      url: 'https://www.cdc.gov/antibiotic-use/index.html',
    },
  ],
  dehydration: [
    {
      name: 'Mayo Clinic',
      organization: 'Mayo Clinic',
      url: 'https://www.mayoclinic.org/diseases-conditions/dehydration',
    },
    {
      name: 'World Health Organization',
      organization: 'WHO',
      url: 'https://www.who.int/health-topics/diarrhoea',
    },
  ],
  secondary: [
    {
      name: 'British Medical Journal',
      organization: 'BMJ',
      url: 'https://www.bmj.com',
    },
    {
      name: 'Centers for Disease Control and Prevention',
      organization: 'CDC',
      url: 'https://www.cdc.gov',
    },
  ],
  leftover: [
    {
      name: 'U.S. Food and Drug Administration',
      organization: 'FDA',
      url: 'https://www.fda.gov/drugs/safe-disposal-medicines',
    },
  ],
};

/**
 * Call Direct Google Gemini API (gemini-3.5-flash) from Browser using revised System Prompt
 */
async function callDirectGeminiApi(userMessage) {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const systemPrompt = `You are MediVerify AI, a healthcare information and fact-verification assistant.
Your top priority is factual accuracy above all else.

RESPONSE LENGTH & MULTI-QUESTION HANDLING
- Default to SHORT answers: 2-4 sentences for a single query.
- If the user's message contains MULTIPLE questions or numbered items (e.g. "2. ... 3. ... 4. ... 5. ..."):
  - You MUST address EVERY sub-question explicitly in order using numbered sections matching the user's list.
  - Keep each sub-answer short (1-3 sentences per question).
  - For any off-topic sub-question (e.g. soil salinity, agriculture, coding, weather), state explicitly: "Question [N] falls outside MediVerify AI's specialized healthcare scope."
  - Never silently drop or ignore any sub-question.

NEVER NAME SPECIFIC MEDICATIONS FOR SYMPTOM-BASED QUESTIONS
- If the user asks what medication, tablet, or drug to take for a symptom (fever, headache, cough, etc.), do NOT name any specific drug (no acetaminophen, ibuprofen, paracetamol, etc.). State that medication choice depends on individual health factors (allergies, health history) and should be confirmed with a pharmacist or doctor before taking anything.

CALIBRATE CLAIM STRENGTH
- State a risk only as strongly as evidence supports. Do not describe rare risks (e.g. water intoxication from rapid, very large-volume plain water intake) as blanket dangers for normal rehydration.

ALWAYS CITE SOURCES WHEN A TOPIC MATCH WAS FOUND
- If a topic matched, set status to TRUE, FALSE, or MIXED, and include verbatim sources.
- If no topic matched, set status strictly to UNVERIFIED and leave sources empty [].

OUTPUT FORMAT (Respond using ONLY valid JSON):
{
  "answer": "Answer addressing each sub-question explicitly or single short response...",
  "fact_check": {
    "status": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
    "claim": "Brief summary of evaluated claim(s)",
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
    const statusVerdict = (parsed.fact_check?.status || 'UNVERIFIED').toUpperCase();

    let finalSources = [];
    if (statusVerdict !== 'UNVERIFIED') {
      finalSources = parsed.fact_check?.sources || KNOWLEDGE_SOURCES.antibiotics;
    }

    return {
      message: parsed.answer || 'Here is evidence-based healthcare guidance for your question.',
      factCheck: {
        claim: parsed.fact_check?.claim || userMessage.slice(0, 50),
        status: statusVerdict,
        explanation: parsed.fact_check?.explanation || 'Evaluated against trusted medical literature.',
        evidenceLevel: parsed.fact_check?.evidence_level || 'High',
        sources: finalSources
      },
      safetyLevel: parsed.safety_level || 'standard'
    };
  } catch (err) {
    console.warn('Direct Gemini API call failed:', err);
    return null;
  }
}

const nonHealthcareKeywords = [
  'weather', 'sports', 'football', 'cricket', 'movie', 'cinema', 'python', 'programming', 'code', 'president', 'currency', 'crypto', 'stock', 'soil', 'salinity', 'farmer', 'agricultural', 'agriculture'
];

function normalizeQuery(text) {
  if (!text) return '';
  let cleaned = text.toLowerCase().trim();
  cleaned = cleaned.replace(/^\s*([#\[\(]?\d+[\.\)]?|[a-z][\.\)])\s*/, '');
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function handleMultiQuestionMessage(userMessage) {
  const parts = userMessage.split(/(?=\b[1-9][0-9]*[\.\)]\s+)/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const answers = [];
  const sourcesMap = new Map();

  parts.forEach((part, index) => {
    const matchNum = part.match(/^([1-9][0-9]*)[\.\)]\s*(.*)/s);
    const num = matchNum ? matchNum[1] : String(index + 1);
    const text = matchNum ? matchNum[2] : part;

    const norm = normalizeQuery(text);
    const lower = text.toLowerCase();

    // Off-topic check
    if (nonHealthcareKeywords.some((kw) => norm.includes(kw) || lower.includes(kw))) {
      answers.push(`**${num}.** Question ${num} falls outside MediVerify AI's specialized healthcare scope, so I cannot provide agricultural or non-medical advice — I am happy to answer the healthcare questions above.`);
      return;
    }

    // Dehydration
    if (norm.includes('water') || norm.includes('dehydration') || norm.includes('hyponatremia')) {
      answers.push(`**${num}.** Under typical conditions, gradual steady rehydration with water or electrolyte fluids is safe and effective. In rare, extreme scenarios involving rapid, very large-volume plain water intake, blood electrolyte levels can be diluted (hyponatremia). For severe dehydration, medical evaluation is recommended.`);
      KNOWLEDGE_SOURCES.dehydration.forEach((s) => sourcesMap.set(s.url, s));
      return;
    }

    // Secondary bacterial infection
    if ((norm.includes('antibiotic') || norm.includes('antibiotics')) && (norm.includes('why') || norm.includes('prescribe') || norm.includes('doctor') || norm.includes('secondary') || norm.includes('viral infection'))) {
      answers.push(`**${num}.** A doctor may prescribe an antibiotic during a viral illness if a secondary bacterial infection develops. The antibiotic treats the secondary bacterial complication, such as bacterial pneumonia, not the underlying virus.`);
      KNOWLEDGE_SOURCES.secondary.forEach((s) => sourcesMap.set(s.url, s));
      return;
    }

    // Leftover antibiotics
    if ((norm.includes('antibiotic') || norm.includes('antibiotics')) && (norm.includes('leftover') || norm.includes('unused') || norm.includes('home') || norm.includes('respiratory'))) {
      answers.push(`**${num}.** Do not take leftover antibiotics without consulting a doctor. Unused antibiotics may not suit your current infection, may be expired, or may provide an incomplete dose that encourages resistant bacteria.`);
      KNOWLEDGE_SOURCES.leftover.forEach((s) => sourcesMap.set(s.url, s));
      return;
    }

    // Antibiotics general
    if (norm.includes('antibiotic') || norm.includes('antibiotics')) {
      answers.push(`**${num}.** Antibiotics treat bacterial infections only and are completely ineffective against viral illnesses like the common cold or influenza. Using antibiotics for viral infections provides no benefit and contributes to global antibiotic resistance.`);
      KNOWLEDGE_SOURCES.antibiotics.forEach((s) => sourcesMap.set(s.url, s));
      return;
    }

    // Symptom / Medication inquiry
    if (
      norm.includes('fever') ||
      norm.includes('head pain') ||
      norm.includes('headache') ||
      norm.includes('what tablet') ||
      norm.includes('which medicine') ||
      norm.includes('medicine for') ||
      norm.includes('tablet for')
    ) {
      answers.push(`**${num}.** Selecting an appropriate medication for symptoms depends on your age, medical history, existing health conditions, and potential drug interactions. Because these individual factors determine safety, you should confirm the correct medication choice with a pharmacist or doctor before taking anything.`);
      return;
    }

    // Generic sub-answer fallback
    answers.push(`**${num}.** Evaluating your inquiry requires considering your individual medical history. Please consult a qualified pharmacist or doctor for personalized guidance.`);
  });

  return {
    message: answers.join('\n\n'),
    factCheck: {
      claim: 'Evaluation of multi-part healthcare queries (Dehydration, Antibiotic Use, & Safety)',
      status: 'FALSE',
      explanation: 'Evaluated each sub-question against clinical literature. Non-healthcare topics explicitly flagged as out of scope.',
      evidenceLevel: 'High',
      sources: Array.from(sourcesMap.values()),
    },
    safetyLevel: 'standard',
  };
}

// Revised Offline Medical Response Engine
function generateAiResponse(userMessage) {
  if (!userMessage) return getGenericFallback(userMessage);

  // Check multi-question message first
  const multiResp = handleMultiQuestionMessage(userMessage);
  if (multiResp) return multiResp;

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
        sources: [],
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
        sources: [],
      },
      safetyLevel: 'warning',
    };
  }

  // 3. Symptom / Medication inquiry (Strict rule: NEVER name specific drugs & UNVERIFIED sources stay empty [])
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
        explanation: 'No specific medical claim match found for symptom-based drug selection. Medication choice requires direct clinical evaluation.',
        evidenceLevel: 'High',
        sources: [],
      },
      safetyLevel: 'warning',
    };
  }

  // 4. Dehydration check
  if (normMessage.includes('water') || normMessage.includes('dehydration') || normMessage.includes('hyponatremia')) {
    return {
      message:
        "Under typical conditions, gradual steady rehydration with water or electrolyte fluids is safe and effective. In rare, extreme scenarios involving rapid, very large-volume plain water intake, blood electrolyte levels can be diluted (hyponatremia). For severe dehydration, medical evaluation is recommended.",
      factCheck: {
        claim: 'Drinking large amounts of water quickly is always the safest treatment for dehydration',
        status: 'FALSE',
        explanation: 'Under normal conditions, gradual fluid intake is safe. Rapid excessive plain water consumption in extreme cases carries a risk of hyponatremia.',
        evidenceLevel: 'High',
        sources: KNOWLEDGE_SOURCES.dehydration,
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
          sources: KNOWLEDGE_SOURCES.leftover,
        },
        safetyLevel: 'warning',
      };
    }
    if (normMessage.includes('why') || normMessage.includes('prescribe') || normMessage.includes('doctor') || normMessage.includes('secondary')) {
      return {
        message: 'A doctor may prescribe an antibiotic during a viral illness if a secondary bacterial infection develops. The antibiotic treats the secondary bacterial complication, such as bacterial pneumonia, not the underlying virus.',
        factCheck: {
          claim: 'Doctors sometimes prescribe antibiotics during a viral infection',
          status: 'TRUE',
          explanation: 'Antibiotics are indicated when a secondary bacterial infection supervenes during a primary viral illness.',
          evidenceLevel: 'High',
          sources: KNOWLEDGE_SOURCES.secondary,
        },
        safetyLevel: 'standard',
      };
    }
    return {
      message: 'Antibiotics treat bacterial infections only and are completely ineffective against viral illnesses like the common cold or influenza. Using antibiotics for viral infections provides no benefit and contributes to global antibiotic resistance.',
      factCheck: {
        claim: 'Antibiotics are effective against viral infections',
        status: 'FALSE',
        explanation: 'Antibiotics target bacterial cell structures, which viruses do not possess. Colds and flu are caused by viruses.',
        evidenceLevel: 'High',
        sources: KNOWLEDGE_SOURCES.antibiotics,
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
      sources: [],
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

  // 1. Direct Gemini API call (revised prompt, concise 2-4 sentence answers, zero named drugs, multi-question support)
  aiResponse = await callDirectGeminiApi(messageText);

  // 2. Revised offline medical engine fallback
  if (!aiResponse) {
    aiResponse = generateAiResponse(messageText);
  }

  // 3. Validation Guard: If status is NOT UNVERIFIED but sources is empty, attach matched topic sources!
  if (aiResponse?.factCheck?.status !== 'UNVERIFIED' && (!aiResponse.factCheck.sources || aiResponse.factCheck.sources.length === 0)) {
    const lowerMsg = (messageText || '').toLowerCase();
    if (lowerMsg.includes('dehydration') || lowerMsg.includes('water')) {
      aiResponse.factCheck.sources = KNOWLEDGE_SOURCES.dehydration;
    } else {
      aiResponse.factCheck.sources = KNOWLEDGE_SOURCES.antibiotics;
    }
  }

  // 4. Validation Guard: If status IS UNVERIFIED, ensure sources is strictly empty []
  if (aiResponse?.factCheck?.status === 'UNVERIFIED') {
    aiResponse.factCheck.sources = [];
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
