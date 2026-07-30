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
    var AUTH_MSG = 'Para prosseguir com o cadastro, faça login utilizando sua conta do ID Goiás.';

    // Dados capturados durante a conversa (nome, CPF, CNPJ) para o "servidor" (db.js).
    var session = {};
    var DB = window.SislogDB || null;

    // ================= Máquina de estados (Bizagi) =================
    var NODES = {
      // --- Início ---
      start: { bot: [
        { text: 'Olá! Seja bem-vindo ao Cadastro de Fornecedores do SISLOG. Vou auxiliar você durante todo o processo de cadastro.' }
      ], next: 'novo_cadastro' },

      // Novo cadastro?
      novo_cadastro: { bot: [ { text: 'Você deseja realizar um novo cadastro de fornecedor?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'is_socio' : 'recupera_cnpj'; } } },

      // Novo cadastro? Não -> pede o CNPJ primeiro
      recupera_cnpj: { bot: [ { text: 'Sem problemas! Para localizarmos seu cadastro, informe o CNPJ da empresa.' } ],
        input: { type: 'text', mask: 'cnpj', placeholder: 'Informe o CNPJ (00.000.000/0000-00)...',
          validate: function (v) { return DB ? DB.cnpjFormatoValido(v) : true; },
          erro: 'CNPJ inválido. Informe no formato 00.000.000/0000-00 (14 dígitos).',
          route: function (v) { session.cnpj = v; return 'recupera_valida_cnpj'; } } },
      recupera_valida_cnpj: { bot: [ { text: 'Localizando a empresa...' } ],
        decide: function () { return (DB && DB.empresaCadastradaPorCnpj(session.cnpj)) ? 'recupera_empresa_ok' : 'recupera_empresa_nova'; } },
      // CNPJ não está no cache -> segue para o fluxo padrão de novo cadastro
      recupera_empresa_nova: { bot: [
        { text: 'Não localizamos um cadastro para este CNPJ.' },
        { text: 'Vamos iniciar o cadastro da empresa.' }
      ], next: 'is_socio' },
      // CNPJ confere com o cache -> empresa cadastrada, pede o CPF
      recupera_empresa_ok: {
        bot: function () {
          var e = DB ? DB.getEmpresa() : null;
          return [
            { text: '✅ A empresa ' + (e ? '<strong>' + e.razaoSocial + '</strong> ' : '') + 'está cadastrada.' },
            { text: 'Agora informe o seu CPF para localizarmos o seu cadastro.' }
          ];
        },
        input: { type: 'text', mask: 'cpf', placeholder: 'Informe o CPF (000.000.000-00)...',
          validate: function (v) { return DB ? DB.cpfFormatoValido(v) : true; },
          erro: 'CPF inválido. Informe no formato 000.000.000-00 (11 dígitos).',
          route: function (v) { session.cpf = v; return 'recupera_status'; } } },
      recupera_status: { bot: [ { text: 'Localizando o seu cadastro...' } ],
        decide: function () {
          var r = DB ? DB.situacaoCadastroPorCpf(session.cpf) : { fonte: 'nenhum' };
          if (r.fonte === 'cadfor') {
            if (r.status === 'aprovado') return 'rec_cadfor_aceito';
            if (r.status === 'rejeitado') return 'rec_cadfor_recusado';
            return 'rec_cadfor_pendente';
          }
          if (r.fonte === 'painel') {
            if (r.status === 'aceito') return 'rec_painel_aceito';
            if (r.status === 'recusado') return 'rec_painel_recusado';
            return 'rec_painel_pendente';
          }
          return 'rec_nao_encontrado';
        } },

      // --- Resultados: cadastro no PAINEL (aprovação do sócio) ---
      rec_painel_aceito: { bot: [
        { text: '🎉 Seu cadastro foi <strong>aceito</strong>!' },
        { text: 'Enviamos um e-mail para você criar sua senha de acesso. Clique no botão abaixo ou acesse sua caixa de e-mails.' }
      ], end: true, actions: [ { label: 'Criar senha de acesso', href: 'cadastro-senha.html', newTab: true } ] },
      rec_painel_pendente: { bot: [
        { text: '⏳ Seu cadastro está <strong>pendente</strong> de aprovação do sócio administrador.' },
        { text: 'Por favor, aguarde. Assim que for aprovado, você receberá um e-mail para criar sua senha.' }
      ], end: true },
      rec_painel_recusado: { bot: [
        { text: 'Seu cadastro <strong>não foi aprovado</strong> pelo sócio administrador.' },
        { text: 'Confira sua caixa de e-mails para mais informações.' }
      ], end: true },

      // --- Resultados: cadastro no CADFOR ---
      rec_cadfor_aceito: { bot: [
        { text: '🎉 Seu CPF foi <strong>aceito</strong> pelo CADFOR!' },
        { text: 'Acesse sua caixa de e-mails para criar sua senha de acesso, ou use o botão abaixo.' }
      ], end: true, actions: [ { label: 'Criar senha de acesso', href: 'cadastro-senha.html', newTab: true } ] },
      rec_cadfor_pendente: { bot: [
        { text: '⏳ Seu CPF ainda está <strong>em análise</strong> pelo CADFOR.' },
        { text: 'Assim que a análise for concluída, você será comunicado por e-mail.' }
      ], end: true },
      rec_cadfor_recusado: { bot: [
        { text: 'Seu cadastro foi <strong>recusado</strong> pelo CADFOR.' },
        { text: 'Confira sua caixa de e-mails para mais informações.' }
      ], end: true },

      rec_nao_encontrado: { bot: [
        { text: 'Não localizamos um cadastro para este CPF nesta empresa.' },
        { text: 'Verifique os dados informados ou inicie um novo cadastro.' }
      ], end: true },

      // É sócio/administrador?
      is_socio: { bot: [ { text: 'Você é sócio ou administrador da empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'socio_cnpj' : 'is_representante'; } } },

      // É sócio? Sim -> CNPJ -> Login ID Goiás (valida vínculo de sócio) -> Cadastro concluído
      socio_cnpj: { bot: [ { text: 'Perfeito! Para iniciarmos, informe o CNPJ da empresa.' } ],
        input: { type: 'text', mask: 'cnpj', placeholder: 'Informe o CNPJ (00.000.000/0000-00)...',
          validate: function (v) { return DB ? DB.cnpjFormatoValido(v) : true; },
          erro: 'CNPJ inválido. Informe no formato 00.000.000/0000-00 (14 dígitos).',
          route: function (v) { session.cnpj = v; return 'auth_socio'; } } },
      auth_socio: { bot: [ { text: AUTH_MSG } ], auth: 'valida_socio' },
      valida_socio: { bot: [ { text: 'Validando junto ao ID Goiás se você é sócio administrador da empresa...' } ], next: 'fim_socio' },
      fim_socio: { onEnter: function () { if (DB) DB.concluirCadastro({ cnpj: session.cnpj }); }, bot: [
        { text: '✅ Confirmamos que você é sócio administrador da empresa.' },
        { text: '🎉 Cadastro concluído com sucesso! Sua empresa já está habilitada para participar dos processos de contratação realizados pelo Estado de Goiás por meio do SISLOG.' },
        { text: 'Enviamos também um e-mail para você criar sua senha. Ou clique no botão abaixo.' }
      ], end: true, actions: [ { label: 'Criar senha de acesso', href: 'cadastro-senha.html', newTab: true } ] },

      // É representante?
      is_representante: { bot: [ { text: 'Você é o representante legal da empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'tem_procuracao' : 'recusa'; } } },

      // É representante? Não -> Recusa
      recusa: { bot: [
        { text: 'Para realizar o cadastro, é necessário ser sócio, administrador ou representante legal da empresa.' },
        { text: 'Por esse motivo, não será possível prosseguir com o cadastro.' },
        { text: 'Caso necessário, solicite que um representante habilitado realize o procedimento.' }
      ], end: true },

      // Tem procuração?
      tem_procuracao: { bot: [ { text: 'Você possui uma procuração válida que lhe concede poderes para representar a empresa?' } ],
        input: { type: 'choice', options: ['Sim', 'Não'], placeholder: 'Sim ou Não',
          route: function (v) { return isSim(v) ? 'upload_procuracao' : 'solicita_nome'; } } },

      // Tem procuração? Sim -> Upload da procuração -> Login ID Goiás -> Análise (CADFOR)
      upload_procuracao: { bot: [ { text: 'Certo! Anexe a procuração que comprova seus poderes de representação da empresa.' } ],
        input: { type: 'file', attachLabel: PROC_OK, placeholder: 'Anexe a procuração (📎) ou digite o nome do arquivo',
          route: function (v) { session.documento = v; return 'recebeu_procuracao'; } } },
      recebeu_procuracao: { bot: [ { text: 'Recebemos a procuração. ✅' } ], next: 'auth_procuracao' },
      auth_procuracao: { bot: [ { text: AUTH_MSG } ], auth: 'ia_avalia' },
      ia_avalia: {
        onEnter: function () { if (DB) DB.criarPedidoAnalise({ tipo: 'Representante (procuração)', nome: session.nome, cpf: session.cpf, cnpj: session.cnpj, documento: session.documento || 'procuracao.pdf' }); },
        bot: [
          { text: 'Recebemos o documento enviado. ✅' },
          { text: 'Nossa equipe está analisando suas informações. Assim que a análise da procuração for concluída, você será comunicado por e-mail para criar sua senha de acesso.' }
        ], end: true, actions: [ { label: 'Já concluí a análise — continuar', to: 'retomada_start' } ] },

      // Tem procuração? Não -> coleta dados do representante -> cria solicitação no "servidor" (db)
      // -> e-mail (mascarado) ao sócio administrador -> Cadastro pendente
      solicita_nome: { bot: [ { text: 'Para registrarmos sua solicitação de acesso, informe seu nome completo.' } ],
        input: { type: 'text', placeholder: 'Informe o seu nome completo...', route: function (v) { session.nome = v; return 'solicita_cpf'; } } },
      solicita_cpf: { bot: [ { text: 'Agora informe o seu CPF.' } ],
        input: { type: 'text', mask: 'cpf', placeholder: 'Informe o CPF (000.000.000-00)...',
          validate: function (v) { return DB ? DB.cpfFormatoValido(v) : true; },
          erro: 'CPF inválido. Informe no formato 000.000.000-00 (11 dígitos).',
          route: function (v) { session.cpf = v; return 'solicita_email'; } } },
      solicita_email: { bot: [ { text: 'Informe o seu e-mail.' } ],
        input: { type: 'text', placeholder: 'email@exemplo.com',
          validate: function (v) { return DB ? DB.emailValido(v) : true; },
          erro: 'E-mail inválido. Informe um endereço no formato email@exemplo.com.',
          route: function (v) { session.email = v; return 'solicita_cnpj'; } } },
      solicita_cnpj: { bot: [ { text: 'Informe o CNPJ da empresa.' } ],
        input: { type: 'text', mask: 'cnpj', placeholder: 'Informe o CNPJ (00.000.000/0000-00)...',
          validate: function (v) { return DB ? DB.cnpjFormatoValido(v) : true; },
          erro: 'CNPJ inválido. Informe no formato 00.000.000/0000-00 (14 dígitos).',
          route: function (v) { session.cnpj = v; return 'confirma_dados'; } } },
      confirma_dados: {
        bot: function () {
          return [
            { text: 'Confira seus dados antes de enviarmos ao sócio administrador da empresa:' },
            { text: 'Nome: <strong>' + session.nome + '</strong><br>CPF: <strong>' + session.cpf +
              '</strong><br>E-mail: <strong>' + session.email + '</strong><br>CNPJ: <strong>' + session.cnpj + '</strong>' }
          ];
        },
        input: { type: 'choice', options: ['Confirmar e enviar', 'Corrigir dados'], placeholder: 'Confirmar ou corrigir',
          route: function (v) { return /confirmar/i.test(v) ? 'cria_solicitacao' : 'solicita_nome'; } } },
      cria_solicitacao: {
        onEnter: function () { if (DB) session.req = DB.criarSolicitacaoRepresentante({ nome: session.nome, cpf: session.cpf, email: session.email, cnpj: session.cnpj }); },
        bot: function () {
          var socio = DB ? DB.maskEmail(DB.emailSocio()) : 's****@empresa.com.br';
          return [
            { text: 'Identificamos que o acesso depende da aprovação do sócio administrador.' },
            { text: 'Enviamos uma solicitação para o e-mail ' + socio + '. Após a aprovação, você poderá concluir o cadastro.' }
          ];
        },
        next: 'fim_pendente'
      },
      fim_pendente: { bot: [
        { text: 'Assim que o sócio administrador aprovar sua solicitação, você receberá um e-mail para criar sua senha de acesso.' }
      ], end: true },

      // ================= 2º fluxo: Continuar cadastro (checagem AUTOMÁTICA do status) =================
      retomada_start: { bot: [ { text: 'Vamos dar continuidade ao seu cadastro. Estamos verificando o andamento...' } ],
        decide: function () {
          var s = DB ? DB.situacaoUltimoCadastro() : 'nenhum';
          if (s === 'aprovado') return 'retomada_aprovado';
          if (s === 'rejeitado') return 'retomada_rejeitado';
          return 'retomada_pendente';
        } },
      retomada_aprovado: { bot: [
        { text: '🎉 Seu cadastro foi <strong>aprovado</strong>! Você já pode acessar o SISLOG.' },
        { text: 'Clique no botão abaixo para criar sua senha de acesso.' }
      ], end: true, actions: [ { label: 'Criar senha de acesso', href: 'cadastro-senha.html', newTab: true } ] },
      retomada_pendente: { bot: [
        { text: 'Seu cadastro ainda está <strong>em análise</strong> pela nossa equipe.' },
        { text: 'Assim que a análise for concluída, você receberá um e-mail para criar sua senha de acesso.' }
      ], end: true },
      retomada_rejeitado: { bot: [
        { text: 'Infelizmente seu cadastro <strong>não foi aprovado</strong> pela nossa equipe.' },
        { text: 'Verifique os documentos enviados e, se necessário, realize um novo cadastro.' }
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
      // Validação (ex.: CPF/CNPJ) — em caso de erro, mostra aviso e repete o passo
      if (!asFile && input.validate && !input.validate(value)) {
        pending = null;
        setInputMode('off');
        renderTurn('user', [ { text: value } ]);
        text.value = '';
        var t = showTyping();
        setTimeout(function () {
          t.remove();
          renderTurn('bot', [ { text: input.erro || 'Valor inválido. Tente novamente.' } ]);
          waitFor(input);
        }, 600);
        return;
      }
      pending = null;
      clearQuick();
      setInputMode('off');
      text.value = '';
      text.placeholder = 'Type a message';
      renderTurn('user', [ asFile ? { file: value } : { text: value } ]);
      var next = input.route ? input.route(value) : null;
      setTimeout(function () { if (next) goTo(next); }, 650);
    }

    // Máscara automática enquanto digita (CPF/CNPJ)
    text.addEventListener('input', function () {
      if (!pending || !DB) return;
      if (pending.mask === 'cpf') text.value = DB.formatCpf(text.value);
      else if (pending.mask === 'cnpj') text.value = DB.formatCnpj(text.value);
    });

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
