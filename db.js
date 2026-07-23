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
    if (!d.solicitacoes) d.solicitacoes = [];
    if (!d.autorizados) d.autorizados = [];
    if (!d.representantes) d.representantes = [];
    if (!d.emails) d.emails = [];
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

  function criarEmailSolicitacao(d, rep, empresa) {
    var t = agora();
    var socioEmail = 'socio.admin@' + slug(empresa ? empresa.nomeFantasia : 'empresa') + '.com.br';
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
    if (r) { r.status = 'aceito'; r.aceitoEm = new Date().toISOString(); }
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

  /* ---------- Compatibilidade com o chat (solicitações/aprovação) ---------- */
  function criarSolicitacaoAcesso(req) {
    var d = get();
    var now = new Date();
    var item = {
      id: uid('req'),
      nome: req.nome || 'Representante',
      cpf: formatCpf(req.cpf) || (req.cpf || ''),
      cnpj: req.cnpj || '',
      empresa: req.empresa || '',
      email: req.email || (slug(req.nome) + '@empresa.com.br'),
      data: now.toLocaleDateString('pt-BR'),
      hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'pendente'
    };
    d.solicitacoes.push(item);
    save(d);
    return item;
  }
  function listarSolicitacoes() { return get().solicitacoes; }
  function listarSolicitacoesPendentes() { return get().solicitacoes.filter(function (s) { return s.status === 'pendente'; }); }
  function getSolicitacao(id) { return get().solicitacoes.filter(function (s) { return s.id === id; })[0] || null; }
  function addAutorizado(d, rep) {
    var c = digits(rep.cpf);
    if (!c) return;
    if (!d.autorizados.some(function (a) { return digits(a.cpf) === c; })) {
      d.autorizados.push({ cpf: rep.cpf, nome: rep.nome || '', cnpj: rep.cnpj || '', empresa: rep.empresa || '', autorizadoEm: new Date().toISOString(), senhaCriada: false });
    }
  }
  function aprovarSolicitacao(id) {
    var d = get();
    var s = d.solicitacoes.filter(function (x) { return x.id === id; })[0];
    if (!s) return null;
    s.status = 'aprovado';
    addAutorizado(d, { cpf: s.cpf, nome: s.nome, cnpj: s.cnpj, empresa: s.empresa });
    save(d);
    return s;
  }
  function recusarSolicitacao(id) {
    var d = get();
    var s = d.solicitacoes.filter(function (x) { return x.id === id; })[0];
    if (s) { s.status = 'recusado'; save(d); }
    return s;
  }
  function estaAutorizado(cpf) {
    var c = digits(cpf);
    if (!c) return false;
    var d = get();
    return d.autorizados.some(function (a) { return digits(a.cpf) === c; }) ||
      d.representantes.some(function (r) { return digits(r.cpf) === c && r.status === 'aceito'; });
  }
  function getAutorizado(cpf) {
    var c = digits(cpf);
    return get().autorizados.filter(function (a) { return digits(a.cpf) === c; })[0] || null;
  }
  function marcarSenhaCriada(cpf) {
    var d = get();
    var a = d.autorizados.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (a) a.senhaCriada = true;
    var r = d.representantes.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (r) { r.senhaCriada = true; if (r.status === 'pendente') { r.status = 'aceito'; r.aceitoEm = new Date().toISOString(); } }
    save(d);
    return r || a;
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
    garantirEmpresa: garantirEmpresa, getEmpresa: getEmpresa, gerarEmpresa: gerarEmpresa,
    // representantes
    adicionarRepresentante: adicionarRepresentante, listarRepresentantes: listarRepresentantes,
    getRepresentante: getRepresentante, getRepresentantePorCpf: getRepresentantePorCpf,
    removerRepresentante: removerRepresentante, aceitarConvitePorCpf: aceitarConvitePorCpf,
    criarSolicitacaoRepresentante: criarSolicitacaoRepresentante, aprovarRepresentantePorCpf: aprovarRepresentantePorCpf,
    // e-mails
    listarEmails: listarEmails, getEmail: getEmail, marcarEmailLido: marcarEmailLido,
    // chat (compat)
    criarSolicitacaoAcesso: criarSolicitacaoAcesso, listarSolicitacoes: listarSolicitacoes,
    listarSolicitacoesPendentes: listarSolicitacoesPendentes, getSolicitacao: getSolicitacao,
    aprovarSolicitacao: aprovarSolicitacao, recusarSolicitacao: recusarSolicitacao,
    estaAutorizado: estaAutorizado, getAutorizado: getAutorizado, marcarSenhaCriada: marcarSenhaCriada,
    // util
    resetar: resetar, maskEmail: maskEmail, maskCpf: maskCpf,
    formatCpf: formatCpf, formatCnpj: formatCnpj,
    cpfFormatoValido: cpfFormatoValido, cnpjFormatoValido: cnpjFormatoValido, emailValido: emailValido
  };
})();
