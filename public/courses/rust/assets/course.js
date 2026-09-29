(() => {
  'use strict';
  const key = 'rust-reading-course-v1';
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(key) || '{}'); if (!progress || typeof progress !== 'object') progress = {}; } catch (_) {}
  const status = document.querySelector('#progress-status');
  const cards = [...document.querySelectorAll('[data-lesson-card]')];
  cards.forEach(card => card.dataset.read = String(!!progress[card.dataset.lessonCard]));
  if (status) status.textContent = `已读 ${cards.filter(c => progress[c.dataset.lessonCard]).length} / ${cards.length} 节 · 仅保存在当前浏览器`;
  const mark = document.querySelector('[data-mark-read]');
  if (mark) {
    const id = mark.dataset.markRead;
    const refresh = () => { mark.textContent = progress[id] ? '已读 · 点击撤销' : '标记本节已读'; mark.setAttribute('aria-pressed', String(!!progress[id])); };
    refresh();
    mark.addEventListener('click', () => { progress[id] = !progress[id]; try { localStorage.setItem(key, JSON.stringify(progress)); } catch (_) { document.querySelector('#save-status').textContent = '浏览器未允许保存，本次标记仅在当前页面有效。'; } refresh(); });
  }
  const search = document.querySelector('#course-search');
  if (search) search.addEventListener('input', () => {
    const query = search.value.toLocaleLowerCase().trim();
    cards.forEach(card => card.hidden = !card.dataset.search.toLocaleLowerCase().includes(query));
    document.querySelectorAll('[data-stage]').forEach(section => section.hidden = [...section.querySelectorAll('[data-lesson-card]')].every(c => c.hidden));
    document.querySelector('#no-results').hidden = cards.some(c => !c.hidden);
  });
  document.querySelectorAll('form.quiz').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const feedback = form.querySelector('.feedback');
    const selected = form.querySelector('input:checked');
    if (!selected) { feedback.textContent = '先选择一个答案，再核对你的判断。'; feedback.dataset.state = 'wrong'; return; }
    const right = selected.value === form.dataset.correct;
    feedback.dataset.state = right ? 'right' : 'wrong';
    feedback.textContent = (right ? '判断正确。' : '再想一步。') + form.dataset.explanation;
  }));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent); button.textContent = '已复制'; }
    catch (_) { button.textContent = '请选中代码手动复制'; }
  }));
  const borrowSteps = [...document.querySelectorAll('[data-borrow-step]')];
  const borrowStates = [
    {line:'let view = &name;', value:'"Rust"', relation:'共享借用', role:'共享引用', name:'view', permission:'读取', note:'view 借用 name 中的文本，所有权仍属于 name。'},
    {line:'println!("{view}");', value:'"Rust"', relation:'最后一次使用', role:'共享引用', name:'view', permission:'输出 Rust', note:'这里是 view 的最后一次使用。后续不再使用这个共享引用，借用就不必持续到作用域末尾。'},
    {line:'append_mark(&mut name);', value:'"Rust!"', relation:'独占借用', role:'函数参数', name:'text', permission:'修改', note:'在 append_mark 调用期间，text 独占借用原文本并添加 !。调用结束后，name 仍拥有修改后的文本。'}
  ];
  borrowSteps.forEach(button => button.addEventListener('click', () => {
    const state = borrowStates[Number(button.dataset.borrowStep)];
    borrowSteps.forEach(step => step.setAttribute('aria-pressed', String(step === button)));
    for (const field of ['line', 'value', 'relation', 'role', 'name', 'permission', 'note']) {
      document.getElementById(`borrow-${field}`).textContent = state[field];
    }
  }));
  let printDetails = [];
  window.addEventListener('beforeprint', () => { printDetails = [...document.querySelectorAll('details:not([open])')]; printDetails.forEach(d => d.open = true); });
  window.addEventListener('afterprint', () => printDetails.forEach(d => d.open = false));
})();
