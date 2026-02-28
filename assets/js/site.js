(() => {
  const el = (sel) => document.querySelector(sel);
  const term = el('#term');
  const form = el('#termForm');
  const input = el('#termInput');
  const year = el('#year');
  const status = el('#statusLine');

  year.textContent = String(new Date().getFullYear());

  const print = (html) => {
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = html;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
  };

  const banner = () => {
    print('<span class="dim">[boot]</span> loading modules: ui, crypto, tooling');
    print('<span class="dim">[ok]</span> integrity check: <span class="ok">passed</span>');
    print('<span class="dim">[hint]</span> type <span class="ok">help</span> to list commands');
  };

  // Fake CMD
  const cmds = {
    help: () => {
      print('commands: <span class="ok">help</span>, <span class="ok">whoami</span>, <span class="ok">projects</span>, <span class="ok">contact</span>, <span class="ok">clear</span>');
      print('tip: use the navbar to jump sections.');
    },
    whoami: () => {
      print('<span class="ok">Erik Stiefeling</span> — cybersecurity student; malware analysis, reversing, secure software.');
    },
    projects: () => {
      print('jumping to <span class="ok">#projects</span> …');
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    contact: () => {
      print('jumping to <span class="ok">#contact</span> …');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    clear: () => {
      term.innerHTML = '';
      banner();
    }
  };

  const run = (raw) => {
    const cmd = (raw || '').trim();
    if (!cmd) return;

    print(`<span class="dim">$</span> ${cmd}`);

    const key = cmd.toLowerCase();
    if (cmds[key]) cmds[key]();
    else print(`<span class="bad">unknown command</span>: ${cmd} (try <span class="ok">help</span>)`);
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
    input.focus();
  });

  document.querySelectorAll('[data-cmd]').forEach((b) => {
    b.addEventListener('click', () => {
      run(b.getAttribute('data-cmd'));
      input.focus();
    });
  });

  // Fun Status Lines
  const statusLines = [
    'SOC telemetry: nominal',
    'IDS: green · no alerts',
    'Sandbox: running',
    'Build pipeline: passing',
    'Threat model: in progress'
  ];
  let i = 0;
  const tick = () => {
    if (!status) return;
    status.textContent = statusLines[i % statusLines.length];
    i += 1;
  };
  tick();
  setInterval(tick, 3500);

  banner();
  input?.focus();
})();
