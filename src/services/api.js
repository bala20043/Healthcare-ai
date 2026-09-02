import axios from 'axios';
import { supabase } from '../lib/supabase';

/**
 * API Service Layer with Direct Google Gemini Integration & Supabase Backup
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(500 + Math.random() * 500);

/**
 * Call Direct Google Gemini API (gemini-3.5-flash) from Browser
 */
async function callDirectGeminiApi(userMessage) {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const systemPrompt = `You are MediVerify AI, an expert clinical healthcare fact-checker and medical information assistant.
You MUST reply with a strictly valid JSON object matching this schema:
{
  "answer": "Detailed, evidence-based, empathetic healthcare response formatted with clear Markdown headers, bullet points, over-the-counter guidelines, home care, and red-flag warnings.",
  "fact_check": {
    "status": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
    "claim": "Clear concise summary of the health claim or question",
    "explanation": "Scientific explanation based on clinical evidence and medical consensus",
    "evidence_level": "High" | "Moderate" | "Low",
    "sources": [
      {"name": "Mayo Clinic", "url": "https://www.mayoclinic.org"},
      {"name": "World Health Organization", "url": "https://www.who.int"}
    ]
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
    return {
      message: parsed.answer || 'Here is evidence-based healthcare guidance for your question.',
      factCheck: {
        claim: parsed.fact_check?.claim || userMessage.slice(0, 50),
        status: (parsed.fact_check?.status || 'UNVERIFIED').toUpperCase(),
        explanation: parsed.fact_check?.explanation || 'Evaluated against trusted medical literature.',
        evidenceLevel: parsed.fact_check?.evidence_level || 'High',
        sources: parsed.fact_check?.sources || [
          { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org' },
          { name: 'World Health Organization', url: 'https://www.who.int' }
        ]
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

// Comprehensive Offline Medical Response Engine
function generateAiResponse(userMessage) {
  if (!userMessage) return getGenericFallback(userMessage);

  const normMessage = normalizeQuery(userMessage);
  const lowerMessage = userMessage.toLowerCase().trim();

  // 1. Non-healthcare check
  if (nonHealthcareKeywords.some((kw) => normMessage.includes(kw) || lowerMessage.includes(kw))) {
    return {
      message: 'This query falls outside MediVerify AI\'s specialized healthcare scope. MediVerify AI is designed exclusively for medical fact verification, health claim evaluation, and safe healthcare guidance.',
      factCheck: {
        claim: `Non-healthcare inquiry (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: `The topic '${userMessage.slice(0, 40)}' is outside the scope of healthcare and medical fact verification.`,
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
      message: 'Chest pain, heart pain, or difficulty breathing are critical medical symptoms that require immediate professional evaluation. Potential causes range from acute coronary syndrome (heart attack) to severe pulmonary emergencies. Please do not attempt self-treatment.',
      factCheck: {
        claim: `Emergency symptom evaluation (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: 'Acute cardiac or respiratory symptoms cannot be diagnosed online and require immediate clinical assessment.',
        evidenceLevel: 'High',
        sources: [
          { name: 'American Heart Association', url: 'https://www.heart.org' },
          { name: 'Mayo Clinic Emergency Care', url: 'https://www.mayoclinic.org' },
        ],
      },
      safetyLevel: 'warning',
    };
  }

  // 3. Head pain / Headache / Migraine response
  if (normMessage.includes('head pain') || normMessage.includes('headache') || normMessage.includes('head ache') || normMessage.includes('migraine')) {
    return {
      message:
        "The standard, safest first-line over-the-counter medications for managing head pain and headaches in adults are:\n\n" +
        "• **Paracetamol (Acetaminophen / Tylenol)**: Typically **500 mg to 1,000 mg** every 4 to 6 hours as needed for tension headaches and mild-to-moderate pain.\n" +
        "  - *Crucial Rule*: Do not exceed **4,000 mg (4 grams)** total in a 24-hour period to protect your liver.\n\n" +
        "• **Ibuprofen (NSAID)**: Typically **200 mg to 400 mg** every 4 to 6 hours as needed with food, which helps reduce inflammation associated with headaches or migraines.\n" +
        "  - *Crucial Rule*: Avoid ibuprofen if you have a history of stomach ulcers, kidney issues, or bleeding disorders.\n\n" +
        "• **Combination Analgesics**: Over-the-counter formulations containing paracetamol + caffeine or aspirin can be effective for stubborn tension headaches or early-stage migraines.\n\n" +
        "### 🏡 Home Remedies & Care\n" +
        "• **Hydrate**: Drink 1–2 glasses of water immediately; dehydration is a primary trigger for head pain.\n" +
        "• **Cold/Warm Compress**: Apply a cool cloth to your forehead or a warm compress to the back of your neck.\n" +
        "• **Dim Lights & Rest**: Rest in a quiet, dark room to reduce sensory stimulation.\n\n" +
        "### ⚠️ Red Flag Symptoms (Seek Emergency Care)\n" +
        "Seek urgent medical attention if your head pain is accompanied by:\n" +
        "• Sudden, extremely severe 'thunderclap' onset\n" +
        "• High fever, stiff neck, confusion, or difficulty speaking\n" +
        "• Numbness, weakness, or vision loss",
      factCheck: {
        claim: 'Paracetamol and Ibuprofen are first-line over-the-counter medications for headaches',
        status: 'TRUE',
        explanation: 'Clinical guidelines designate Acetaminophen and NSAIDs (such as Ibuprofen) as evidence-based first-line acute treatments for tension headaches and mild-to-moderate migraine attacks.',
        evidenceLevel: 'High',
        sources: [
          { name: 'Mayo Clinic - Headache Guidance', url: 'https://www.mayoclinic.org/symptoms/headache/basics/definition/sym-20050800' },
          { name: 'American Migraine Foundation', url: 'https://americanmigrainefoundation.org' },
          { name: 'World Health Organization', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 4. Fever response
  if (normMessage.includes('fever') || normMessage.includes('temperature') || normMessage.includes('chills')) {
    return {
      message:
        "The standard, safest first-line over-the-counter medications for managing a fever in adults are:\n\n" +
        "• **Paracetamol (Acetaminophen / Tylenol)**: Typically **500 mg to 1,000 mg** every 4 to 6 hours as needed.\n" +
        "  - *Crucial Rule*: Do not exceed **4,000 mg (4 grams)** total in a 24-hour period to protect your liver.\n\n" +
        "• **Ibuprofen (NSAID)**: Typically **200 mg to 400 mg** every 4 to 6 hours as needed with food.\n" +
        "  - *Crucial Rule*: Avoid ibuprofen if you have a history of stomach ulcers, kidney disease, or suspect Dengue fever.\n\n" +
        "### 🏡 Basic Home Care\n" +
        "• **Hydrate**: Drink plenty of fluids (water, oral rehydration solution/ORS) to prevent dehydration.\n" +
        "• **Rest**: Allow your immune system time to recover.\n" +
        "• **Cool Down**: Wear light clothing and use a light blanket if experiencing chills.\n\n" +
        "### ⚠️ Red Flag Symptoms\n" +
        "Go to urgent care if fever exceeds 103°F (39.4°C), lasts >3 days, or occurs with stiff neck, shortness of breath, or confusion.",
      factCheck: {
        claim: 'Paracetamol and Ibuprofen are safe first-line over-the-counter fever reducers',
        status: 'TRUE',
        explanation: 'Over-the-counter antipyretics like Acetaminophen and Ibuprofen are clinically established first-line medications for fever management in adults.',
        evidenceLevel: 'High',
        sources: [
          { name: 'Mayo Clinic - Fever Guidance', url: 'https://www.mayoclinic.org/diseases-conditions/fever' },
          { name: 'World Health Organization', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 5. Stomach pain / Acidity / Indigestion
  if (normMessage.includes('stomach') || normMessage.includes('acidity') || normMessage.includes('gas') || normMessage.includes('abdomen')) {
    return {
      message:
        "For mild stomach pain, acidity, or indigestion in adults:\n\n" +
        "• **Antacids**: Over-the-counter antacids (like Calcium Carbonate or Gelusil) provide rapid relief for acidity and heart burn.\n" +
        "• **H2 Blockers / PPIs**: Famotidine or Omeprazole help reduce stomach acid production for acid reflux.\n" +
        "• **Antispasmodics**: Dicyclomine or peppermint oil capsules help relieve stomach cramping.\n\n" +
        "### 🏡 Home Care\n" +
        "• Sip warm water or ginger tea.\n" +
        "• Eat light, bland meals (BRAT diet: bananas, rice, applesauce, toast).\n" +
        "• Avoid spicy, greasy, or acidic foods.\n\n" +
        "### ⚠️ Seek Emergency Care If\n" +
        "Stomach pain is sudden, severe, accompanied by persistent vomiting, blood in stool, high fever, or yellowing skin (jaundice).",
      factCheck: {
        claim: 'Antacids and H2 blockers effectively manage mild stomach acidity and indigestion',
        status: 'TRUE',
        explanation: 'Antacids neutralize gastric acid and H2 blockers suppress acid production, making them evidence-based treatments for dyspepsia and GERD symptoms.',
        evidenceLevel: 'High',
        sources: [
          { name: 'Mayo Clinic - Indigestion', url: 'https://www.mayoclinic.org/diseases-conditions/indigestion' },
          { name: 'NIH MedlinePlus', url: 'https://medlineplus.gov' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 6. Cold / Cough / Sore Throat
  if (normMessage.includes('cold') || normMessage.includes('cough') || normMessage.includes('sore throat') || normMessage.includes('flu')) {
    return {
      message:
        "Common cold and cough are usually viral. Standard over-the-counter options for symptom relief include:\n\n" +
        "• **Cough Suppressants**: Dextromethorphan for dry coughs.\n" +
        "• **Expectorants**: Guaifenesin to loosen mucus in wet coughs.\n" +
        "• **Sore Throat Relief**: Warm salt water gargles and throat lozenges containing benzocaine or menthol.\n" +
        "• **Decongestants**: Phenylephrine or saline nasal sprays for nasal congestion.\n\n" +
        "*(Note: Antibiotics do NOT treat viral cold or cough.)*",
      factCheck: {
        claim: 'Over-the-counter decongestants and throat lozenges relieve cold and cough symptoms',
        status: 'TRUE',
        explanation: 'Symptomatic treatments manage viral cold symptoms effectively while the immune system clears the viral infection.',
        evidenceLevel: 'High',
        sources: [
          { name: 'CDC Cold & Flu Guidelines', url: 'https://www.cdc.gov/flu' },
          { name: 'World Health Organization', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'standard',
    };
  }

  // 7. General Healthcare Question Fallback
  return getGenericFallback(userMessage);
}

function getGenericFallback(userMessage = '') {
  const topic = userMessage.slice(0, 50) || 'Healthcare Query';
  return {
    message:
      `Regarding your inquiry on **"${topic}"**:\n\n` +
      "Medical information and symptom evaluation should always be considered in context with your individual health history:\n\n" +
      "• **Over-the-Counter Guidance**: Always review active ingredients and dosage limits before taking any new medication.\n" +
      "• **Consultation**: Consult a licensed pharmacist or physician for specific drug interactions, prescriptions, or persistent symptoms.\n" +
      "• **Emergency Safety**: If experiencing severe pain, high fever, or breathing difficulty, seek urgent clinical care.",
    factCheck: {
      claim: topic,
      status: 'UNVERIFIED',
      explanation: `Medical guidance evaluated for '${topic}'. Always cross-reference symptoms with a qualified physician.`,
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
 * 1. Try FastAPI backend API (/api/v1/chat)
 * 2. If backend is offline/unreachable, try Direct Google Gemini API (gemini-3.5-flash)
 * 3. If network is offline, fallback to comprehensive local medical engine
 */
export async function sendMessage(messageText, conversationId = null) {
  let aiResponse = null;

  // 1. Attempt FastAPI backend call first
  try {
    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await apiClient.post(
      '/api/v1/chat',
      {
        message: messageText,
        conversation_id: conversationId || undefined,
      },
      { headers }
    );

    if (response.data && response.data.success) {
      const data = response.data;
      let evLevel = data.fact_check?.evidence_level || 'High';
      if (evLevel === 'HIGH') evLevel = 'High';
      if (evLevel === 'MEDIUM') evLevel = 'Moderate';
      if (evLevel === 'LOW') evLevel = 'Low';

      const safetyNoticeLevel = data.safety_notice?.level;
      const isEmergencyOrHigh = safetyNoticeLevel === 'EMERGENCY' || safetyNoticeLevel === 'HIGH';

      const sourcesList = (data.fact_check?.sources || []).map((s) => ({
        name: s.name || s.organization || 'Medical Source',
        url: s.url || '#',
      }));

      aiResponse = {
        message: data.answer || 'Thank you for your healthcare question.',
        factCheck: {
          claim: data.fact_check?.claim || messageText.substring(0, 40),
          status: (data.fact_check?.status || 'UNVERIFIED').toUpperCase(),
          explanation: data.fact_check?.explanation || 'Evaluated against trusted medical literature.',
          evidenceLevel: evLevel,
          sources: sourcesList.length > 0 ? sourcesList : [
            { name: 'World Health Organization', url: 'https://www.who.int' },
            { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org' },
          ],
        },
        safetyLevel: isEmergencyOrHigh ? 'warning' : 'standard',
        chatId: data.conversation_id || conversationId,
      };
    }
  } catch (err) {
    console.warn('Backend API offline or unreachable, calling Direct Gemini API...');
  }

  // 2. If backend call failed, call Direct Google Gemini API from browser
  if (!aiResponse) {
    aiResponse = await callDirectGeminiApi(messageText);
  }

  // 3. If direct Gemini API call also failed, use comprehensive local medical engine
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
