# 📋 Contexto do Projeto - Bot de Treinos WhatsApp

## 🔴 REGRAS DE RESPOSTA (OBRIGATÓRIO)
1. **SEMPRE indicar caminho completo + nome do arquivo** (ex: `env.ts` em [`src/config`](src/config))
2. **Respostas curtas e diretas** - sem explicações desnecessárias
3. **Comandos exatos** - copiar e colar
4. **Um passo de cada vez** quando possível

---

## Stack Definida

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **ORM:** Drizzle ORM + drizzle-kit
- **Banco de Dados:** PostgreSQL (Neon - produção gratuita)
- **Mensageria:** Twilio WhatsApp Sandbox (gratuito)
- **Validação:** Zod
- **Deploy:** Render (free tier)
- **Variáveis:** dotenv

### IA/LLM (NOVO)
- **Provedor:** OpenRouter (https://openrouter.ai)
  - **Modelo recomendado:** `meta-llama/llama-3.2-3b-instruct:free` (100% gratuito, sem rate limit)
  - **Alternativas gratuitas:**
    - `google/gemini-flash-1.5-8b` (gratuito)
    - `mistralai/mistral-7b-instruct:free`
- **Cliente HTTP:** `@ai-sdk/openai` (compatível com OpenRouter)
- **Propósito:**
  - Interpretar mensagens de treino em linguagem natural
  - Extrair exercícios, séries, reps e carga
  - Responder comandos como `/ultimo`, `/historico`
  - Validar e sugerir correções

---

## Estrutura de Pastas

```
c:\Git\TREINO\
├── .context/
│   └── PROJECT_CONTEXT.md    # Este arquivo
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Fastify setup
│   ├── config/
│   │   └── env.ts            # Variáveis de ambiente com Zod
│   ├── db/
│   │   ├── index.ts          # Conexão Drizzle
│   │   ├── migrate.ts        # Script de migrations
│   │   ├── schema/           # Schemas das tabelas
│   │   │   ├── index.ts
│   │   │   ├── users.ts
│   │   │   ├── messages.ts
│   │   │   ├── workouts.ts
│   │   │   └── sets.ts
│   │   └── migrations/       # SQL gerado
│   ├── routes/
│   │   ├── health.ts         # GET /health
│   │   └── webhook.ts        # POST /webhook/twilio
│   ├── services/
│   │   ├── ai.ts             # Cliente OpenRouter (NOVO)
│   │   ├── parser.ts         # Parser de treinos com IA (NOVO)
│   │   └── commands.ts       # Handlers de comandos
│   └── utils/
│       └── logger.ts         # Logger básico (opcional)
├── drizzle.config.ts         # Config drizzle-kit
├── .env.example
├── .env                      # Ignorado no git
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Variáveis de Ambiente

```env
# App
NODE_ENV=development|production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenRouter (NOVO)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
```

---

## Fluxo de Funcionamento (ATUALIZADO)

### 1. Recepção de Mensagem
WhatsApp → Twilio Sandbox → Render (`/webhook/twilio`)

### 2. Processamento com IA
- **Mensagem de treino:**
  ```
  "Fiz supino 3x10 com 60kg e agachamento 4x8 com 80kg"
  ```
  - IA extrai: `[{exercise: "supino", sets: 3, reps: 10, weight: 60}, ...]`
  - Salva em `workouts` + `sets`
  - Responde: "✅ Treino registrado! 2 exercícios salvos."

- **Comando `/ultimo`:**
  - Busca último treino no banco
  - IA formata resposta amigável
  - Responde: "🏋️ Último treino (05/01):\n• Supino: 3x10 60kg\n• Agachamento: 4x8 80kg"

- **Comando `/historico supino`:**
  - Busca últimas 5 entradas do exercício
  - IA analisa evolução (aumento de carga, etc)
  - Responde com gráfico textual

### 3. Resposta
Bot → Twilio → WhatsApp

---

## Tabelas do Banco

1. **users** - Usuários por telefone
2. **messages** - Log completo (raw payload)
3. **workouts** - Sessões de treino (data)
4. **sets** - Séries de exercícios (normalizado)

---

## Formato Aceito (Flexível com IA)

### Antes (rígido):
```
Supino: 3x10 60kg
```

### Agora (natural):
```
"Hoje fiz supino 3 séries de 10 reps com 60kg"
"Supino 3x10 60kg, agachamento 4x8 80"
"3x10 supino raso 60kg"
```

IA normaliza tudo para o schema `sets`.

---

## Status do Desenvolvimento

- [x] Fase 1: Bootstrap do Projeto ✅
- [x] Fase 2: Deploy Inicial (Render) ✅
- [x] Fase 3: PostgreSQL (Neon) ✅
- [x] Fase 4: Drizzle + Migrations ✅
- [x] Fase 5: Webhook Twilio ✅
- [ ] Fase 6: Integração OpenRouter (IA) ⬅️ PRÓXIMA
- [ ] Fase 7: Parser com IA
- [ ] Fase 8: Comandos com IA
- [ ] Fase 9: Configurar Twilio Sandbox
- [ ] Fase 10: Testes Ponta a Ponta
- [ ] Fase 11: Hardening
- [ ] Fase 12: Documentação Final

---

## Por que OpenRouter?

- ✅ **Gratuito:** Modelo `llama-3.2-3b-instruct:free` sem custo
- ✅ **Sem rate limit:** Uso pessoal ilimitado
- ✅ **API compatível:** Usa formato OpenAI
- ✅ **Múltiplos modelos:** Fácil trocar se precisar
- ✅ **Sem cartão:** Apenas email para criar conta

**Alternativa caso OpenRouter mude:** Google AI Studio (Gemini Flash gratuito) ou Groq (Llama 3 gratuito).

---

## URLs de Produção

- **App:** https://treino-bot.onrender.com
- **Webhook:** https://treino-bot.onrender.com/webhook/twilio
- **Health:** https://treino-bot.onrender.com/health