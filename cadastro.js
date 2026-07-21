/* SISLOG 3.0 — Chat de pré-cadastro de fornecedor
   Fluxo FIEL ao Bizagi "Cadastro de fornecedores".
   Cada nó: `bot` (bolhas) + `next` (auto) | `input` (aguarda resposta, route decide) | `end`.
   Nós finais podem ter `actions` (botões, ex.: retomar cadastro pendente).
   Ver docs/dados-teste-cadastro-fornecedor.md */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var log = document.getElementById('chatLog');
    if (!log) return;

    var form = document.getElementById('chatForm');
    var text = document.getElementById('chatText');
    var attach = document.getElementById('chatAttach');
    var quickSlot = document.getElementById('quickSlot');

    var PROC_OK = 'procuracao-valida.pdf';       // procuração válida (IA aprova)
    function isSim(v) { return /^sim$/i.test((v || '').trim()); }
    var AUTH = '🔐 Autenticação via ID Goiás.';

    // ================= Máquina de estados (Bizagi) =================
    var NODES = {
      // --- Início ---
      start: { bot: [
        { text: 'Olá! Bem-vindo ao cadastro de fornecedores do SISLOG. Vou te ajudar a realizar seu cadastro.' }
      ], next: 'novo_cadastro' },

      // Novo cadastro?
      novo_cadastro: { bot: [ { text: 'Este é um novo cadastro?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'is_socio' : 'solicita_doc'; } } },

      // Novo cadastro? Não -> Solicita CPF/CNPJ -> Recupera cadastro iniciado
      solicita_doc: { bot: [ { text: 'Informe seu CPF ou CNPJ para localizarmos o cadastro já iniciado.' } ],
        input: { type: 'text', placeholder: 'Digite o CPF ou CNPJ...', route: function () { return 'recupera'; } } },
      recupera: { bot: [ { text: 'Recuperando o cadastro iniciado...' } ], next: 'is_socio' },

      // É sócio?
      is_socio: { bot: [ { text: 'Você é sócio da empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'informar_documentos' : 'is_representante'; } } },

      // É sócio? Sim -> Informar documentos -> Segue cadastro e aprovação -> Cadastro realizado
      informar_documentos: { bot: [ { text: AUTH }, { text: 'Informe os documentos da empresa (CNPJ, CPF).' } ],
        input: { type: 'file', attachLabel: 'Documentos.pdf', placeholder: 'Anexe os documentos (📎) ou digite o nome do arquivo',
          route: function () { return 'segue_aprovacao'; } } },
      segue_aprovacao: { bot: [ { text: 'Seguindo com o cadastro e aprovação...' } ], next: 'fim_realizado' },
      fim_realizado: { bot: [ { text: '✅ Cadastro realizado com sucesso! Você já pode participar das licitações do Estado de Goiás.' } ], end: true },

      // É representante?
      is_representante: { bot: [ { text: 'Você é representante da empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'tem_procuracao' : 'recusa'; } } },

      // É representante? Não -> Recusa cadastro -> Encerra interação -> Cadastro não realizado
      recusa: { bot: [ { text: 'Recusando o cadastro.' }, { text: 'Encerrando a interação.' } ], next: 'fim_nao_realizado' },
      fim_nao_realizado: { bot: [ { text: '❌ Cadastro não realizado.' } ], end: true },

      // Tem procuração?
      tem_procuracao: { bot: [ { text: 'Você possui procuração que lhe dá poderes para representar a empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'upload_procuracao' : 'email_socio'; } } },

      // Tem procuração? Sim -> Upload -> IA avalia -> Procuração OK?
      upload_procuracao: { bot: [ { text: AUTH }, { text: 'Faça o upload da procuração.' } ],
        input: { type: 'file', attachLabel: PROC_OK, placeholder: 'Anexe a procuração (📎) ou digite o nome do arquivo',
          route: function (v) { return v.trim().toLowerCase() === PROC_OK ? 'ia_avalia_ok' : 'ia_avalia_nok'; } } },
      ia_avalia_ok: { bot: [ { text: 'IA avaliando a procuração...' }, { text: 'Procuração validada com sucesso.' } ], next: 'segue_cadastro' },
      ia_avalia_nok: { bot: [ { text: 'IA avaliando a procuração...' }, { text: 'Não foi possível validar a procuração automaticamente.' } ], next: 'cadfor' },
      segue_cadastro: { bot: [ { text: 'Seguindo com o cadastro...' } ], next: 'fim_completa' },
      fim_completa: { bot: [ { text: '✅ Cadastro completo! Sua documentação foi validada.' } ], end: true },
      cadfor: { bot: [ { text: 'Direcionando para o CADFOR Backoffice.' } ], next: 'fim_avaliacao' },
      fim_avaliacao: { bot: [ { text: '⚠️ Cadastro em avaliação. Sua procuração será analisada manualmente.' } ], end: true },

      // Tem procuração? Não -> Envia e-mail sócio -> Sócio acessa link -> Informa usuários -> Notificar -> Cadastro pendente
      email_socio: { bot: [ { text: 'Enviando e-mail para o sócio aprovar os usuários...' } ], next: 'socio_link' },
      socio_link: { bot: [ { text: AUTH }, { text: 'O sócio acessou o link do e-mail.' } ], next: 'informa_usuarios' },
      informa_usuarios: { bot: [ { text: 'O sócio informou os usuários autorizados.' } ], next: 'notificar_usuarios' },
      notificar_usuarios: { bot: [ { text: 'Notificando os usuários autorizados...' } ], next: 'fim_pendente' },
      fim_pendente: { bot: [ { text: '🟡 Cadastro pendente. Aguarda a aprovação do sócio para continuar.' } ],
        end: true, actions: [ { label: 'Retomar cadastro pendente', to: 'retomada_start' } ] },

      // ================= 2º fluxo: Retomada de cadastro pendente =================
      retomada_start: { bot: [ { text: '— Retomada de cadastro pendente —' }, { text: 'Acessando o cadastro do fornecedor.' } ], next: 'retomada_cnpj' },
      retomada_cnpj: { bot: [ { text: 'Informe o CNPJ.' } ],
        input: { type: 'text', placeholder: 'Digite o CNPJ...', route: function () { return 'retomada_identifica'; } } },
      retomada_identifica: { bot: [ { text: 'O sistema identificou que há um cadastro pendente para este CNPJ.' } ], next: 'retomada_consulta' },
      retomada_consulta: { bot: [ { text: 'Consultando se o usuário está autorizado...' } ], next: 'usuario_autorizado' },
      usuario_autorizado: { bot: [ { text: 'O usuário está autorizado a continuar o cadastro?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'permite_continuar' : 'interrompe'; } } },
      permite_continuar: { bot: [ { text: 'Permitindo continuar o cadastro da empresa...' } ], next: 'fim_realizado2' },
      fim_realizado2: { bot: [ { text: '✅ Cadastro realizado com sucesso!' } ], end: true },
      interrompe: { bot: [ { text: 'Interrompendo o cadastro.' } ], next: 'fim_nao_realizado2' },
      fim_nao_realizado2: { bot: [ { text: '❌ Cadastro não realizado.' } ], end: true }
    };

    // ================= Helpers de render =================
    function now() {
      var d = new Date(), h = d.getHours(), m = d.getMinutes();
      var ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
    }
    function scrollDown() { log.scrollTop = log.scrollHeight; }

    function bubblesHtml(bubbles) {
      return bubbles.map(function (b) {
        if (b.link) return '<a class="bubble link" href="' + (b.href || '#') + '">' + b.link + '</a>';
        if (b.file) return '<span class="bubble file"><i class="fa-regular fa-file-lines"></i>' + b.file + '</span>';
        return '<div class="bubble">' + b.text + '</div>';
      }).join('');
    }

    function renderTurn(who, bubbles) {
      var wrap = document.createElement('div');
      wrap.className = 'msg ' + who;
      var avatar = who === 'bot' ? '<div class="msg-avatar" aria-hidden="true"></div>' : '';
      wrap.innerHTML = avatar +
        '<div class="msg-body"><span class="msg-time">' + now() + '</span>' + bubblesHtml(bubbles) + '</div>';
      log.appendChild(wrap);
      scrollDown();
    }

    function showTyping() {
      var t = document.createElement('div');
      t.className = 'msg bot';
      t.innerHTML = '<div class="msg-avatar" aria-hidden="true"></div><div class="typing"><span></span><span></span><span></span></div>';
      log.appendChild(t);
      scrollDown();
      return t;
    }

    // ================= Controle de input =================
    function setInputMode(mode) { // 'text' | 'file' | 'off'
      form.classList.toggle('disabled', mode === 'off');
      text.disabled = (mode === 'off');
      attach.classList.toggle('pulse', mode === 'file');
    }
    function clearQuick() { quickSlot.innerHTML = ''; quickSlot.className = 'quick-replies-slot'; }

    function endActions(node) {
      clearQuick();
      (node.actions || []).forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'restart-btn';
        b.textContent = a.label;
        b.addEventListener('click', function () { clearQuick(); goTo(a.to); });
        quickSlot.appendChild(b);
      });
      var r = document.createElement('button');
      r.type = 'button';
      r.className = 'restart-btn ghost';
      r.textContent = 'Iniciar novo cadastro';
      r.addEventListener('click', restart);
      quickSlot.appendChild(r);
      quickSlot.className = 'quick-replies';
    }

    function restart() {
      clearQuick();
      log.innerHTML = '';
      pending = null;
      setInputMode('off');
      setTimeout(function () { goTo('start'); }, 300);
    }

    var pending = null;

    function waitFor(input) {
      pending = input;
      text.placeholder = input.placeholder || 'Type a message';
      setInputMode(input.type === 'file' ? 'file' : 'text');
      if (text.focus) text.focus();
      if (input.type === 'choice' && input.options) {
        input.options.forEach(function (o) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = o;
          b.addEventListener('click', function () { submitUser(o, false); });
          quickSlot.appendChild(b);
        });
        quickSlot.className = 'quick-replies';
      }
    }

    function submitUser(value, asFile) {
      if (!pending) return;
      var input = pending;
      pending = null;
      clearQuick();
      setInputMode('off');
      text.value = '';
      text.placeholder = 'Type a message';
      renderTurn('user', [ asFile ? { file: value } : { text: value } ]);
      var next = input.route ? input.route(value) : null;
      setTimeout(function () { if (next) goTo(next); }, 650);
    }

    // ================= Loop =================
    function goTo(id) {
      var node = NODES[id];
      if (!node) { setInputMode('off'); return; }
      var typing = showTyping();
      setTimeout(function () {
        typing.remove();
        renderTurn('bot', node.bot);
        if (node.end) { setInputMode('off'); endActions(node); return; }
        if (node.input) { waitFor(node.input); }
        else if (node.next) { setTimeout(function () { goTo(node.next); }, 650); }
      }, 850);
    }

    // ================= Eventos =================
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!pending) return;
      var v = text.value.trim();
      if (!v) return;
      submitUser(v, pending.type === 'file');
    });

    attach.addEventListener('click', function () {
      if (pending && pending.type === 'file') {
        submitUser(pending.attachLabel || 'documento.pdf', true);
      }
    });

    setInputMode('off');
    setTimeout(function () { goTo('start'); }, 500);
  });
})();
