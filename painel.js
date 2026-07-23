/* Render compartilhado dos painéis (sócio e representante) — usa window.SislogDB */
(function () {
  var DB = window.SislogDB;

  function item(k, v) { return '<div class="mnl-info-item"><div class="k">' + k + '</div><div class="v">' + (v || '—') + '</div></div>'; }
  function initials(nome) { var p = (nome || 'R').trim().split(/\s+/); return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || 'R'; }
  function chipStatus(status) {
    return status === 'aceito'
      ? '<span class="mnl-chip success"><i class="fa-solid fa-check"></i> Aceito</span>'
      : '<span class="mnl-chip warning"><i class="fa-regular fa-clock"></i> Pendente</span>';
  }

  window.SislogPainel = {
    renderEmpresa: function (el) {
      var e = DB.garantirEmpresa();
      el.innerHTML =
        '<div class="mnl-card-header"><p class="mnl-overline">Empresa</p>' +
        '<h2 class="mnl-card-title" style="font-size:20px;">' + e.nomeFantasia + '</h2>' +
        '<p class="mnl-card-subtitle">' + e.razaoSocial + '</p></div>' +
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
          if (r.status === 'pendente' && opts.onApprove) acoes += '<button type="button" class="mnl-iconbtn approve" data-approve="' + r.id + '" title="Aprovar"><i class="fa-solid fa-check"></i></button>';
          if (opts.onRemove) acoes += '<button type="button" class="mnl-iconbtn" data-remove="' + r.id + '" title="Excluir representante"><i class="fa-solid fa-trash-can"></i></button>';
        }
        return '<div class="mnl-list-row">' +
          '<span class="mnl-avatar" style="width:40px;height:40px;font-size:15px;">' + initials(r.nome) + '</span>' +
          '<div class="grow"><div class="name">' + r.nome + '</div><div class="sub">CPF ' + DB.maskCpf(r.cpf) + ' · ' + DB.maskEmail(r.email) + '</div></div>' +
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
    }
  };
})();
