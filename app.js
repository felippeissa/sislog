/* SISLOG 3.0 — header/footer compartilhados + interações
   Mantém a navegação em um único lugar para todas as páginas. */
(function () {
  // Font Awesome (ícones dos cards) — carregado o quanto antes
  (function () {
    var fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    fa.crossOrigin = 'anonymous';
    (document.head || document.documentElement).appendChild(fa);
  })();

  var NAV = [
    { key: 'inicio', label: 'Página inicial', href: 'index.html' },
    { key: 'contratacoes', label: 'Contratações', href: 'contratacoes.html', children: [
      { label: 'Licitações', href: '#' },
      { label: 'Contratação Direta', href: '#' },
      { label: 'Procedimentos Auxiliares', href: '#' },
      { label: 'Registro de Preços', href: '#' }
    ] },
    { key: 'fornecedores', label: 'Fornecedores', href: 'fornecedores.html', children: [
      { label: 'Orientações Gerais', href: '#' },
      { label: 'Documentos para Homologação', href: '#' },
      { label: 'Modelos de Documentos para Homologação', href: '#' },
      { label: 'Cadastro', href: 'cadastro-fornecedor.html' },
      { label: 'Penalidades', href: '#', children: [
        { label: 'Certidão Negativa/Positiva', href: '#' },
        { label: 'Fornecedores com Penalidades', href: '#' }
      ] },
      { label: 'Certificado de Registro Cadastral - CRC', href: '#' },
      { label: 'Sistema SISLOG', href: '#', children: [
        { label: 'Manual de Uso do Sistema SISLOG para Fornecedores', href: '#' }
      ] }
    ] },
    { key: 'contratos', label: 'Contratos', href: 'contratos.html', children: [
      { label: 'Contratos Vigentes', href: '#' },
      { label: 'Contratos Vencidos', href: '#' }
    ] },
    { key: 'emendasgo', label: 'EmendasGO', href: 'emendasgo.html', children: [
      { label: 'Cadastro de Beneficiários', href: '#' },
      { label: 'Orientações Gerais', href: '#' },
      { label: 'Relatórios', href: '#' }
    ] },
    { key: 'faleconosco', label: 'Fale conosco', href: 'fale-conosco.html' }
  ];

  var active = document.body.getAttribute('data-page') || 'inicio';

  function esc(s) { return s; }

  // Desktop: nav-items com dropdown/submenu no hover
  function renderMenu(items, level) {
    var listClass = level === 0 ? 'dropdown' : 'submenu';
    return '<ul class="' + listClass + '">' + items.map(function (c) {
      if (c.children) {
        return '<li class="has-submenu">' +
          '<a href="' + c.href + '">' + esc(c.label) + '<i class="fa-solid fa-angle-right"></i></a>' +
          renderMenu(c.children, level + 1) +
        '</li>';
      }
      return '<li><a href="' + c.href + '">' + esc(c.label) + '</a></li>';
    }).join('') + '</ul>';
  }

  function desktopNav() {
    return NAV.map(function (item) {
      var activeCls = item.key === active ? ' active' : '';
      if (item.children) {
        return '<div class="nav-item has-dropdown">' +
          '<a class="top-link' + activeCls + '" href="' + item.href + '">' + esc(item.label) +
          '<i class="fa-solid fa-angle-down"></i></a>' +
          renderMenu(item.children, 0) +
        '</div>';
      }
      return '<div class="nav-item">' +
        '<a class="top-link' + activeCls + '" href="' + item.href + '">' + esc(item.label) + '</a>' +
      '</div>';
    }).join('');
  }

  // Mobile: lista aninhada e indentada
  function mobileNav() {
    var html = '';
    NAV.forEach(function (item) {
      var cls = item.key === active ? ' class="active"' : '';
      html += '<a' + cls + ' href="' + item.href + '">' + esc(item.label) + '</a>';
      if (item.children) {
        item.children.forEach(function (c) {
          html += '<a class="mob-sub" href="' + c.href + '">' + esc(c.label) + '</a>';
          if (c.children) {
            c.children.forEach(function (cc) {
              html += '<a class="mob-sub2" href="' + cc.href + '">' + esc(cc.label) + '</a>';
            });
          }
        });
      }
    });
    html += '<a class="mob-portal" href="#" data-portal>Acessar o portal</a>';
    return html;
  }

  var SPRITE =
    '<svg class="svg-sprite" aria-hidden="true">' +
      '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>' +
      '<symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="m15 11 2 2 4-4"/></symbol>' +
      '<symbol id="i-handshake" viewBox="0 0 24 24"><path d="m9 11 3 3a2 2 0 0 0 3 0l4-4"/><path d="m2 12 5-5 4 1 2-2 4 2 5 5-5 6-3-2-2 2-7-7-3 3z"/></symbol>' +
      '<symbol id="i-list" viewBox="0 0 24 24"><rect x="5" y="3" width="16" height="18" rx="2"/><path d="M9 8h.01M12 8h5M9 12h.01M12 12h5M9 16h.01M12 16h5"/></symbol>' +
      '<symbol id="i-tag" viewBox="0 0 24 24"><path d="M20 13 11 22l-9-9V4h9z"/><circle cx="7" cy="9" r="1.5"/><path d="m14 17 6-6"/></symbol>' +
      '<symbol id="i-file" viewBox="0 0 24 24"><path d="M6 2h8l5 5v15H6z"/><path d="M14 2v6h5M9 13h6M9 17h6"/></symbol>' +
      '<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/></symbol>' +
      '<symbol id="i-scale" viewBox="0 0 24 24"><path d="M12 3v18M5 6h14M4 6l-3 7h6zM20 6l-3 7h6zM7 21h10"/></symbol>' +
      '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 4h16v12H8l-4 4z"/><path d="M9 9a3 3 0 1 1 4 2.8V14M12 17h.01"/></symbol>' +
      '<symbol id="i-book" viewBox="0 0 24 24"><path d="M3 4h7a4 4 0 0 1 4 4v12a4 4 0 0 0-4-4H3zM21 4h-7a4 4 0 0 0-4 4v12a4 4 0 0 1 4-4h7z"/></symbol>' +
    '</svg>';

  var HEADER = SPRITE +
    '<header class="site-header">' +
      '<div class="header-inner container">' +
        '<a class="brand" href="index.html" aria-label="SISLOG — Página inicial">' +
          '<img class="brand-logo" src="assets/logo.svg" alt="Sislog 3.0" width="125" height="40">' +
        '</a>' +
        '<nav class="desktop-nav" aria-label="Navegação principal">' + desktopNav() + '</nav>' +
        '<a class="portal-button" href="#" data-portal>Acessar o portal</a>' +
        '<details class="mobile-nav">' +
          '<summary aria-label="Abrir menu">☰</summary>' +
          '<nav aria-label="Navegação móvel">' + mobileNav() + '</nav>' +
        '</details>' +
      '</div>' +
    '</header>';

  var FOOTER =
    '<footer class="site-footer dot-pattern" id="rodape">' +
      '<div class="container">' +
        '<div class="footer-top">' +
          '<a class="brand footer-brand" href="index.html">' +
            '<img class="brand-logo" src="assets/logo-light.svg" alt="Sislog" width="107" height="40">' +
          '</a>' +
          '<div class="socials" aria-label="Redes sociais">' +
            '<a href="#" aria-label="X (Twitter)"><i class="fa-brands fa-x-twitter"></i></a>' +
            '<a href="#" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>' +
            '<a href="#" aria-label="GitHub"><i class="fa-brands fa-github"></i></a>' +
            '<a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>' +
            '<a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-links">' +
          '<div><h3>Contratações</h3><a href="contratacoes.html">Licitações</a><a href="contratacoes.html">Contratação direta</a><a href="contratacoes.html">Procedimentos auxiliares</a><a href="contratacoes.html">Registro de preços</a></div>' +
          '<div><h3>Fornecedores</h3><a href="fornecedores.html">Orientações gerais</a><a href="fornecedores.html">Documentos para homologação</a><a href="fornecedores.html">Modelos de documentos para homologação</a><a href="fornecedores.html">Cadastro</a><a href="fornecedores.html">Penalidades</a><a href="fornecedores.html">Certificado de registro cadastral - CRC</a><a href="fornecedores.html">Sistema Sislog</a></div>' +
          '<div><h3>Contratos</h3><a href="contratos.html">Contratos vigentes</a><a href="contratos.html">Contratos vencidos</a><h3 class="spaced">Emendas Parlamentares</h3><a href="emendasgo.html">Orientações</a><a href="emendasgo.html">Cadastro</a><a href="emendasgo.html">Relatório</a></div>' +
          '<div><h3>Notícias e avisos</h3><a href="index.html#noticias">Notícia</a><a href="index.html#noticias">Vídeos e manuais</a><h3 class="spaced">Fale Conosco</h3><a href="fale-conosco.html">Cadastro de fornecedor</a><a href="fale-conosco.html">Central de atendimento</a></div>' +
          '<div><h3>Registro de Preços</h3><a href="contratacoes.html">Registro de Preços</a><a href="contratacoes.html">Plano anual de contratações</a><a href="contratacoes.html">Legislação</a><a class="footer-portal" href="#" data-portal>Acessar o portal</a></div>' +
        '</div>' +
        '<div class="contact-strip">' +
          '<div><strong>Central de Atendimento</strong><span>+55 (62) 3201-8765</span></div>' +
          '<div><strong>Cadastro fornecedor</strong><span>+55 (62) 3201-8765</span></div>' +
          '<div><strong>E-mail</strong><span>sislog.goias@goias.gov.br</span></div>' +
        '</div>' +
        '<p class="copyright">Governo do Estado de Goiás © 2025. Todos os direitos reservados.</p>' +
      '</div>' +
    '</footer>';

  function inject(selector, html) {
    var el = document.querySelector(selector);
    if (el) el.outerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    inject('[data-include="header"]', HEADER);
    inject('[data-include="footer"]', FOOTER);

    document.addEventListener('click', function (e) {
      // "Acessar o portal" — ainda sem ação
      var portal = e.target.closest('[data-portal]');
      if (portal) {
        e.preventDefault();
        alert('Ainda sem ação');
        return;
      }
      // Links placeholder (href="#") — página em construção
      var link = e.target.closest('a[href]');
      if (link && link.getAttribute('href') === '#') {
        e.preventDefault();
        alert('Página em construção');
      }
    });
  });
})();
