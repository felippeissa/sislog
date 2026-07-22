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
    return d;
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

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
  function slug(nome) {
    return (nome || 'representante').trim().toLowerCase().split(/\s+/)[0]
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') || 'representante';
  }

  function criarSolicitacaoAcesso(req) {
    var d = get();
    var now = new Date();
    var item = {
      id: 'req_' + now.getTime() + '_' + Math.floor(Math.random() * 1000),
      nome: req.nome || 'Representante',
      cpf: req.cpf || '',
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
  function listarSolicitacoesPendentes() {
    return get().solicitacoes.filter(function (s) { return s.status === 'pendente'; });
  }
  function getSolicitacao(id) {
    return get().solicitacoes.filter(function (s) { return s.id === id; })[0] || null;
  }

  function addAutorizado(d, rep) {
    var c = digits(rep.cpf);
    if (!c) return;
    if (!d.autorizados.some(function (a) { return digits(a.cpf) === c; })) {
      d.autorizados.push({
        cpf: rep.cpf, nome: rep.nome || '', cnpj: rep.cnpj || '', empresa: rep.empresa || '',
        autorizadoEm: new Date().toISOString(), senhaCriada: false
      });
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

  function adicionarRepresentantes(lista, ctx) {
    var d = get();
    (lista || []).forEach(function (r) {
      addAutorizado(d, { cpf: r.cpf, nome: r.nome, cnpj: (ctx && ctx.cnpj) || '', empresa: (ctx && ctx.empresa) || '' });
    });
    save(d);
    return d.autorizados;
  }

  function estaAutorizado(cpf) {
    var c = digits(cpf);
    return !!c && get().autorizados.some(function (a) { return digits(a.cpf) === c; });
  }
  function getAutorizado(cpf) {
    var c = digits(cpf);
    return get().autorizados.filter(function (a) { return digits(a.cpf) === c; })[0] || null;
  }
  function marcarSenhaCriada(cpf) {
    var d = get();
    var a = d.autorizados.filter(function (x) { return digits(x.cpf) === digits(cpf); })[0];
    if (a) { a.senhaCriada = true; save(d); }
    return a;
  }

  function resetar() { localStorage.removeItem(KEY); }

  // Botão flutuante para resetar os dados durante a demonstração
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectResetButton);
  } else {
    injectResetButton();
  }

  window.SislogDB = {
    criarSolicitacaoAcesso: criarSolicitacaoAcesso,
    listarSolicitacoes: listarSolicitacoes,
    listarSolicitacoesPendentes: listarSolicitacoesPendentes,
    getSolicitacao: getSolicitacao,
    aprovarSolicitacao: aprovarSolicitacao,
    recusarSolicitacao: recusarSolicitacao,
    adicionarRepresentantes: adicionarRepresentantes,
    estaAutorizado: estaAutorizado,
    getAutorizado: getAutorizado,
    marcarSenhaCriada: marcarSenhaCriada,
    resetar: resetar,
    maskEmail: maskEmail,
    maskCpf: maskCpf
  };
})();
