# 📋 Contexto do Projeto - Bot de Treinos WhatsApp

## 🔴 REGRAS DE RESPOSTA (OBRIGATÓRIO)
1. **SEMPRE indicar caminho completo do arquivo** (ex: `c:\Git\TREINO\src\config\env.ts`)
2. **Respostas curtas e diretas** - sem explicações desnecessárias
3. **Comandos exatos** - copiar e colar
4. **Um passo de cada vez** quando possível

## Stack Definida
- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **ORM:** Drizzle ORM + drizzle-kit
- **Banco de Dados:** PostgreSQL (Neon - produção) / Docker (dev local)
- **Mensageria:** Twilio WhatsApp Sandbox
- **Validação:** Zod
- **Deploy:** Render (free tier)
- **Variáveis:** dotenv

## Estrutura de Pastas
```
c:\Git\TREINO\
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Fastify setup
│   ├── config/
│   │   └── env.ts            # Variáveis de ambiente com Zod
│   ├── db/
│   │   ├── index.ts          # Conexão Drizzle
│   │   ├── schema/           # Schemas das tabelas
│   │   └── migrations/       # Migrations geradas
│   ├── routes/
│   │   ├── health.ts         # GET /health
│   │   └── webhook.ts        # POST /webhook/twilio
│   ├── services/
│   │   ├── twilio.ts         # Cliente Twilio
│   │   ├── parser.ts         # Parser de treinos
│   │   └── commands.ts       # Handlers de comandos
│   └── utils/
│       └── logger.ts         # Logger básico
├── drizzle.config.ts         # Config drizzle-kit
├── docker-compose.yml        # Apenas para dev local
├── .env.example
├── .env                      # Ignorado no git
├── package.json
├── tsconfig.json
└── README.md
```

## Variáveis de Ambiente
```env
NODE_ENV=development|production
PORT=3000
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Status do Desenvolvimento
- [ ] Fase 1: Bootstrap do Projeto ✅
- [ ] Fase 2: Deploy Inicial (Render) ⬅️ ATUAL
- [ ] Fase 3: PostgreSQL (Neon)
- [ ] Fase 4: Drizzle + Migrations
- [ ] Fase 5: Webhook Twilio
- [ ] Fase 6: Integração Twilio Sandbox
- [ ] Fase 7: Configuração Webhook Produção
- [ ] Fase 8: Parser de Treinos
- [ ] Fase 9: Comandos do Bot
- [ ] Fase 10: Hardening
- [ ] Fase 11: Docker Dev (opcional)
- [ ] Fase 12: Documentação Final