/* Render compartilhado dos painéis (sócio e representante) — usa window.SislogDB */
(function () {
  var DB = window.SislogDB;

  // Escapa dados do usuário antes de inserir via innerHTML (evita XSS em produção)
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function item(k, v) { return '<div class="mnl-info-item"><div class="k">' + esc(k) + '</div><div class="v">' + (v ? esc(v) : '—') + '</div></div>'; }
  function initials(nome) { var p = (nome || 'R').trim().split(/\s+/); return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || 'R'; }
  function chipStatus(status) {
    if (status === 'aceito') return '<span class="mnl-chip success"><i class="fa-solid fa-check"></i> Aceito</span>';
    if (status === 'recusado') return '<span class="mnl-chip error"><i class="fa-solid fa-xmark"></i> Recusado</span>';
    return '<span class="mnl-chip warning"><i class="fa-regular fa-clock"></i> Pendente</span>';
  }

  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'; }
  function dataFim(iso, meses) {
    var m = parseInt(meses, 10);
    if (!iso || isNaN(m) || m <= 0) return '—';
    var d = new Date(iso); d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString('pt-BR');
  }
  function periodoTexto(meses) {
    var m = parseInt(meses, 10);
    if (isNaN(m)) return '—';
    if (m <= 0) return 'Indeterminado';
    return m + (m === 1 ? ' mês' : ' meses');
  }

  window.SislogPainel = {
    renderEmpresa: function (el) {
      var e = DB.garantirEmpresa();
      el.innerHTML =
        '<div class="mnl-card-header"><p class="mnl-overline">Empresa</p>' +
        '<h2 class="mnl-card-title" style="font-size:20px;">' + esc(e.nomeFantasia) + '</h2>' +
        '<p class="mnl-card-subtitle">' + esc(e.razaoSocial) + '</p></div>' +
        '<hr class="mnl-divider dashed">' +
        '<div class="mnl-info-grid" style="grid-template-columns:1fr;">' +
        item('CNPJ', e.cnpj) + item('Ramo de atividade', e.ramo) + item('Cidade', e.cidade) + item('Abertura', e.abertura) +
        '</div>';
    },
    renderRepresentantes: function (el, opts) {
      opts = opts || {};
      var reps = DB.listarRepresentantes();
      var count = document.getElementById('repCount');
      if (count) count.textContent = String(reps.length);
      var rows = reps.map(function (r) {
        var acoes = '';
        if (opts.editable) {
          var quem = esc(r.nome);
          if (r.status === 'pendente' && opts.onApprove) acoes += '<button type="button" class="mnl-iconbtn approve" data-approve="' + r.id + '" title="Aprovar" aria-label="Aprovar ' + quem + '"><i class="fa-solid fa-check" aria-hidden="true"></i></button>';
          if (opts.onRemove) acoes += '<button type="button" class="mnl-iconbtn" data-remove="' + r.id + '" title="Excluir representante" aria-label="Excluir ' + quem + '"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>';
        }
        var validade = (r.validadeMeses != null && r.validadeMeses !== '')
          ? ' · Período de validação: ' + r.validadeMeses + (r.validadeMeses == 1 ? ' mês' : ' meses')
          : '';
        return '<div class="mnl-list-row">' +
          '<span class="mnl-avatar" style="width:40px;height:40px;font-size:15px;">' + initials(r.nome) + '</span>' +
          '<div class="grow"><div class="name">' + esc(r.nome) + '</div><div class="sub">CPF ' + DB.maskCpf(r.cpf) + ' · ' + DB.maskEmail(r.email) + validade + '</div></div>' +
          chipStatus(r.status) + acoes +
          '</div>';
      }).join('');
      el.innerHTML = rows || '<div class="mnl-empty">Nenhum representante cadastrado ainda.</div>';
      if (opts.editable) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-approve]'), function (b) {
          b.addEventListener('click', function () { if (opts.onApprove) opts.onApprove(b.getAttribute('data-approve')); });
        });
        Array.prototype.forEach.call(el.querySelectorAll('[data-remove]'), function (b) {
          b.addEventListener('click', function () { if (opts.onRemove) opts.onRemove(b.getAttribute('data-remove')); });
        });
      }
    },

    // Visão em tabela (painel do sócio) — colunas completas + ações
    renderTabelaRepresentantes: function (el, opts) {
      opts = opts || {};
      var reps = DB.listarRepresentantes();
      var count = document.getElementById('repCount');
      if (count) count.textContent = String(reps.length);

      var rows = reps.map(function (r) {
        var aceito = r.status === 'aceito';
        var inicioIso = r.aceitoEm || (aceito ? r.convidadoEm : null);
        var acoes = '';
        if (r.status === 'pendente' && opts.onApprove) {
          acoes += '<button type="button" class="mnl-iconbtn approve" data-approve="' + r.id + '" title="Aprovar" aria-label="Aprovar ' + esc(r.nome) + '"><i class="fa-solid fa-check"></i></button>';
        }
        if (r.status === 'pendente' && opts.onReject) {
          acoes += '<button type="button" class="mnl-iconbtn" data-reject="' + r.id + '" title="Recusar" aria-label="Recusar ' + esc(r.nome) + '"><i class="fa-solid fa-xmark"></i></button>';
        }
        if (opts.onRemove) {
          acoes += '<button type="button" class="mnl-iconbtn" data-remove="' + r.id + '" title="Excluir representante" aria-label="Excluir ' + esc(r.nome) + '"><i class="fa-solid fa-trash-can"></i></button>';
        }
        return '<tr>' +
          '<td><div class="rep-name"><span class="mnl-avatar" style="width:34px;height:34px;font-size:13px;">' + initials(r.nome) + '</span>' +
            '<div><div class="nm">' + esc(r.nome) + '</div>' + chipStatus(r.status) + '</div></div></td>' +
          '<td>' + esc(DB.formatCpf(r.cpf)) + '</td>' +
          '<td>' + esc(r.email || '—') + '</td>' +
          '<td>' + (aceito ? esc(r.aprovadoPor || '—') : '<span class="mnl-muted">—</span>') + '</td>' +
          '<td>' + periodoTexto(r.validadeMeses) + '</td>' +
          '<td>' + (aceito ? fmtDate(inicioIso) : '—') + '</td>' +
          '<td>' + (aceito ? dataFim(inicioIso, r.validadeMeses) : '—') + '</td>' +
          '<td><div class="rep-actions">' + (acoes || '<span class="mnl-muted">—</span>') + '</div></td>' +
          '</tr>';
      }).join('');

      el.innerHTML =
        '<div class="rep-tablewrap"><table class="rep-table"><thead><tr>' +
        '<th>Nome do Representante</th><th>CPF</th><th>E-mail</th><th>Aprovado por</th>' +
        '<th>Período de Representação</th><th>Data início</th><th>Data fim</th><th style="text-align:right;">Ações</th>' +
        '</tr></thead><tbody>' +
        (rows || '<tr><td colspan="8" class="rep-empty">Nenhum representante cadastrado ainda.</td></tr>') +
        '</tbody></table></div>';

      Array.prototype.forEach.call(el.querySelectorAll('[data-approve]'), function (b) {
        b.addEventListener('click', function () { if (opts.onApprove) opts.onApprove(b.getAttribute('data-approve')); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-reject]'), function (b) {
        b.addEventListener('click', function () { if (opts.onReject) opts.onReject(b.getAttribute('data-reject')); });
      });
      Array.prototype.forEach.call(el.querySelectorAll('[data-remove]'), function (b) {
        b.addEventListener('click', function () { if (opts.onRemove) opts.onRemove(b.getAttribute('data-remove')); });
      });
    }
  };
})();
