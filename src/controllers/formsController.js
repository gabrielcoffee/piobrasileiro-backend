import pool from "../db.js";

// Ingestão pública do Google Forms "Cadastro para hospedagem".
// Apps Script (onFormSubmit) envia { fields: { "<título da pergunta>": { value }, ... } }
// + a chave "email" (e-mail do respondente). Protegido por formsSecretMiddleware.
//
// Exemplo do payload esperado:
//   { fields: {
//       "Nome completo da pessoa que fez a solicitação da hospedagem": { value: "Ana" },
//       "Nome completo e idade do(s) hóspede(s)": { value: "Ana, 30\nLuís, 5" },
//       "Data de entrada no colégio": { value: "2026-06-02" },
//       "Data de saída do colégio": { value: "2026-06-07" },
//       "Horário previsto de chegada ao colégio": { value: "14:30" },
//       "Entre os hóspedes existe alguma restrição alimentar e/ou comorbidade? Se sim, quais?": { value: "Nenhuma" },
//       "Quais opções de refeições você(s) prefere(m)?": { value: "Café da manhã + almoço" },
//       "Qual forma de pagamento prefere?": { value: "Dinheiro em espécie" },
//       "Alguma observação que gostaria de acrescentar?": { value: "" },
//       "email": { value: "ana@example.com" }
//   } }

const Q = {
    nome_solicitante: "Nome completo da pessoa que fez a solicitação da hospedagem",
    hospedes:         "Nome completo e idade do(s) hóspede(s)",
    data_entrada:     "Data de entrada no colégio",
    data_saida:       "Data de saída do colégio",
    horario_chegada:  "Horário previsto de chegada ao colégio",
    restricao:        "Entre os hóspedes existe alguma restrição alimentar e/ou comorbidade? Se sim, quais?",
    refeicoes:        "Quais opções de refeições você(s) prefere(m)?",
    pagamento:        "Qual forma de pagamento prefere?",
    observacao:       "Alguma observação que gostaria de acrescentar?",
    email:            "email",
};

const REFEICOES_MAP = {
    'Apenas café da manhã':            'apenas_cafe',
    'Café da manhã + almoço':          'cafe_almoco',
    'Café da manhã + jantar':          'cafe_janta',
    'Café da manhã + almoço + jantar': 'cafe_almoco_janta',
    'Irei decidir depois':             'decidir_depois',
};

const PAGAMENTO_MAP = {
    'Transferência via app Wise': 'wise',
    'Dinheiro em espécie':        'dinheiro',
};

// "João Paulo II, 44\nMaria, 75" -> [{nome:"João Paulo II", idade:44}, {nome:"Maria", idade:75}]
function parseHospedes(raw) {
    if (!raw) return [];
    return String(raw)
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => {
            const i = line.lastIndexOf(',');
            if (i === -1) {
                return { nome: line.slice(0, 100), idade: null };
            }
            const nome = line.slice(0, i).trim().slice(0, 100);
            const idadeNum = parseInt(line.slice(i + 1).trim(), 10);
            return { nome, idade: Number.isInteger(idadeNum) ? idadeNum : null };
        })
        .filter(h => h.nome);
}

export async function createPreReserva(req, res) {

    const fields = req.body?.fields;
    if (!fields || typeof fields !== 'object') {
        return res.status(400).json({ message: 'Missing fields' });
    }

    const val = (key) => {
        const f = fields[key];
        return f && typeof f === 'object' ? f.value : f;
    };

    const nome_solicitante = String(val(Q.nome_solicitante) ?? '').trim();
    const hospedes_raw     = String(val(Q.hospedes) ?? '').trim();
    const data_entrada     = String(val(Q.data_entrada) ?? '').trim();
    const data_saida       = String(val(Q.data_saida) ?? '').trim();
    const horario_chegada  = String(val(Q.horario_chegada) ?? '').trim() || null;
    const restricao        = String(val(Q.restricao) ?? '').trim() || null;
    const refeicoesLabel   = String(val(Q.refeicoes) ?? '').trim();
    const pagamentoLabel   = String(val(Q.pagamento) ?? '').trim();
    const observacao       = String(val(Q.observacao) ?? '').trim() || null;
    const email            = String(val(Q.email) ?? '').trim();

    // --- Validação server-side (Forms não trava de verdade) ---
    if (!nome_solicitante || !hospedes_raw || !data_entrada || !data_saida || !email) {
        return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }
    if (!email.includes('@') || email.length > 320) {
        return res.status(400).json({ message: 'Email inválido' });
    }
    if (nome_solicitante.length > 100) {
        return res.status(400).json({ message: 'Nome muito longo' });
    }
    if (data_entrada > data_saida) {
        return res.status(400).json({ message: 'Data de entrada deve ser antes da saída' });
    }
    if (hospedes_raw.length > 5000 ||
        (restricao && restricao.length > 2000) ||
        (observacao && observacao.length > 2000)) {
        return res.status(400).json({ message: 'Campo de texto muito longo' });
    }

    const refeicoes = REFEICOES_MAP[refeicoesLabel];
    const forma_pagamento = PAGAMENTO_MAP[pagamentoLabel];
    if (!refeicoes) {
        return res.status(400).json({ message: 'Opção de refeição inválida' });
    }
    if (!forma_pagamento) {
        return res.status(400).json({ message: 'Forma de pagamento inválida' });
    }

    const hospedes = parseHospedes(hospedes_raw);
    if (hospedes.length === 0) {
        return res.status(400).json({ message: 'Nenhum hóspede informado' });
    }

    try {
        // Vincula à solicitação do site mais recente com o mesmo e-mail (nullable).
        const match = await pool.query(
            `SELECT id FROM solicitacao
             WHERE lower(trim(email)) = lower(trim($1))
             ORDER BY criado_em DESC LIMIT 1`,
            [email]
        );
        const solicitacao_id = match.rows[0]?.id ?? null;

        const result = await pool.query(
            `INSERT INTO pre_reserva
                (solicitacao_id, email, nome_solicitante, data_entrada, data_saida,
                 horario_chegada, restricao_alimentar, refeicoes, forma_pagamento,
                 observacao, hospedes, hospedes_raw)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING id`,
            [solicitacao_id, email, nome_solicitante, data_entrada, data_saida,
             horario_chegada, restricao, refeicoes, forma_pagamento,
             observacao, JSON.stringify(hospedes), hospedes_raw]
        );

        console.log('pre_reserva criada:', result.rows[0].id, 'solicitacao:', solicitacao_id);
        return res.status(200).json({ message: 'Pré-reserva criada', id: result.rows[0].id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Falha ao criar pré-reserva' });
    }
}
