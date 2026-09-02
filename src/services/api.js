import axios from 'axios';
import { supabase } from '../lib/supabase';

/**
 * API Service Layer with Backend Integration & Supabase Fallback
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to simulate response delay if needed
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(800 + Math.random() * 700);

// ─── Mock AI Responses Fallback ──────────────────────────────────────────

const mockResponses = {
  'are antibiotics effective against viral infections': {
    message:
      'Antibiotics are generally not effective against viral infections, including the common cold and influenza. Antibiotics are specifically designed to target and kill bacteria or inhibit their growth. Viruses have a fundamentally different structure and replication mechanism than bacteria, which means antibiotics cannot affect them.\n\nUsing antibiotics for viral infections can actually be harmful — it contributes to antibiotic resistance, which is a growing global health concern recognized by the World Health Organization.',
    factCheck: {
      claim: 'Antibiotics are effective against viral infections',
      status: 'FALSE',
      explanation:
        'Antibiotics are designed to treat bacterial infections only. They have no therapeutic effect on viruses, which cause illnesses like the common cold, influenza, and COVID-19.',
      evidenceLevel: 'High',
      sources: [
        { name: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/antibiotic-resistance' },
        { name: 'Centers for Disease Control and Prevention', url: 'https://www.cdc.gov/antibiotic-use/index.html' },
        { name: 'National Institutes of Health', url: 'https://www.nih.gov' },
      ],
    },
    safetyLevel: 'standard',
  },
  'is drinking a large amount of water quickly always the safest treatment for dehydration': {
    message:
      'Drinking a large amount of water very quickly is not always the safest approach to treating dehydration. While rehydration is essential, the safest method depends on the severity and cause of dehydration.\n\nFor mild dehydration, sipping water or oral rehydration solutions (ORS) gradually is recommended. Drinking too much water too quickly can lead to a condition called hyponatremia (water intoxication), where sodium levels in the blood become dangerously low.\n\nFor moderate to severe dehydration, especially in children, elderly individuals, or those with medical conditions, oral rehydration solutions containing electrolytes are preferred. Severe dehydration may require intravenous (IV) fluid administration under medical supervision.',
    factCheck: {
      claim: 'Drinking large amounts of water quickly is always the safest dehydration treatment',
      status: 'FALSE',
      explanation:
        'Rapid consumption of large quantities of plain water can cause hyponatremia (low blood sodium). Gradual rehydration with electrolyte-balanced solutions is generally safer and more effective.',
      evidenceLevel: 'High',
      sources: [
        { name: 'World Health Organization', url: 'https://www.who.int' },
        { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions/dehydration' },
      ],
    },
    safetyLevel: 'standard',
  },
  'why might a doctor prescribe antibiotics to someone who initially has a viral infection': {
    message:
      'While antibiotics don\'t treat viral infections directly, a doctor might prescribe them in certain situations:\n\n1. **Secondary Bacterial Infection**: A viral infection can weaken the immune system, making the body vulnerable to a secondary bacterial infection. For example, a viral respiratory infection might lead to bacterial pneumonia or a bacterial sinus infection.\n\n2. **Preventive (Prophylactic) Use**: In some cases, particularly for immunocompromised patients, antibiotics may be prescribed preventively to reduce the risk of bacterial complications.\n\n3. **Diagnostic Uncertainty**: Sometimes it can be difficult to determine whether an infection is viral or bacterial without extensive testing. A doctor may prescribe antibiotics as a precaution while awaiting test results.\n\nIt\'s important to always follow your doctor\'s instructions regarding antibiotic use and complete the full prescribed course.',
    factCheck: {
      claim: 'Doctors sometimes prescribe antibiotics during viral infections',
      status: 'TRUE',
      explanation:
        'This is a medically recognized practice. Antibiotics may be prescribed to prevent or treat secondary bacterial infections, for immunocompromised patients, or when diagnostic uncertainty exists.',
      evidenceLevel: 'High',
      sources: [
        { name: 'British Medical Journal', url: 'https://www.bmj.com' },
        { name: 'Centers for Disease Control and Prevention', url: 'https://www.cdc.gov' },
      ],
    },
    safetyLevel: 'standard',
  },
  'should i take leftover antibiotics at home': {
    message:
      'No, you should generally not take leftover antibiotics without consulting a healthcare professional. Here\'s why:\n\n1. **Wrong Medication**: The leftover antibiotics may not be appropriate for your current condition. Different infections require different antibiotics.\n\n2. **Incorrect Dosage**: The remaining quantity may not be sufficient for a complete course of treatment, which can contribute to antibiotic resistance.\n\n3. **Expiration**: Medications can degrade over time and may be less effective or potentially harmful after their expiration date.\n\n4. **Masking Symptoms**: Taking antibiotics without proper diagnosis may mask symptoms of a serious condition that requires different treatment.\n\n5. **Side Effects**: Antibiotics can cause side effects and interact with other medications you may be taking.\n\nAlways consult a healthcare provider before taking any medication.',
    factCheck: {
      claim: 'It is safe to take leftover antibiotics at home',
      status: 'FALSE',
      explanation:
        'Self-prescribing leftover antibiotics is not recommended by medical professionals. It can lead to antibiotic resistance, inappropriate treatment, and potential health risks.',
      evidenceLevel: 'High',
      sources: [
        { name: 'World Health Organization', url: 'https://www.who.int' },
        { name: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov' },
      ],
    },
    safetyLevel: 'warning',
  },
};

const defaultMockResponse = {
  message:
    'Thank you for your healthcare question. Based on available medical information, I can provide general educational guidance on this topic.\n\nPlease note that for specific medical concerns, it\'s always best to consult with a qualified healthcare professional who can evaluate your individual situation.',
  factCheck: {
    claim: 'General health inquiry',
    status: 'UNVERIFIED',
    explanation:
      'This query relates to a general health topic. A comprehensive fact-check would require specific claims to verify against medical literature.',
    evidenceLevel: 'Moderate',
    sources: [
      { name: 'National Institutes of Health', url: 'https://www.nih.gov' },
      { name: 'World Health Organization', url: 'https://www.who.int' },
    ],
  },
  safetyLevel: 'standard',
};

const nonHealthcareKeywords = [
  'weather', 'sports', 'football', 'cricket', 'movie', 'cinema', 'python', 'programming', 'code', 'president', 'currency', 'crypto', 'stock'
];

function normalizeQuery(text) {
  if (!text) return '';
  let cleaned = text.toLowerCase().trim();
  // Strip leading list numbering or bullet prefix like "1.", "2)", "[1]"
  cleaned = cleaned.replace(/^\s*([#\[\(]?\d+[\.\)]?|[a-z][\.\)])\s*/, '');
  // Replace punctuation with spaces for clean token matching
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

