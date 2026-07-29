/* ============================================================
   SISLOG — "Servidor em cache" (protótipo)
   Backend falso baseado em localStorage. Persiste entre
   recarregamentos/abas e reseta quando o usuário limpa os
   dados do navegador. NÃO é compartilhado entre dispositivos.
   API global: window.SislogDB
   ============================================================ */
(function () {
  var KEY = 'sislog:db';

  function digits(s) { return (s || '').replace(/\D/g, ''); }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function get() {
    var d = load();
    if (!d.representantes) d.representantes = [];
    if (!d.emails) d.emails = [];
    if (!d.pedidos) d.pedidos = [];
    if (!('empresa' in d)) d.empresa = null;
    return d;
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  /* ---------- Máscaras e validações ---------- */
  function maskEmail(e) {
    if (!e || e.indexOf('@') < 0) return e || '';
    var p = e.split('@');
    return p[0].charAt(0) + '****@' + p[1];
  }
  function maskCpf(c) {
    var d = digits(c);
    if (d.length !== 11) return c || '';
    return d.slice(0, 3) + '.***.***-' + d.slice(9);
  }
  function formatCpf(c) {
    var d = digits(c).slice(0, 11);
    if (d.length > 9) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (d.length > 3) return d.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return d;
  }
  function formatCnpj(c) {
    var d = digits(c).slice(0, 14);
    if (d.length > 12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    if (d.length > 8) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    if (d.length > 5) return d.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (d.length > 2) return d.replace(/(\d{2})(\d{1,3})/, '$1.$2');
    return d;
  }
  function cpfFormatoValido(c) { return digits(c).length === 11; }
  function cnpjFormatoValido(c) { return digits(c).length === 14; }
  function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim()); }

  function slug(nome) {
    return (nome || 'representante').trim().toLowerCase().split(/\s+/)[0]
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') || 'representante';
  }
  function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function uid(p) { return (p || 'id') + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000); }

  /* ---------- Empresa fictícia ---------- */
  var PREFIXOS = ['Aurora', 'Horizonte', 'Vale', 'Nova', 'Terra', 'Cerrado', 'Bandeirante', 'Araguaia', 'Serra', 'Planalto', 'Ipê', 'Goiás'];
  var NUCLEOS = ['Construções', 'Logística', 'Engenharia', 'Comércio', 'Serviços', 'Tecnologia', 'Distribuidora', 'Agropecuária', 'Transportes', 'Soluções'];
  var SUFIXOS = ['LTDA', 'S.A.', 'ME', 'EIRELI'];
  var RAMOS = ['Construção civil', 'Logística e transporte', 'Comércio atacadista', 'Tecnologia da informação', 'Serviços administrativos', 'Agronegócio'];
  var CIDADES = ['Goiânia - GO', 'Aparecida de Goiânia - GO', 'Anápolis - GO', 'Rio Verde - GO', 'Catalão - GO', 'Luziânia - GO'];
  var SOCIOS = ['Carlos Mendes', 'Ana Beatriz Rocha', 'Rafael Oliveira', 'Juliana Castro', 'Marcos Antônio Lima', 'Fernanda Ribeiro'];
  var ANALISTAS = ['Patrícia Gomes', 'Bruno Teixeira', 'Larissa Nunes', 'Eduardo Ramos'];

  function gerarCnpj() {
    var s = '';
    for (var i = 0; i < 14; i++) s += Math.floor(Math.random() * 10);
    return formatCnpj(s);
  }
  function gerarEmpresa(cnpj) {
    var pre = rnd(PREFIXOS), nuc = rnd(NUCLEOS);
    return {
      razaoSocial: pre + ' ' + nuc + ' ' + rnd(SUFIXOS),
      nomeFantasia: pre + ' ' + nuc,
      cnpj: cnpjFormatoValido(cnpj) ? formatCnpj(cnpj) : gerarCnpj(),
      ramo: rnd(RAMOS),
      cidade: rnd(CIDADES),
      socioNome: rnd(SOCIOS),
      abertura: '0' + (1 + Math.floor(Math.random() * 9)) + '/0' + (1 + Math.floor(Math.random() * 9)) + '/20' + (10 + Math.floor(Math.random() * 14))
    };
  }
  function garantirEmpresa(cnpj) {
    var d = get();
    if (!d.empresa) { d.empresa = gerarEmpresa(cnpj); save(d); }
    return d.empresa;
  }
  function getEmpresa() { return get().empresa; }

  /* ---------- Representantes (convites) ---------- */
  function agora() { return { data: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }; }

  function criarEmailConvite(d, rep, empresa) {
    var t = agora();
    d.emails.push({
      id: uid('mail'), tipo: 'convite',
      para: rep.email, nome: rep.nome, cpf: rep.cpf,
      assunto: 'Convite para representar ' + (empresa ? empresa.razaoSocial : 'a empresa') + ' no SISLOG',
      corpo: 'Olá ' + rep.nome + ', você foi convidado(a) para atuar como representante de ' +
        (empresa ? empresa.razaoSocial + ' (CNPJ ' + empresa.cnpj + ')' : 'uma empresa') +
        ' no SISLOG. Aceite o convite para criar sua senha e acessar o portal.',
      status: 'nao_lido', repId: rep.id, data: t.data, hora: t.hora
    });
  }

  function emailSocio(empresa) {
    var e = empresa || getEmpresa() || garantirEmpresa();
    return 'socio.admin@' + slug(e ? e.nomeFantasia : 'empresa') + '.com.br';
  }

  function criarEmailSolicitacao(d, rep, empresa) {
    var t = agora();
    var socioEmail = emailSocio(empresa);
    d.emails.push({
      id: uid('mail'), tipo: 'solicitacao',
      para: socioEmail, nome: rep.nome, cpf: rep.cpf,
      assunto: 'Nova solicitação de acesso — ' + rep.nome,
      corpo: rep.nome + ' (CPF ' + maskCpf(rep.cpf) + ') solicitou acesso para representar ' +
        (empresa ? empresa.razaoSocial + ' (CNPJ ' + empresa.cnpj + ')' : 'a empresa') +
        ' no SISLOG. Aprove a solicitação para autorizar o acesso.',
      status: 'nao_lido', repId: rep.id, data: t.data, hora: t.hora
    });
  }

  // { ok:true, rep } | { ok:false, erro }
  function adicionarRepresentante(req) {
    if (!(req && req.nome && req.nome.trim())) return { ok: false, erro: 'Informe o nome.' };
    if (!cpfFormatoValido(req.cpf)) return { ok: false, erro: 'CPF deve ter 11 dígitos (000.000.000-00).' };
    if (!emailValido(req.email)) return { ok: false, erro: 'Informe um e-mail válido.' };
    var vm = parseInt(req.validadeMeses, 10);
    if (isNaN(vm) || vm < 0 || vm > 999) return { ok: false, erro: 'Informe a validade em meses (0 a 999).' };
    var d = get();
    if (d.representantes.some(function (r) { return digits(r.cpf) === digits(req.cpf); })) {
      return { ok: false, erro: 'Já existe um representante com este CPF.' };
    }
    var empresa = garantirEmpresa();
    var rep = {
      id: uid('rep'),
      nome: req.nome.trim(),
      cpf: formatCpf(req.cpf),
      email: req.email.trim(),
      validadeMeses: vm,
      status: 'pendente',
      origem: 'convite',
      senhaCriada: false,
      convidadoEm: new Date().toISOString(),
      aceitoEm: null
    };
    d.representantes.push(rep);
    criarEmailConvite(d, rep, empresa);
    save(d);
    return { ok: true, rep: rep };
  }

  // Solicitação vinda do chat (representante pede acesso -> aparece no painel + e-mail ao sócio)
  function criarSolicitacaoRepresentante(req) {
    var empresa = garantirEmpresa(req.cnpj);
    var d = get();
    var rep = d.representantes.filter(function (r) { return digits(r.cpf) === digits(req.cpf); })[0];
    if (!rep) {
      rep = {
        id: uid('rep'),
        nome: (req.nome || 'Representante').trim(),
        cpf: formatCpf(req.cpf) || (req.cpf || ''),
        email: req.email || (slug(req.nome) + '@empresa.com.br'),
        status: 'pendente',
        origem: 'solicitacao',
        senhaCriada: false,
        convidadoEm: new Date().toISOString(),
        aceitoEm: null
      };
      d.representantes.push(rep);
    }
    criarEmailSolicitacao(d, rep, empresa);
    save(d);
    return rep;
  }

  // Sócio aprova (no painel ou no e-mail) -> autoriza + gera convite para criar senha
  function aprovarRepresentantePorCpf(cpf) {
    var d = get();
    var empresa = d.empresa || garantirEmpresa();
    var r = d.representantes.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (!r) return null;
    r.status = 'aceito';
    r.aceitoEm = new Date().toISOString();
    if (!r.aprovadoPor) r.aprovadoPor = empresa ? empresa.socioNome : '';
    d.emails.forEach(function (m) { if (m.tipo === 'solicitacao' && digits(m.cpf) === digits(cpf)) m.status = 'lido'; });
    if (!d.emails.some(function (m) { return m.tipo === 'convite' && digits(m.cpf) === digits(cpf); })) {
      var t = agora();
      d.emails.push({
        id: uid('mail'), tipo: 'convite',
        para: r.email, nome: r.nome, cpf: r.cpf,
        assunto: 'Acesso aprovado — crie sua senha no SISLOG',
        corpo: 'Olá ' + r.nome + ', seu acesso para representar ' + (empresa ? empresa.razaoSocial : 'a empresa') +
          ' foi aprovado. Aceite para criar sua senha e acessar o portal.',
        status: 'nao_lido', repId: r.id, data: t.data, hora: t.hora
      });
    }
    save(d);
    return r;
  }

  function listarRepresentantes() { return get().representantes; }
  function getRepresentante(id) { return get().representantes.filter(function (r) { return r.id === id; })[0] || null; }
  function getRepresentantePorCpf(cpf) {
    var c = digits(cpf);
    return get().representantes.filter(function (r) { return digits(r.cpf) === c; })[0] || null;
  }
  function removerRepresentante(id) {
    var d = get();
    d.representantes = d.representantes.filter(function (r) { return r.id !== id; });
    d.emails = d.emails.filter(function (m) { return m.repId !== id; });
    save(d);
    return d.representantes;
  }
  function aceitarConvitePorCpf(cpf) {
    var d = get();
    var r = d.representantes.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (r) {
      r.status = 'aceito'; r.aceitoEm = new Date().toISOString();
      if (!r.aprovadoPor) r.aprovadoPor = (d.empresa && d.empresa.socioNome) || '';
    }
    d.emails.forEach(function (m) { if (digits(m.cpf) === digits(cpf)) m.status = 'lido'; });
    save(d);
    return r;
  }

  /* ---------- Caixa de e-mails ---------- */
  function listarEmails() { return get().emails.slice().reverse(); } // mais recentes primeiro
  function getEmail(id) { return get().emails.filter(function (m) { return m.id === id; })[0] || null; }
  function marcarEmailLido(id) {
    var d = get();
    var m = d.emails.filter(function (x) { return x.id === id; })[0];
    if (m) { m.status = 'lido'; save(d); }
    return m;
  }

  /* ---------- Autorização (checagem do chat) ---------- */
  function estaAutorizado(cpf) {
    var c = digits(cpf);
    if (!c) return false;
    return get().representantes.some(function (r) { return digits(r.cpf) === c && r.status === 'aceito'; });
  }
  function marcarSenhaCriada(cpf, dados) {
    var d = get();
    var r = d.representantes.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (r) {
      r.senhaCriada = true;
      if (dados && dados.nome) r.nome = dados.nome;
      if (dados && dados.email) r.email = dados.email;
      if (r.status === 'pendente') {
        r.status = 'aceito'; r.aceitoEm = new Date().toISOString();
        if (!r.aprovadoPor) r.aprovadoPor = (d.empresa && d.empresa.socioNome) || '';
      }
    }
    save(d);
    return r;
  }

  // Ao concluir o cadastro pelo chat -> chega um e-mail para criar a senha
  function concluirCadastro(dados) {
    dados = dados || {};
    var d = get();
    var empresa = getEmpresa() || garantirEmpresa();
    var t = agora();
    var para = dados.email || ('contato@' + slug(empresa ? empresa.nomeFantasia : 'empresa') + '.com.br');
    d.emails.push({
      id: uid('mail'), tipo: 'senha',
      para: para, nome: dados.nome || '', cpf: dados.cpf || '',
      assunto: 'Crie sua senha de acesso ao SISLOG',
      corpo: 'Seu cadastro foi concluído com sucesso! Clique no botão abaixo para criar sua senha de acesso ao SISLOG.',
      status: 'nao_lido', repId: null, data: t.data, hora: t.hora
    });
    save(d);
  }

  /* ---------- Pedidos de análise (CADFOR) ----------
     Toda etapa do chat que "a IA analisaria" passa a gerar um pedido
     que fica em análise até um analista do CADFOR aprovar/rejeitar. */
  var DOCS = ['contrato-social.pdf', 'procuracao.pdf', 'cartao-cnpj.pdf', 'comprovante-endereco.pdf'];

  function criarPedidoAnalise(req) {
    req = req || {};
    var d = get();
    var empresa = getEmpresa() || garantirEmpresa(req.cnpj);
    // Evita duplicar: se já há pedido em análise para o mesmo CPF, reaproveita.
    if (req.cpf && digits(req.cpf)) {
      var existente = d.pedidos.filter(function (p) {
        return digits(p.cpf) === digits(req.cpf) && p.status === 'em_analise';
      })[0];
      if (existente) return existente;
    }
    var t = agora();
    var seq = (d.pedidoSeq || 0) + 1; d.pedidoSeq = seq;
    var pedido = {
      id: uid('ped'),
      codigo: 'CAD-' + String(10000 + seq),
      tipo: req.tipo || 'Cadastro',
      nome: (req.nome && req.nome.trim()) || (empresa ? empresa.razaoSocial : 'Fornecedor'),
      cpf: req.cpf ? (formatCpf(req.cpf) || req.cpf) : '',
      cnpj: req.cnpj ? formatCnpj(req.cnpj) : (empresa ? empresa.cnpj : ''),
      email: req.email || '',
      razaoSocial: empresa ? empresa.razaoSocial : '',
      documento: req.documento || rnd(DOCS),
      analista: rnd(ANALISTAS),
      status: 'em_analise',
      data: t.data, hora: t.hora,
      criadoEm: new Date().toISOString(), decididoEm: null
    };
    d.pedidos.push(pedido);
    save(d);
    return pedido;
  }

  function listarPedidos() { return get().pedidos.slice().reverse(); } // mais recentes primeiro
  function getPedido(id) { return get().pedidos.filter(function (p) { return p.id === id; })[0] || null; }

  function pedidoEmAnalise(doc) {
    var c = digits(doc);
    if (!c) return false;
    return get().pedidos.some(function (p) {
      return p.status === 'em_analise' && (digits(p.cpf) === c || digits(p.cnpj) === c);
    });
  }
  function pedidoAprovado(doc) {
    var c = digits(doc);
    if (!c) return false;
    return get().pedidos.some(function (p) {
      return p.status === 'aprovado' && (digits(p.cpf) === c || digits(p.cnpj) === c);
    });
  }

  function emailDestinoPedido(p, empresa) {
    return p.email || ('contato@' + slug(empresa ? empresa.nomeFantasia : 'empresa') + '.com.br');
  }

  // Analista aprova -> chega e-mail informando que X pessoa de X empresa foi aprovada + criar senha
  function aprovarPedido(id) {
    var d = get();
    var p = d.pedidos.filter(function (x) { return x.id === id; })[0];
    if (!p || p.status === 'aprovado') return p || null;
    var empresa = getEmpresa() || garantirEmpresa();
    p.status = 'aprovado';
    p.decididoEm = new Date().toISOString();

    // Reflete a aprovação na lista de representantes, marcando o CADFOR como responsável.
    if (p.cpf && digits(p.cpf)) {
      var aprovador = 'CADFOR · ' + (p.analista || 'Equipe CADFOR');
      var rep = d.representantes.filter(function (x) { return digits(x.cpf) === digits(p.cpf); })[0];
      if (rep) {
        rep.aprovadoPor = aprovador;
        if (rep.status !== 'aceito') { rep.status = 'aceito'; rep.aceitoEm = new Date().toISOString(); }
      } else {
        rep = {
          id: uid('rep'), nome: p.nome, cpf: p.cpf, email: p.email || '',
          validadeMeses: (p.validadeMeses != null && p.validadeMeses !== '') ? p.validadeMeses : 12,
          status: 'aceito', origem: 'cadfor', senhaCriada: false,
          convidadoEm: p.criadoEm || new Date().toISOString(),
          aceitoEm: new Date().toISOString(), aprovadoPor: aprovador
        };
        d.representantes.push(rep);
      }
    }

    var t = agora();
    d.emails.push({
      id: uid('mail'), tipo: 'senha',
      para: emailDestinoPedido(p, empresa), nome: p.nome, cpf: digits(p.cpf) ? p.cpf : (empresa ? empresa.cnpj : ''),
      assunto: 'Cadastro aprovado — crie sua senha no SISLOG',
      corpo: 'Boas notícias! O cadastro de ' + p.nome + ' referente à empresa ' +
        (p.razaoSocial || empresa.razaoSocial) + ' foi analisado e APROVADO pela nossa equipe. ' +
        'Clique no botão abaixo para criar sua senha e acessar o SISLOG.',
      status: 'nao_lido', repId: null, data: t.data, hora: t.hora
    });
    save(d);
    return p;
  }

  // Analista rejeita -> e-mail informando que o cadastro não foi aprovado
  function rejeitarPedido(id) {
    var d = get();
    var p = d.pedidos.filter(function (x) { return x.id === id; })[0];
    if (!p || p.status === 'rejeitado') return p || null;
    var empresa = getEmpresa() || garantirEmpresa();
    p.status = 'rejeitado';
    p.decididoEm = new Date().toISOString();
    var t = agora();
    d.emails.push({
      id: uid('mail'), tipo: 'rejeitado',
      para: emailDestinoPedido(p, empresa), nome: p.nome, cpf: digits(p.cpf) ? p.cpf : (empresa ? empresa.cnpj : ''),
      assunto: 'Cadastro não aprovado — SISLOG',
      corpo: 'Após análise da nossa equipe, não foi possível aprovar o cadastro de ' + p.nome +
        ' referente à empresa ' + (p.razaoSocial || empresa.razaoSocial) +
        '. Revise os documentos enviados e, se necessário, realize um novo cadastro.',
      status: 'nao_lido', repId: null, data: t.data, hora: t.hora
    });
    save(d);
    return p;
  }

  function resetar() { localStorage.removeItem(KEY); }

  /* ---------- Botão flutuante de reset (demo) ---------- */
  function injectResetButton() {
    if (document.getElementById('sislog-reset-proto')) return;
    var b = document.createElement('button');
    b.id = 'sislog-reset-proto';
    b.type = 'button';
    b.textContent = '↺ Resetar dados (protótipo)';
    b.title = 'Limpa os dados simulados do "servidor em cache"';
    b.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9999;padding:8px 14px;' +
      'border:1px solid rgba(145,158,171,.32);border-radius:999px;background:#fff;color:#637381;' +
      "font:600 12px/1 'Public Sans',system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.12);";
    b.addEventListener('click', function () {
      resetar();
      b.textContent = '✓ Dados resetados';
      setTimeout(function () { location.reload(); }, 500);
    });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectResetButton);
  else injectResetButton();

  window.SislogDB = {
    // empresa
    garantirEmpresa: garantirEmpresa, getEmpresa: getEmpresa, gerarEmpresa: gerarEmpresa, emailSocio: emailSocio,
    // representantes
    adicionarRepresentante: adicionarRepresentante, listarRepresentantes: listarRepresentantes,
    getRepresentante: getRepresentante, getRepresentantePorCpf: getRepresentantePorCpf,
    removerRepresentante: removerRepresentante, aceitarConvitePorCpf: aceitarConvitePorCpf,
    criarSolicitacaoRepresentante: criarSolicitacaoRepresentante, aprovarRepresentantePorCpf: aprovarRepresentantePorCpf,
    // e-mails
    listarEmails: listarEmails, getEmail: getEmail, marcarEmailLido: marcarEmailLido,
    // autorização (chat)
    estaAutorizado: estaAutorizado, marcarSenhaCriada: marcarSenhaCriada, concluirCadastro: concluirCadastro,
    // pedidos de análise (CADFOR)
    criarPedidoAnalise: criarPedidoAnalise, listarPedidos: listarPedidos, getPedido: getPedido,
    pedidoEmAnalise: pedidoEmAnalise, pedidoAprovado: pedidoAprovado,
    aprovarPedido: aprovarPedido, rejeitarPedido: rejeitarPedido,
    // util
    resetar: resetar, maskEmail: maskEmail, maskCpf: maskCpf,
    formatCpf: formatCpf, formatCnpj: formatCnpj,
    cpfFormatoValido: cpfFormatoValido, cnpjFormatoValido: cnpjFormatoValido, emailValido: emailValido
  };
})();
