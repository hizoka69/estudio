// api/evaluar.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { evaluaciones } = req.body;
    const apiKey = process.env.GROQ_API_KEY; // ¡Vercel inyectará tu llave secreta aquí!

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key no configurada en el servidor.' });
    }

    try {
        // Evaluamos todas las cartas en paralelo usando la API de Groq
        const resultados = await Promise.all(evaluaciones.map(async (item) => {
            const prompt = `Eres un profesor evaluando una tarjeta de estudio.
Pregunta: "${item.pregunta}"
Respuesta Correcta Esperada: "${item.esperada}"
Lo que respondió el alumno: "${item.usuario}"

¿Es la respuesta del alumno correcta en concepto y significado? (Ignora faltas de ortografía, que use otras palabras o sea más resumido, siempre y cuando la idea central sea correcta).
Responde ÚNICAMENTE con la palabra "SI" o "NO". No agregues ningún otro carácter.`;

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0
                })
            });

            const data = await groqRes.json();
            if (data.error) throw new Error(data.error.message);

            const iaRespuesta = data.choices[0].message.content.trim().toUpperCase();
            return {
                carta: item.cartaOriginal, // Devolvemos la carta para que el front sepa cuál es
                esCorrecta: iaRespuesta.includes("SI"),
                error: null
            };
        }));

        return res.status(200).json({ resultados });

    } catch (error) {
        console.error("Error en servidor:", error);
        return res.status(500).json({ error: error.message });
    }
}