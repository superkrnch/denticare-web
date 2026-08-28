const { VertexAI } = require('@google-cloud/vertexai')

const SYSTEM_INSTRUCTION = `You are DentiCare AI, an assistant inside a dental clinic management system.
Provide helpful, simple, professional information about dental care. Do not diagnose diseases,
prescribe medication, or make definitive conclusions from symptoms or X-rays. Do not replace a
licensed dentist. When someone describes severe symptoms or a possible emergency, advise them to
seek professional dental or medical care. Never invent patient records, appointments, treatments,
or medical information.

Language: You understand English, Tagalog (Filipino), and Taglish. Reply in the same language
the user uses. If they write in Tagalog, respond in Tagalog. If they mix English and Tagalog,
you may reply naturally in Taglish. Keep explanations clear and easy to understand.`

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'denticare-app'
const LOCATION = 'us-central1'
const MODEL = 'gemini-2.5-flash'

let generativeModel = null

function getGenerativeModel() {
  if (!generativeModel) {
    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION })
    generativeModel = vertexAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    })
  }
  return generativeModel
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'model') && Array.isArray(item.parts))
    .slice(-20)
    .map((item) => ({
      role: item.role,
      parts: item.parts
        .filter((part) => part && typeof part.text === 'string' && part.text.trim())
        .map((part) => ({ text: part.text.trim().slice(0, 12000) })),
    }))
    .filter((item) => item.parts.length > 0)
}

async function generateChatReply(message, history) {
  const text = String(message || '').trim()
  if (!text) throw new Error('Message is required.')
  if (text.length > 12000) throw new Error('Message is too long.')

  const model = getGenerativeModel()
  const chat = model.startChat({ history: sanitizeHistory(history) })
  const result = await chat.sendMessage(text)
  const reply = result?.response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('')

  return reply || 'I could not generate a response. Please try again.'
}

module.exports = { generateChatReply }
