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
    // Mensagem exibida nos pontos que exigem login no ID Goiás.
    // O nó 'auth' abre a tela do ID Goiás em nova aba e aguarda a autenticação.
    var AUTH_MSG = 'Para continuar precisamos que você realize o login com o ID Goiás...';

    // Dados capturados durante a conversa (nome, CPF, CNPJ) para o "servidor" (db.js).
    var session = {};
    var DB = window.SislogDB || null;

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

      // É sócio? Sim -> Informar CNPJ/dados -> Login ID Goiás -> Segue cadastro e aprovação -> Cadastro realizado
      informar_documentos: { bot: [ { text: 'Informe os documentos da empresa (CNPJ, CPF).' } ],
        input: { type: 'file', attachLabel: 'Documentos.pdf', placeholder: 'Anexe os documentos (📎) ou digite o nome do arquivo',
          route: function () { return 'auth_documentos'; } } },
      auth_documentos: { bot: [ { text: AUTH_MSG } ], auth: 'segue_aprovacao' },
      segue_aprovacao: { bot: [ { text: 'Seguindo com o cadastro e aprovação...' } ], next: 'fim_realizado' },
      fim_realizado: { bot: [
        { text: '✅ Cadastro realizado com sucesso! Você já pode participar das licitações do Estado de Goiás.' },
        { text: 'Agora você já pode cadastrar uma senha de acesso ao SISLOG.' }
      ], end: true, actions: [ { label: 'Cadastrar senha', href: 'cadastro-senha.html', newTab: true } ] },

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
          route: function (v) { return isSim(v) ? 'auth_procuracao' : 'solicita_nome'; } } },

      // Tem procuração? Sim -> Login ID Goiás -> Upload -> IA avalia -> Procuração OK?
      auth_procuracao: { bot: [ { text: AUTH_MSG } ], auth: 'upload_procuracao' },
      upload_procuracao: { bot: [ { text: 'Faça o upload da procuração.' } ],
        input: { type: 'file', attachLabel: PROC_OK, placeholder: 'Anexe a procuração (📎) ou digite o nome do arquivo',
          route: function (v) { return v.trim().toLowerCase() === PROC_OK ? 'ia_avalia_ok' : 'ia_avalia_nok'; } } },
      ia_avalia_ok: { bot: [ { text: 'IA avaliando a procuração...' }, { text: 'Procuração validada com sucesso.' } ], next: 'segue_cadastro' },
      ia_avalia_nok: { bot: [ { text: 'IA avaliando a procuração...' }, { text: 'Não foi possível validar a procuração automaticamente.' } ], next: 'cadfor' },
      segue_cadastro: { bot: [ { text: 'Seguindo com o cadastro...' } ], next: 'fim_completa' },
      fim_completa: { bot: [
        { text: '✅ Cadastro realizado com sucesso! Você já pode participar das licitações do Estado de Goiás.' },
        { text: 'Agora você já pode cadastrar uma senha de acesso ao SISLOG.' }
      ], end: true, actions: [ { label: 'Cadastrar senha', href: 'cadastro-senha.html', newTab: true } ] },
      cadfor: { bot: [ { text: 'Direcionando para o CADFOR Backoffice.' } ], next: 'fim_avaliacao' },
      fim_avaliacao: { bot: [ { text: '⚠️ Cadastro em avaliação. Sua procuração será analisada manualmente.' } ], end: true },

      // Tem procuração? Não -> coleta dados do representante -> cria solicitação no "servidor" (db)
      // -> e-mail (mascarado) ao sócio administrador -> Cadastro pendente
      solicita_nome: { bot: [ { text: 'Vamos registrar sua solicitação de acesso para o sócio administrador aprovar.' }, { text: 'Qual é o seu nome completo?' } ],
        input: { type: 'text', placeholder: 'Digite seu nome...', route: function (v) { session.nome = v; return 'solicita_cpf'; } } },
      solicita_cpf: { bot: [ { text: 'Informe o seu CPF.' } ],
        input: { type: 'text', placeholder: 'Digite seu CPF...', route: function (v) { session.cpf = v; return 'solicita_cnpj'; } } },
      solicita_cnpj: { bot: [ { text: 'Informe o CNPJ da empresa.' } ],
        input: { type: 'text', placeholder: 'Digite o CNPJ...', route: function (v) { session.cnpj = v; return 'cria_solicitacao'; } } },
      cria_solicitacao: {
        onEnter: function () { if (DB) session.req = DB.criarSolicitacaoRepresentante({ nome: session.nome, cpf: session.cpf, cnpj: session.cnpj }); },
        bot: function () {
          var req = session.req || {};
          var email = DB ? DB.maskEmail(req.email) : 's****@empresa.com.br';
          var cpf = DB ? DB.maskCpf(req.cpf || session.cpf) : (session.cpf || '');
          return [
            { text: 'Enviamos um e-mail ao sócio administrador (' + email + ') para aprovar o seu acesso.' },
            { text: 'Dados enviados para aprovação: ' + (req.nome || session.nome) + ' · CPF ' + cpf + ' · CNPJ ' + (req.cnpj || session.cnpj) + '.' }
          ];
        },
        next: 'fim_pendente'
      },
      fim_pendente: { bot: [
        { text: '🟡 Cadastro pendente. Aguarde a aprovação do sócio administrador.' },
        { text: 'Assim que ele aprovar, você receberá um e-mail para criar a sua senha de acesso.' }
      ], end: true, actions: [ { label: 'Já tenho aprovação — continuar', to: 'retomada_start' } ] },

      // ================= 2º fluxo: Continuar cadastro (checagem AUTOMÁTICA da aprovação) =================
      retomada_start: { bot: [ { text: 'Vamos continuar o seu cadastro.' }, { text: 'Informe o seu CPF.' } ],
        input: { type: 'text', placeholder: 'Digite seu CPF...', route: function (v) { session.cpf = v; return 'retomada_check'; } } },
      retomada_check: { bot: [ { text: 'Verificando se o sócio administrador já aprovou o seu acesso...' } ],
        decide: function () { return (DB && DB.estaAutorizado(session.cpf)) ? 'retomada_aprovado' : 'retomada_pendente'; } },
      retomada_aprovado: { bot: [
        { text: '✅ O sócio administrador já aprovou o seu acesso!' },
        { text: 'Agora você já pode cadastrar uma senha de acesso ao SISLOG.' }
      ], end: true, actions: [ { label: 'Cadastrar senha', href: 'cadastro-senha.html', newTab: true } ] },
      retomada_pendente: { bot: [
        { text: '🟡 Ainda não há aprovação do sócio administrador para o seu CPF.' },
        { text: 'Assim que ele aprovar, você receberá um e-mail para criar a sua senha.' }
      ], end: true }
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
        if (b.link) return '<a class="bubble link" href="' + (b.href || '#') + '"' + (b.newTab ? ' target="_blank" rel="noopener"' : '') + '>' + b.link + '</a>';
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
        if (a.href) {
          // Abre nova aba/tela sem sair do chat
          b.addEventListener('click', function () { window.open(a.href, a.newTab === false ? '_self' : '_blank'); });
        } else {
          b.addEventListener('click', function () { clearQuick(); goTo(a.to); });
        }
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

    // ================= Login ID Goiás (nova aba + espera) =================
    function openAuth(nextId) {
      setInputMode('off');
      clearQuick();
      var done = false;
      var chan = null;
      try { chan = new BroadcastChannel('idgoias-auth'); } catch (e) { chan = null; }

      function finish() {
        if (done) return;
        done = true;
        if (chan) { try { chan.close(); } catch (e) {} }
        clearQuick();
        setTimeout(function () { goTo(nextId); }, 400);
      }
      if (chan) { chan.onmessage = function (ev) { if (ev && ev.data === 'authenticated') finish(); }; }

      function openLogin() { return window.open('login-id-goias.html', 'idgoias_login'); }

      // Aguardando autenticação: botão para (re)abrir a tela do ID Goiás
      function showWaiting(blocked) {
        clearQuick();
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'restart-btn';
        b.textContent = blocked ? 'Abrir login do ID Goiás' : 'Reabrir login do ID Goiás';
        b.addEventListener('click', function () { openLogin(); });
        quickSlot.appendChild(b);
        quickSlot.className = 'quick-replies';
      }

      var win = openLogin();               // tenta abrir automaticamente
      showWaiting(!win);                   // se o pop-up foi bloqueado, oferece o botão
    }

    // ================= Loop =================
    function goTo(id) {
      var node = NODES[id];
      if (!node) { setInputMode('off'); return; }
      if (node.onEnter) { try { node.onEnter(); } catch (e) {} }   // efeitos (ex.: gravar no "servidor")
      var typing = showTyping();
      setTimeout(function () {
        typing.remove();
        var bubbles = (typeof node.bot === 'function') ? node.bot() : node.bot;
        renderTurn('bot', bubbles);
        if (node.end) { setInputMode('off'); endActions(node); return; }
        if (node.input) { waitFor(node.input); }
        else if (node.auth) { openAuth(node.auth); }
        else if (node.decide) { var nx = node.decide(); setTimeout(function () { if (nx) goTo(nx); }, 650); }
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
