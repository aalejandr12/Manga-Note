const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY_1 || 'AIzaSyCBoKH7zlV0xXjTj2qzTQ-M_67b8dGhXzE';
const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'models/gemini-pro',
  'models/gemini-1.5-pro',
  'models/gemini-1.5-flash'
];

async function testModels() {
  console.log('🧪 Probando modelos de Gemini...\n');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Probando: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Di "hola" en una palabra');
      const response = await result.response;
      console.log(`✅ ${modelName} FUNCIONA`);
      console.log(`   Respuesta: ${response.text()}\n`);
    } catch (error) {
      console.log(`❌ ${modelName} FALLA: ${error.message}\n`);
    }
  }
}

testModels();