// Generate AI response based on query
function generateAiResponse(userMessage) {
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

  // 3. Antibiotics sample match on full untruncated input
  if (normMessage.includes('antibiotic') || normMessage.includes('antibiotics')) {
    return mockResponses['antibiotic'];
  }

  // 4. Fever & Symptom Medication request check
  if (
    (normMessage.includes('fever') && (normMessage.includes('tablet') || normMessage.includes('medicine') || normMessage.includes('pill') || normMessage.includes('consider') || normMessage.includes('take'))) ||
    normMessage.includes('what tablet') || normMessage.includes('which medicine') || normMessage.includes('medicine for') || normMessage.includes('tablet for')
  ) {
    return {
      message: 'I cannot prescribe, select, or recommend specific medications or tablets for fever or symptoms. Fever is an immune response that can arise from viral or bacterial causes. Before taking any fever reducer or medication, you should consult a licensed pharmacist or physician who can evaluate your health history, symptoms, and safe dosages.',
      factCheck: {
        claim: `Medication selection for symptoms (${userMessage.slice(0, 45)})`,
        status: 'UNVERIFIED',
        explanation: `Specific drug recommendations for '${userMessage.slice(0, 40)}' fall outside verified self-treatment guidance. Medication selection requires a direct clinical evaluation.`,
        evidenceLevel: 'High',
        sources: [
          { name: 'Mayo Clinic - Fever Guidance', url: 'https://www.mayoclinic.org/diseases-conditions/fever' },
          { name: 'World Health Organization', url: 'https://www.who.int' },
        ],
      },
      safetyLevel: 'warning',
    };
  }

  // 5. Sample question matching against full untruncated message
  for (const [key, value] of Object.entries(mockResponses)) {
    if (normMessage.includes(key) || lowerMessage.includes(key) || key.includes(normMessage)) {
      return value;
    }
  }

  // 6. Query-specific default fallback
  return {
    message: `Thank you for your healthcare inquiry regarding '${userMessage.slice(0, 55)}'. Based on evidence-based medical principles, symptom management and drug selection require an individualized clinical evaluation. Always consult a physician or licensed pharmacist for specific healthcare advice.`,
    factCheck: {
      claim: userMessage.slice(0, 45),
      status: 'UNVERIFIED',
      explanation: `No verified medical evidence match found in the trusted knowledge base for query: '${userMessage.slice(0, 45)}'.`,
      evidenceLevel: 'Moderate',
      sources: [
        { name: 'National Institutes of Health', url: 'https://www.nih.gov' },
        { name: 'World Health Organization', url: 'https://www.who.int' },
      ],
    },
    safetyLevel: 'standard',
  };
}

