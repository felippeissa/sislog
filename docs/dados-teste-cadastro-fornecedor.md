# Dados de Teste — Cadastro de Fornecedor

Guia para o **tester** validar os fluxos do chat de cadastro de fornecedor.
O chat segue **exatamente o fluxo do Bizagi** ("Cadastro de fornecedores").

> As decisões (**Novo cadastro? / É sócio? / É representante? / Tem procuração? / Usuário autorizado?**) são respondidas com os botões **Sim / Não** (ou digitando).
> Os campos de dado (CPF/CNPJ) aceitam **qualquer valor** — não bloqueiam o fluxo.
> A **procuração** é a única validação automática: o nome do arquivo decide se a "IA" aprova.

---

## 1. Dado que importa (único gate automático)

| Campo | Valor para APROVAR | Qualquer outro valor |
|-------|--------------------|----------------------|
| **Procuração** (upload) | `procuracao-valida.pdf` (é o que o 📎 anexa) | vai para CADFOR → *Cadastro em avaliação* |

Para anexar a procuração **inválida**, **digite** um nome diferente no campo (ex.: `procuracao-errada.pdf`) e envie.

---

## 2. Como chegar em cada RESULTADO

### ✅ Cadastro realizado (sócio)
`Novo cadastro?` **Sim** → `É sócio?` **Sim** → anexar documentos (📎) → **Cadastro realizado**

### ✅ Cadastro completo (representante com procuração válida)
`Novo cadastro?` **Sim** → `É sócio?` **Não** → `É representante?` **Sim** → `Tem procuração?` **Sim** → anexar `procuracao-valida.pdf` (📎) → **Cadastro completo**

### ⚠️ Cadastro em avaliação (procuração inválida)
… `Tem procuração?` **Sim** → digitar `procuracao-errada.pdf` → **Cadastro em avaliação** (CADFOR Backoffice)

### 🟡 Cadastro pendente (representante sem procuração)
… `É representante?` **Sim** → `Tem procuração?` **Não** → (e-mail ao sócio → aprova usuários) → **Cadastro pendente**
→ botão **"Retomar cadastro pendente"** leva ao 2º fluxo.

### ❌ Cadastro não realizado (recusa)
`É sócio?` **Não** → `É representante?` **Não** → **Cadastro não realizado**

### 🔁 Recuperar cadastro iniciado
`Novo cadastro?` **Não** → informar CPF/CNPJ → recupera cadastro → volta para `É sócio?`

---

## 3. 2º fluxo — Retomada de cadastro pendente

A partir de **Cadastro pendente**, clique em **"Retomar cadastro pendente"**:

Informar CNPJ → sistema identifica cadastro pendente → `Usuário autorizado?`
- **Sim** → **Cadastro realizado**
- **Não** → **Cadastro não realizado**

---

## 4. Estados finais (iguais ao Bizagi)

| Ícone | Estado | Fluxo |
|-------|--------|-------|
| ✅ | Cadastro realizado | Sócio · ou retomada autorizada |
| ✅ | Cadastro completo | Representante + procuração válida |
| ⚠️ | Cadastro em avaliação | Representante + procuração inválida |
| 🟡 | Cadastro pendente | Representante sem procuração |
| ❌ | Cadastro não realizado | Recusa · ou retomada não autorizada |

---

## 5. Observações para o tester

- **Botões Sim/Não** aparecem acima do campo de texto em cada decisão (também dá para digitar).
- **Upload simulado:** clicar no 📎 anexa o documento esperado. Para testar procuração inválida, **digite** outro nome.
- **Nunca trava:** em qualquer resultado final há o botão **"Iniciar novo cadastro"** (e, no pendente, **"Retomar cadastro pendente"**).
- **Recomeçar do zero:** recarregar a página (F5).
