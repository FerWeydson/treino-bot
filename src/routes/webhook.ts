import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users, messages } from '../db/schema';
import { eq } from 'drizzle-orm';
import { processMessage } from '../services/command';

const twilioSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  ProfileName: z.string().optional(),
});

export async function webhookRoutes(server: FastifyInstance) {
  server.post('/webhook/twilio', async (request, reply) => {
    const result = twilioSchema.safeParse(request.body);
    
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    const payload = result.data;

    // Verificar duplicata
    const existing = await db
      .select()
      .from(messages)
      .where(eq(messages.messageSid, payload.MessageSid))
      .limit(1);

    if (existing.length > 0) {
      reply.header('Content-Type', 'text/xml');
      return reply.send('<?xml version="1.0"?><Response></Response>');
    }

    // Buscar ou criar usuário
    let user = await db
      .select()
      .from(users)
      .where(eq(users.phone, payload.From))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          phone: payload.From,
          name: payload.ProfileName || 'Unknown',
        })
        .returning();
    }

    // Salvar mensagem
    await db.insert(messages).values({
      userId: user.id,
      messageSid: payload.MessageSid,
      from: payload.From,
      to: payload.To,
      body: payload.Body,
      rawPayload: payload,
    });

    // Processar com IA e comandos
    const commandResult = await processMessage(user.id, payload.Body);

    // Responder com TwiML
    reply.header('Content-Type', 'text/xml');
    const twiml = `<?xml version="1.0"?><Response><Message>${escapeXml(commandResult.response)}</Message></Response>`;
    return reply.send(twiml);
  });
}

function escapeXml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}