/**
 * Get current user from Supabase session
 */
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get active session token
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Send a message to the AI assistant (calls Python FastAPI backend)
 */
export async function sendMessage(messageText, conversationId = null) {
  try {
    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Send request to FastAPI backend
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

      // Map evidence level format
      let evLevel = data.fact_check?.evidence_level || 'High';
      if (evLevel === 'HIGH') evLevel = 'High';
      if (evLevel === 'MEDIUM') evLevel = 'Moderate';
      if (evLevel === 'LOW') evLevel = 'Low';

      // Map safety level format
      const safetyNoticeLevel = data.safety_notice?.level;
      const isEmergencyOrHigh = safetyNoticeLevel === 'EMERGENCY' || safetyNoticeLevel === 'HIGH';
      const mappedSafetyLevel = isEmergencyOrHigh ? 'warning' : 'standard';

      // Combine sources
      const sourcesList = (data.sources || []).map((s) => ({
        name: s.name,
        url: s.url,
      }));

      const mappedFactCheck = {
        claim: data.fact_check?.claim || messageText.slice(0, 40),
        status: data.fact_check?.status || 'UNVERIFIED',
        explanation: data.fact_check?.explanation || '',
        evidenceLevel: evLevel,
        sources: sourcesList.length > 0 ? sourcesList : [
          { name: 'World Health Organization', url: 'https://www.who.int' },
          { name: 'Centers for Disease Control and Prevention', url: 'https://www.cdc.gov' },
        ],
      };

      return {
        id: crypto.randomUUID(),
        chatId: data.conversation_id || conversationId,
        message: data.answer || 'Thank you for your healthcare question. Here is verified medical guidance.',
        factCheck: mappedFactCheck,
        safetyLevel: mappedSafetyLevel,
        timestamp: new Date().toISOString(),
        disclaimer: data.disclaimer || 'This information is for educational purposes only and should not be considered medical advice.',
      };
    }
  } catch (err) {
    console.warn('Backend API call failed or offline, falling back to direct Supabase / mock mode:', err?.message || err);
  }

  // ─── Fallback if backend API is offline ───
  await randomDelay();
  const user = await getCurrentUser();
  let activeConvId = conversationId;
  const aiResponse = generateAiResponse(messageText);

  // If user asked about heart/chest pain or severe emergency, trigger warning
  const lowerMsg = messageText.toLowerCase();
  if (lowerMsg.includes('chest pain') || lowerMsg.includes('heart pain') || lowerMsg.includes('breath') || lowerMsg.includes('emergency')) {
    aiResponse.safetyLevel = 'warning';
  }

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
          safety_level: aiResponse.safetyLevel,
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
        safetyLevel: aiResponse.safetyLevel,
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
    safetyLevel: aiResponse.safetyLevel,
    timestamp: new Date().toISOString(),
    disclaimer: 'This information is for educational purposes only.',
  };
}

/**
 * Get all conversations for the logged in user from Supabase
 */
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

/**
 * Get all messages for a specific conversation from Supabase
 */
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

/**
 * Create a new conversation session in Supabase
 */
export async function createNewChat(title = 'New Conversation') {
  const user = await getCurrentUser();
  if (!user) {
    return {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation in Supabase:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete a specific conversation session from Supabase
 */
export async function deleteChat(conversationId) {
  const user = await getCurrentUser();
  if (!user || !conversationId) return { success: false };

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting conversation in Supabase:', error);
    return { success: false };
  }

  return { success: true };
}

/**
 * Clear all chat history for the logged in user in Supabase
 */
export async function clearAllChatHistory() {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error clearing chat history in Supabase:', error);
    return { success: false };
  }

  return { success: true };
}
